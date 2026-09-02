"""Tarefas periódicas em segundo plano."""
from __future__ import annotations

import asyncio
import logging
from abc import ABC, abstractmethod
from typing import Optional, Sequence

from .channels.manager import IChannelManager
from .core.models import ChannelType, MessageAuthor, NotificationLevel
from .domain.repositories import PatientRepository
from .domain.services.interfaces import (
    IAppointmentService,
    IConversationService,
    INotificationService,
    ISettingsService,
)
from .rag.interfaces import IKnowledgeService

logger = logging.getLogger(__name__)


class IBackgroundJob(ABC):
    """Tarefa executada periodicamente pelo escalonador."""

    @property
    @abstractmethod
    def interval_seconds(self) -> int: ...

    @property
    def job_name(self) -> str:
        return type(self).__name__

    @abstractmethod
    async def run_once(self) -> None: ...


class IScheduler(ABC):
    """Executor de tarefas periódicas."""

    @abstractmethod
    def register(self, job: IBackgroundJob) -> "IScheduler": ...

    @abstractmethod
    async def start(self) -> None: ...

    @abstractmethod
    async def stop(self) -> None: ...

    @property
    @abstractmethod
    def jobs(self) -> Sequence[IBackgroundJob]: ...


class AppointmentReminderJob(IBackgroundJob):
    """Envia lembretes das consultas que ocorrem na janela configurada."""

    def __init__(
        self,
        appointments: IAppointmentService,
        patients: PatientRepository,
        channels: IChannelManager,
        notifications: INotificationService,
        interval_seconds: int = 900,
        window_hours: int = 24,
    ) -> None:
        self._appointments = appointments
        self._patients = patients
        self._channels = channels
        self._notifications = notifications
        self._interval = interval_seconds
        self._window = window_hours

    @property
    def interval_seconds(self) -> int:
        return self._interval

    async def run_once(self) -> None:
        for appointment in await self._appointments.due_reminders(self._window):
            patient = await self._patients.get(appointment.patient_id)
            text = (
                f"Olá, {appointment.patient_name}! 🦷 Lembrete da sua consulta na SorriDente em "
                f"{appointment.start_dt.strftime('%d/%m às %H:%M')} com {appointment.dentist_name}.\n"
                "Responda CONFIRMAR para confirmar ou peça para remarcar."
            )
            delivered = False
            if patient is not None and patient.telegram_id:
                delivered = await self._channels.send(
                    ChannelType.TELEGRAM.value, patient.telegram_id, text
                )
            if patient is not None and not delivered and patient.whatsapp_id:
                delivered = await self._channels.send(
                    ChannelType.WHATSAPP.value, patient.whatsapp_id, text
                )
            await self._appointments.mark_reminder_sent(appointment.id)
            await self._notifications.notify(
                "Lembrete de consulta" if delivered else "Lembrete não entregue",
                f"{appointment.patient_name} — {appointment.start_dt.strftime('%d/%m %H:%M')}",
                NotificationLevel.INFO.value if delivered else NotificationLevel.ALERTA.value,
                appointment_id=appointment.id,
            )


class ConversationTimeoutJob(IBackgroundJob):
    """Encerra atendimentos parados, avisando o paciente antes de fechar.

    O tempo de silêncio vem das configurações da clínica, então a recepção pode
    ajustá-lo pela interface sem reiniciar o sistema.
    """

    DESPEDIDA = (
        "Como não tive retorno, vou encerrar nosso atendimento por aqui. 🦷\n"
        "Se precisar de qualquer coisa — marcar, remarcar ou tirar dúvidas — é só me "
        "chamar de novo. A {clinic} agradece o contato!"
    )

    def __init__(
        self,
        conversations: IConversationService,
        channels: IChannelManager,
        settings: ISettingsService,
        interval_seconds: int = 120,
    ) -> None:
        self._conversations = conversations
        self._channels = channels
        self._settings = settings
        self._interval = interval_seconds

    @property
    def interval_seconds(self) -> int:
        return self._interval

    async def run_once(self) -> None:
        settings = await self._settings.get()
        minutes = max(1, settings.inactivity_minutes)
        for conversation in await self._conversations.idle_conversations(minutes):
            if conversation.handoff:
                continue  # a equipe está conduzindo: não encerra por conta própria
            texto = self.DESPEDIDA.format(clinic=settings.clinic_name)
            await self._conversations.append(
                conversation.id, MessageAuthor.ASSISTANT.value, texto
            )
            await self._channels.send(conversation.channel, conversation.external_id, texto)
            await self._conversations.close(
                conversation.id, f"Encerrado automaticamente após {minutes} min sem interação."
            )
            logger.info("Conversa %s encerrada por inatividade.", conversation.id)


class KnowledgeReindexJob(IBackgroundJob):
    """Mantém o índice de RAG alinhado com o cadastro da clínica."""

    def __init__(self, knowledge: IKnowledgeService, interval_seconds: int = 1800) -> None:
        self._knowledge = knowledge
        self._interval = interval_seconds

    @property
    def interval_seconds(self) -> int:
        return self._interval

    async def run_once(self) -> None:
        await self._knowledge.reindex()


class BackgroundScheduler(IScheduler):
    """Executa cada `IBackgroundJob` em seu próprio laço assíncrono."""

    def __init__(self) -> None:
        self._jobs: list[IBackgroundJob] = []
        self._tasks: list[asyncio.Task[None]] = []

    @property
    def jobs(self) -> Sequence[IBackgroundJob]:
        return tuple(self._jobs)

    def register(self, job: IBackgroundJob) -> "BackgroundScheduler":
        self._jobs.append(job)
        return self

    async def start(self) -> None:
        for job in self._jobs:
            self._tasks.append(asyncio.create_task(self._loop(job), name=f"job-{job.job_name}"))

    async def stop(self) -> None:
        for task in self._tasks:
            task.cancel()
        for task in self._tasks:
            try:
                await task
            except asyncio.CancelledError:
                pass
        self._tasks.clear()

    @staticmethod
    async def _loop(job: IBackgroundJob) -> None:
        while True:
            await asyncio.sleep(job.interval_seconds)
            try:
                await job.run_once()
            except asyncio.CancelledError:
                raise
            except Exception as exc:  # noqa: BLE001 - um job não derruba os demais
                logger.warning("Job %s falhou: %s", job.job_name, exc)
