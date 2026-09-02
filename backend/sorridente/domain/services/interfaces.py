"""Contratos abstratos da camada de serviços (casos de uso).

Nenhuma camada superior (API, canais, agente) depende de implementações
concretas: todas programam contra estas abstrações.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import date, datetime
from typing import Any, Optional

from ...core.models import (
    Appointment,
    ChatMessage,
    ClinicSettings,
    Conversation,
    Dentist,
    FAQ,
    Notification,
    Patient,
    Procedure,
    User,
)


class IService(ABC):
    """Marcador comum de serviço de aplicação."""

    @property
    def name(self) -> str:
        return type(self).__name__


class IPatientService(IService):
    @abstractmethod
    async def create(self, **data: Any) -> Patient: ...

    @abstractmethod
    async def update(self, patient_id: str, **data: Any) -> Patient: ...

    @abstractmethod
    async def delete(self, patient_id: str) -> bool: ...

    @abstractmethod
    async def get(self, patient_id: str) -> Patient: ...

    @abstractmethod
    async def list_all(self, search: str = "") -> list[Patient]: ...

    @abstractmethod
    async def get_or_create_by_channel(
        self, channel: str, external_id: str, name: str
    ) -> Patient: ...


class IDentistService(IService):
    @abstractmethod
    async def create(self, **data: Any) -> Dentist: ...

    @abstractmethod
    async def update(self, dentist_id: str, **data: Any) -> Dentist: ...

    @abstractmethod
    async def delete(self, dentist_id: str) -> bool: ...

    @abstractmethod
    async def get(self, dentist_id: str) -> Dentist: ...

    @abstractmethod
    async def list_all(self, only_active: bool = False) -> list[Dentist]: ...


class IProcedureService(IService):
    @abstractmethod
    async def create(self, **data: Any) -> Procedure: ...

    @abstractmethod
    async def update(self, procedure_id: str, **data: Any) -> Procedure: ...

    @abstractmethod
    async def delete(self, procedure_id: str) -> bool: ...

    @abstractmethod
    async def list_all(self, only_active: bool = False) -> list[Procedure]: ...


class ISchedulingService(IService):
    """Regras de disponibilidade da agenda."""

    @abstractmethod
    async def available_slots(
        self, day: date, dentist_id: str = "", duration_minutes: int = 0
    ) -> list[dict[str, Any]]: ...

    @abstractmethod
    async def is_free(
        self, dentist_id: str, start: datetime, end: datetime, ignore_id: str = ""
    ) -> bool: ...

    @abstractmethod
    async def next_emergency_slot(self, reference: Optional[datetime] = None) -> dict[str, Any]:
        """Melhor horário para um encaixe de urgência, mesmo com a grade cheia."""


class IAppointmentService(IService):
    @abstractmethod
    async def schedule(
        self,
        patient_id: str,
        start: datetime,
        dentist_id: str = "",
        procedure_id: str = "",
        notes: str = "",
        origin: str = "web",
        allow_overbook: bool = False,
        priority: str = "normal",
    ) -> Appointment:
        """Agenda uma consulta. Com `allow_overbook`, cria um encaixe sobre a grade."""

    @abstractmethod
    async def schedule_emergency(
        self,
        patient_id: str,
        reason: str,
        origin: str = "web",
        start: Optional[datetime] = None,
    ) -> Appointment:
        """Encaixe de urgência no próximo horário viável do dia."""

    @abstractmethod
    async def reschedule(self, appointment_id: str, start: datetime) -> Appointment: ...

    @abstractmethod
    async def cancel(self, appointment_id: str, reason: str = "") -> Appointment: ...

    @abstractmethod
    async def set_status(self, appointment_id: str, status: str) -> Appointment: ...

    @abstractmethod
    async def get(self, appointment_id: str) -> Appointment: ...

    @abstractmethod
    async def list_all(self, **filters: Any) -> list[Appointment]: ...

    @abstractmethod
    async def agenda(self, start: date, end: date) -> list[Appointment]: ...

    @abstractmethod
    async def due_reminders(self, window_hours: int = 24) -> list[Appointment]:
        """Consultas que entram na janela de lembrete e ainda não foram avisadas."""

    @abstractmethod
    async def mark_reminder_sent(self, appointment_id: str) -> Appointment: ...


class IConversationService(IService):
    @abstractmethod
    async def get_or_create(
        self, channel: str, external_id: str, display_name: str = ""
    ) -> Conversation: ...

    @abstractmethod
    async def append(
        self, conversation_id: str, author: str, content: str, **extra: Any
    ) -> ChatMessage: ...

    @abstractmethod
    async def history(self, conversation_id: str, limit: int = 50) -> list[ChatMessage]: ...

    @abstractmethod
    async def list_all(self, limit: int = 100) -> list[Conversation]: ...

    @abstractmethod
    async def mark_read(self, conversation_id: str) -> Conversation: ...

    @abstractmethod
    async def set_handoff(self, conversation_id: str, handoff: bool) -> Conversation: ...

    @abstractmethod
    async def get(self, conversation_id: str) -> Conversation: ...

    @abstractmethod
    async def link_patient(self, conversation_id: str, patient_id: str) -> Conversation: ...

    @abstractmethod
    async def mark_handoff_notice(self, conversation_id: str) -> Conversation:
        """Registra que o aviso de espera já foi enviado ao paciente."""

    @abstractmethod
    async def close(self, conversation_id: str, reason: str = "") -> Conversation: ...

    @abstractmethod
    async def reopen(self, conversation_id: str) -> Conversation: ...

    @abstractmethod
    async def idle_conversations(self, minutes: int) -> list[Conversation]:
        """Conversas abertas sem interação há mais de `minutes` minutos."""


class INotificationService(IService):
    @abstractmethod
    async def notify(
        self, title: str, message: str, level: str = "info", **meta: Any
    ) -> Notification: ...

    @abstractmethod
    async def list_all(self, only_unread: bool = False, limit: int = 50) -> list[Notification]: ...

    @abstractmethod
    async def mark_read(self, notification_id: str) -> Notification: ...

    @abstractmethod
    async def mark_all_read(self) -> int: ...


class IFAQService(IService):
    @abstractmethod
    async def create(self, question: str, answer: str, tags: Optional[list[str]] = None) -> FAQ: ...

    @abstractmethod
    async def update(self, faq_id: str, **data: Any) -> FAQ: ...

    @abstractmethod
    async def delete(self, faq_id: str) -> bool: ...

    @abstractmethod
    async def list_all(self) -> list[FAQ]: ...

    @abstractmethod
    async def search(self, term: str, limit: int = 5) -> list[FAQ]: ...


class ISettingsService(IService):
    @abstractmethod
    async def get(self) -> ClinicSettings: ...

    @abstractmethod
    async def update(self, **data: Any) -> ClinicSettings: ...


class IAuthService(IService):
    @abstractmethod
    async def authenticate(self, username: str, password: str) -> tuple[User, str]: ...

    @abstractmethod
    async def register(self, username: str, password: str, role: str, display_name: str = "") -> User: ...

    @abstractmethod
    async def resolve_token(self, token: str) -> User: ...

    @abstractmethod
    async def list_users(self) -> list[User]: ...


class IAnalyticsService(IService):
    @abstractmethod
    async def dashboard(self) -> dict[str, Any]: ...
