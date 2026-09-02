"""Implementações dos serviços de aplicação (casos de uso)."""
from __future__ import annotations

import hashlib
import hmac
import secrets
from datetime import date, datetime, time, timedelta
from typing import Any, Optional

from ...core.exceptions import (
    AuthenticationError,
    ConflictError,
    NotFoundError,
    ValidationError,
)
from ...core.interfaces import IEventBus
from ...core.models import (
    Appointment,
    AppointmentStatus,
    Priority,
    SlotType,
    ChatMessage,
    ClinicSettings,
    Conversation,
    Dentist,
    FAQ,
    MessageAuthor,
    Notification,
    NotificationLevel,
    Patient,
    Procedure,
    Role,
    User,
    now_iso,
)
from ..repositories import (
    AppointmentRepository,
    ConversationRepository,
    DentistRepository,
    FAQRepository,
    MessageRepository,
    NotificationRepository,
    PatientRepository,
    ProcedureRepository,
    SettingsRepository,
    UserRepository,
)
from .interfaces import (
    IAnalyticsService,
    IAppointmentService,
    IAuthService,
    IConversationService,
    IDentistService,
    IFAQService,
    INotificationService,
    IPatientService,
    IProcedureService,
    ISchedulingService,
    ISettingsService,
)


def _apply(entity: Any, data: dict[str, Any]) -> None:
    """Aplica somente campos existentes na entidade."""
    for key, value in data.items():
        if value is not None and hasattr(entity, key) and key not in ("id", "created_at"):
            setattr(entity, key, value)


# Pacientes
class PatientService(IPatientService):
    def __init__(self, patients: PatientRepository, notifications: "NotificationService") -> None:
        self._patients = patients
        self._notifications = notifications

    async def create(self, **data: Any) -> Patient:
        name: str = (data.get("name") or "").strip()
        if not name:
            raise ValidationError("O nome do paciente é obrigatório.")
        patient = Patient()
        _apply(patient, data)
        patient.name = name
        await self._patients.add(patient)
        await self._notifications.notify(
            "Novo paciente cadastrado", f"{patient.name} foi adicionado à base.", NotificationLevel.SUCESSO.value
        )
        return patient

    async def update(self, patient_id: str, **data: Any) -> Patient:
        patient = await self.get(patient_id)
        _apply(patient, data)
        return await self._patients.update(patient)

    async def delete(self, patient_id: str) -> bool:
        await self.get(patient_id)
        return await self._patients.remove(patient_id)

    async def get(self, patient_id: str) -> Patient:
        patient = await self._patients.get(patient_id)
        if patient is None:
            raise NotFoundError(f"Paciente {patient_id} não encontrado.")
        return patient

    async def list_all(self, search: str = "") -> list[Patient]:
        return await self._patients.search(search)

    async def get_or_create_by_channel(self, channel: str, external_id: str, name: str) -> Patient:
        field = {"telegram": "telegram_id", "whatsapp": "whatsapp_id"}.get(channel, "")
        if field:
            existing = await self._patients.find_one({field: str(external_id)})
            if existing is not None:
                return existing
        patient = Patient(name=name or "Contato sem nome")
        if field:
            setattr(patient, field, str(external_id))
        await self._patients.add(patient)
        await self._notifications.notify(
            "Novo contato",
            f"{patient.name} iniciou conversa via {channel}.",
            NotificationLevel.INFO.value,
        )
        return patient


# Dentistas / procedimentos
class DentistService(IDentistService):
    def __init__(self, dentists: DentistRepository) -> None:
        self._dentists = dentists

    async def create(self, **data: Any) -> Dentist:
        if not (data.get("name") or "").strip():
            raise ValidationError("O nome do profissional é obrigatório.")
        dentist = Dentist()
        _apply(dentist, data)
        return await self._dentists.add(dentist)

    async def update(self, dentist_id: str, **data: Any) -> Dentist:
        dentist = await self.get(dentist_id)
        _apply(dentist, data)
        return await self._dentists.update(dentist)

    async def delete(self, dentist_id: str) -> bool:
        await self.get(dentist_id)
        return await self._dentists.remove(dentist_id)

    async def get(self, dentist_id: str) -> Dentist:
        dentist = await self._dentists.get(dentist_id)
        if dentist is None:
            raise NotFoundError(f"Profissional {dentist_id} não encontrado.")
        return dentist

    async def list_all(self, only_active: bool = False) -> list[Dentist]:
        return await (self._dentists.active() if only_active else self._dentists.list())


class ProcedureService(IProcedureService):
    def __init__(self, procedures: ProcedureRepository) -> None:
        self._procedures = procedures

    async def create(self, **data: Any) -> Procedure:
        if not (data.get("name") or "").strip():
            raise ValidationError("O nome do procedimento é obrigatório.")
        procedure = Procedure()
        _apply(procedure, data)
        return await self._procedures.add(procedure)

    async def update(self, procedure_id: str, **data: Any) -> Procedure:
        procedure = await self._procedures.get(procedure_id)
        if procedure is None:
            raise NotFoundError(f"Procedimento {procedure_id} não encontrado.")
        _apply(procedure, data)
        return await self._procedures.update(procedure)

    async def delete(self, procedure_id: str) -> bool:
        return await self._procedures.remove(procedure_id)

    async def list_all(self, only_active: bool = False) -> list[Procedure]:
        return await (self._procedures.active() if only_active else self._procedures.list())


# Agenda
class SchedulingService(ISchedulingService):
    """Calcula disponibilidade a partir das configurações e da agenda ocupada."""

    def __init__(
        self,
        appointments: AppointmentRepository,
        dentists: DentistRepository,
        settings: SettingsRepository,
    ) -> None:
        self._appointments = appointments
        self._dentists = dentists
        self._settings = settings

    @staticmethod
    def _parse_time(value: str, fallback: time) -> time:
        try:
            hour, minute = value.split(":")
            return time(int(hour), int(minute))
        except (ValueError, AttributeError):
            return fallback

    async def _windows(self, dentist: Optional[Dentist], day: date, settings: ClinicSettings) -> list[tuple[time, time]]:
        weekday = str(day.weekday())
        if dentist is not None and dentist.availability.get(weekday):
            return [
                (self._parse_time(a, time(8, 0)), self._parse_time(b, time(18, 0)))
                for a, b in dentist.availability[weekday]
            ]
        if day.weekday() not in settings.working_days:
            return []
        opening = self._parse_time(settings.opening_hour, time(8, 0))
        closing = self._parse_time(settings.closing_hour, time(18, 0))
        lunch_start = self._parse_time(settings.lunch_start, time(12, 0))
        lunch_end = self._parse_time(settings.lunch_end, time(13, 0))
        if lunch_start <= opening or lunch_end >= closing:
            return [(opening, closing)]
        return [(opening, lunch_start), (lunch_end, closing)]

    async def is_free(
        self, dentist_id: str, start: datetime, end: datetime, ignore_id: str = ""
    ) -> bool:
        day_start = datetime.combine(start.date(), time.min)
        booked = await self._appointments.in_range(day_start, day_start + timedelta(days=1))
        for appointment in booked:
            if appointment.id == ignore_id:
                continue
            if appointment.status in (AppointmentStatus.CANCELADO.value,):
                continue
            if dentist_id and appointment.dentist_id and appointment.dentist_id != dentist_id:
                continue
            if start < appointment.end_dt and appointment.start_dt < end:
                return False
        return True

    async def next_emergency_slot(self, reference: Optional[datetime] = None) -> dict[str, Any]:
        """Melhor horário para um encaixe de urgência.

        Procura primeiro um horário realmente livre hoje; se a grade estiver
        cheia, devolve um horário de encaixe (sobreposto) no fim do expediente,
        sinalizando `encaixe=True` para a equipe saber que é overbooking.
        """
        now = reference or datetime.now()
        settings = await self._settings.current()
        duration = settings.emergency_slot_minutes
        dentists = await self._dentists.active()
        dentist = dentists[0] if dentists else None

        for offset in range(0, 3):  # hoje e os dois dias úteis seguintes
            day = now.date() + timedelta(days=offset)
            livres = [
                slot
                for slot in await self.available_slots(day, "", duration)
                if datetime.fromisoformat(slot["start"]) > now + timedelta(minutes=15)
            ]
            if livres:
                return {**livres[0], "encaixe": False, "duracao_minutos": duration}
            if offset == 0 and day.weekday() in settings.working_days:
                # Grade cheia hoje: encaixa ao fim do expediente.
                closing = self._parse_time(settings.closing_hour, time(18, 0))
                start = max(
                    datetime.combine(day, closing) - timedelta(minutes=duration),
                    now + timedelta(minutes=30),
                )
                return {
                    "start": start.isoformat(timespec="minutes"),
                    "end": (start + timedelta(minutes=duration)).isoformat(timespec="minutes"),
                    "dentist_id": dentist.id if dentist else "",
                    "dentist_name": dentist.name if dentist else "Equipe SorriDente",
                    "encaixe": True,
                    "duracao_minutos": duration,
                }

        raise ConflictError("Não há horário viável para encaixe de urgência nos próximos dias.")

    async def available_slots(
        self, day: date, dentist_id: str = "", duration_minutes: int = 0
    ) -> list[dict[str, Any]]:
        settings = await self._settings.current()
        duration = duration_minutes or settings.slot_minutes
        dentists: list[Optional[Dentist]]
        if dentist_id:
            dentists = [await self._dentists.get(dentist_id)]
            if dentists[0] is None:
                raise NotFoundError(f"Profissional {dentist_id} não encontrado.")
        else:
            actives = await self._dentists.active()
            dentists = list(actives) or [None]

        now = datetime.now()
        slots: list[dict[str, Any]] = []
        for dentist in dentists:
            for window_start, window_end in await self._windows(dentist, day, settings):
                cursor = datetime.combine(day, window_start)
                limit = datetime.combine(day, window_end)
                while cursor + timedelta(minutes=duration) <= limit:
                    end = cursor + timedelta(minutes=duration)
                    if cursor > now and await self.is_free(dentist.id if dentist else "", cursor, end):
                        slots.append(
                            {
                                "start": cursor.isoformat(timespec="minutes"),
                                "end": end.isoformat(timespec="minutes"),
                                "dentist_id": dentist.id if dentist else "",
                                "dentist_name": dentist.name if dentist else "Equipe SorriDente",
                            }
                        )
                    cursor += timedelta(minutes=settings.slot_minutes)
        slots.sort(key=lambda s: (s["start"], s["dentist_name"]))
        return slots


class AppointmentService(IAppointmentService):
    def __init__(
        self,
        appointments: AppointmentRepository,
        patients: PatientRepository,
        dentists: DentistRepository,
        procedures: ProcedureRepository,
        scheduling: SchedulingService,
        notifications: "NotificationService",
        settings: SettingsRepository,
    ) -> None:
        self._appointments = appointments
        self._patients = patients
        self._dentists = dentists
        self._procedures = procedures
        self._scheduling = scheduling
        self._notifications = notifications
        self._settings = settings

    async def _resolve_duration(self, procedure_id: str) -> tuple[int, str, str]:
        if procedure_id:
            procedure = await self._procedures.get(procedure_id)
            if procedure is None:
                raise NotFoundError(f"Procedimento {procedure_id} não encontrado.")
            return procedure.duration_minutes, procedure.id, procedure.name
        settings = await self._settings.current()
        return settings.slot_minutes, "", "Consulta"

    async def schedule(
        self,
        patient_id: str,
        start: datetime,
        dentist_id: str = "",
        procedure_id: str = "",
        notes: str = "",
        origin: str = "web",
        allow_overbook: bool = False,
        priority: str = Priority.NORMAL.value,
    ) -> Appointment:
        patient = await self._patients.get(patient_id)
        if patient is None:
            raise NotFoundError(f"Paciente {patient_id} não encontrado.")
        if start < datetime.now():
            raise ValidationError("Não é possível agendar em uma data passada.")

        duration, proc_id, proc_name = await self._resolve_duration(procedure_id)
        end = start + timedelta(minutes=duration)

        dentist: Optional[Dentist] = None
        if dentist_id:
            dentist = await self._dentists.get(dentist_id)
            if dentist is None:
                raise NotFoundError(f"Profissional {dentist_id} não encontrado.")
        else:
            for candidate in await self._dentists.active():
                if await self._scheduling.is_free(candidate.id, start, end):
                    dentist = candidate
                    break
            if dentist is None:
                actives = await self._dentists.active()
                dentist = actives[0] if actives else None

        livre = await self._scheduling.is_free(dentist.id if dentist else "", start, end)
        if not livre and not allow_overbook:
            raise ConflictError("Este horário já está ocupado. Escolha outro horário disponível.")

        slot_type = SlotType.REGULAR.value if livre else SlotType.ENCAIXE.value
        appointment = Appointment(
            patient_id=patient.id,
            patient_name=patient.name,
            dentist_id=dentist.id if dentist else "",
            dentist_name=dentist.name if dentist else "Equipe SorriDente",
            procedure_id=proc_id,
            procedure_name=proc_name,
            start=start.isoformat(timespec="minutes"),
            end=end.isoformat(timespec="minutes"),
            slot_type=slot_type,
            priority=priority,
            notes=notes,
            origin=origin,
        )
        await self._appointments.add(appointment)

        urgente = priority == Priority.URGENTE.value
        encaixe = slot_type == SlotType.ENCAIXE.value
        titulo = "Encaixe de urgência" if urgente else ("Encaixe na agenda" if encaixe else "Novo agendamento")
        await self._notifications.notify(
            titulo,
            f"{patient.name} — {appointment.start.replace('T', ' ')} com {appointment.dentist_name}."
            + (" Sobreposto à grade." if encaixe else ""),
            NotificationLevel.ERRO.value if urgente else NotificationLevel.SUCESSO.value,
            appointment_id=appointment.id,
            encaixe=encaixe,
            urgente=urgente,
        )
        return appointment

    async def schedule_emergency(
        self,
        patient_id: str,
        reason: str,
        origin: str = "web",
        start: Optional[datetime] = None,
    ) -> Appointment:
        """Encaixe de urgência: usa o próximo horário viável, mesmo com a grade cheia."""
        settings = await self._settings.current()
        if start is None:
            slot = await self._scheduling.next_emergency_slot()
            start = datetime.fromisoformat(slot["start"])
            dentist_id = slot["dentist_id"]
        else:
            dentist_id = ""

        do_dia = [
            a
            for a in await self._appointments.list({"priority": Priority.URGENTE.value})
            if a.start[:10] == start.date().isoformat()
            and a.status != AppointmentStatus.CANCELADO.value
        ]
        if len(do_dia) >= settings.max_emergency_per_day:
            raise ConflictError(
                "O limite de encaixes de urgência do dia foi atingido. "
                "A equipe precisa avaliar este caso manualmente."
            )

        procedure = await self._procedures.find_by_name("Urgência ortodôntica")
        return await self.schedule(
            patient_id=patient_id,
            start=start,
            dentist_id=dentist_id,
            procedure_id=procedure.id if procedure else "",
            notes=f"[URGÊNCIA] {reason}".strip(),
            origin=origin,
            allow_overbook=True,
            priority=Priority.URGENTE.value,
        )

    async def reschedule(self, appointment_id: str, start: datetime) -> Appointment:
        appointment = await self.get(appointment_id)
        duration = int((appointment.end_dt - appointment.start_dt).total_seconds() // 60)
        end = start + timedelta(minutes=duration)
        if not await self._scheduling.is_free(appointment.dentist_id, start, end, ignore_id=appointment.id):
            raise ConflictError("O novo horário já está ocupado.")
        appointment.start = start.isoformat(timespec="minutes")
        appointment.end = end.isoformat(timespec="minutes")
        appointment.status = AppointmentStatus.AGENDADO.value
        appointment.reminder_sent = False
        await self._appointments.update(appointment)
        await self._notifications.notify(
            "Agendamento remarcado",
            f"{appointment.patient_name} → {appointment.start.replace('T', ' ')}.",
            NotificationLevel.ALERTA.value,
            appointment_id=appointment.id,
        )
        return appointment

    async def cancel(self, appointment_id: str, reason: str = "") -> Appointment:
        appointment = await self.get(appointment_id)
        appointment.status = AppointmentStatus.CANCELADO.value
        if reason:
            appointment.notes = f"{appointment.notes}\n[cancelamento] {reason}".strip()
        await self._appointments.update(appointment)
        await self._notifications.notify(
            "Agendamento cancelado",
            f"{appointment.patient_name} — {appointment.start.replace('T', ' ')}. {reason}".strip(),
            NotificationLevel.ALERTA.value,
            appointment_id=appointment.id,
        )
        return appointment

    async def set_status(self, appointment_id: str, status: str) -> Appointment:
        valid = {s.value for s in AppointmentStatus}
        if status not in valid:
            raise ValidationError(f"Status inválido. Use um de: {', '.join(sorted(valid))}.")
        appointment = await self.get(appointment_id)
        appointment.status = status
        return await self._appointments.update(appointment)

    async def get(self, appointment_id: str) -> Appointment:
        appointment = await self._appointments.get(appointment_id)
        if appointment is None:
            raise NotFoundError(f"Agendamento {appointment_id} não encontrado.")
        return appointment

    async def list_all(self, **filters: Any) -> list[Appointment]:
        clean = {k: v for k, v in filters.items() if v not in (None, "")}
        items = await self._appointments.list(clean or None)
        return sorted(items, key=lambda a: a.start)

    async def agenda(self, start: date, end: date) -> list[Appointment]:
        return await self._appointments.in_range(
            datetime.combine(start, time.min), datetime.combine(end, time.max)
        )

    async def due_reminders(self, window_hours: int = 24) -> list[Appointment]:
        """Agendamentos que entram na janela de lembrete e ainda não foram avisados."""
        now = datetime.now()
        limit = now + timedelta(hours=window_hours)
        return [
            a
            for a in await self._appointments.upcoming(now)
            if not a.reminder_sent and a.start_dt <= limit
        ]

    async def mark_reminder_sent(self, appointment_id: str) -> Appointment:
        appointment = await self.get(appointment_id)
        appointment.reminder_sent = True
        return await self._appointments.update(appointment)


# Conversas, notificações, FAQ, configurações
class ConversationService(IConversationService):
    def __init__(
        self,
        conversations: ConversationRepository,
        messages: MessageRepository,
        event_bus: IEventBus,
    ) -> None:
        self._conversations = conversations
        self._messages = messages
        self._events = event_bus

    async def get_or_create(
        self, channel: str, external_id: str, display_name: str = ""
    ) -> Conversation:
        conversation = await self._conversations.find_by_external(channel, external_id)
        if conversation is not None:
            if display_name and conversation.display_name != display_name:
                conversation.display_name = display_name
                await self._conversations.update(conversation)
            return conversation
        conversation = Conversation(
            channel=channel,
            external_id=str(external_id),
            display_name=display_name or "Visitante",
        )
        await self._conversations.add(conversation)
        await self._events.publish("conversation.created", conversation.to_dict())
        return conversation

    async def get(self, conversation_id: str) -> Conversation:
        conversation = await self._conversations.get(conversation_id)
        if conversation is None:
            raise NotFoundError(f"Conversa {conversation_id} não encontrada.")
        return conversation

    async def append(
        self, conversation_id: str, author: str, content: str, **extra: Any
    ) -> ChatMessage:
        conversation = await self.get(conversation_id)
        message = ChatMessage(
            conversation_id=conversation_id,
            author=author,
            content=content,
            tool_name=extra.get("tool_name", ""),
            tool_payload=extra.get("tool_payload", {}),
        )
        await self._messages.add(message)
        conversation.last_message_at = now_iso()
        if author == MessageAuthor.USER.value:
            conversation.unread_for_staff += 1
            if not conversation.open:
                conversation.open = True
                conversation.closed_at = ""
                conversation.closed_reason = ""
        await self._conversations.update(conversation)
        await self._events.publish(
            "message.created", {"conversation": conversation.to_dict(), "message": message.to_dict()}
        )
        return message

    async def history(self, conversation_id: str, limit: int = 50) -> list[ChatMessage]:
        return await self._messages.by_conversation(conversation_id, limit)

    async def list_all(self, limit: int = 100) -> list[Conversation]:
        return await self._conversations.recent(limit)

    async def mark_read(self, conversation_id: str) -> Conversation:
        conversation = await self.get(conversation_id)
        conversation.unread_for_staff = 0
        return await self._conversations.update(conversation)

    async def set_handoff(self, conversation_id: str, handoff: bool) -> Conversation:
        conversation = await self.get(conversation_id)
        conversation.handoff = handoff
        if not handoff:
            conversation.handoff_notice_at = ""
        return await self._conversations.update(conversation)

    async def link_patient(self, conversation_id: str, patient_id: str) -> Conversation:
        conversation = await self.get(conversation_id)
        conversation.patient_id = patient_id
        return await self._conversations.update(conversation)

    async def mark_handoff_notice(self, conversation_id: str) -> Conversation:
        conversation = await self.get(conversation_id)
        conversation.handoff_notice_at = now_iso()
        return await self._conversations.update(conversation)

    async def close(self, conversation_id: str, reason: str = "") -> Conversation:
        conversation = await self.get(conversation_id)
        conversation.open = False
        conversation.handoff = False
        conversation.closed_at = now_iso()
        conversation.closed_reason = reason
        await self._conversations.update(conversation)
        await self._events.publish("conversation.closed", conversation.to_dict())
        return conversation

    async def reopen(self, conversation_id: str) -> Conversation:
        conversation = await self.get(conversation_id)
        if conversation.open:
            return conversation
        conversation.open = True
        conversation.closed_at = ""
        conversation.closed_reason = ""
        return await self._conversations.update(conversation)

    async def idle_conversations(self, minutes: int) -> list[Conversation]:
        limite = (datetime.now() - timedelta(minutes=minutes)).isoformat(timespec="seconds")
        return [
            c
            for c in await self._conversations.open_conversations()
            if c.last_message_at < limite
        ]


class NotificationService(INotificationService):
    def __init__(self, notifications: NotificationRepository, event_bus: IEventBus) -> None:
        self._notifications = notifications
        self._events = event_bus

    async def notify(
        self, title: str, message: str, level: str = NotificationLevel.INFO.value, **meta: Any
    ) -> Notification:
        notification = Notification(title=title, message=message, level=level, meta=meta)
        await self._notifications.add(notification)
        await self._events.publish("notification.created", notification.to_dict())
        return notification

    async def list_all(self, only_unread: bool = False, limit: int = 50) -> list[Notification]:
        items = await (self._notifications.unread() if only_unread else self._notifications.recent(limit))
        return sorted(items, key=lambda n: n.created_at, reverse=True)[:limit]

    async def mark_read(self, notification_id: str) -> Notification:
        notification = await self._notifications.get(notification_id)
        if notification is None:
            raise NotFoundError(f"Notificação {notification_id} não encontrada.")
        notification.read = True
        return await self._notifications.update(notification)

    async def mark_all_read(self) -> int:
        pending = await self._notifications.unread()
        for notification in pending:
            notification.read = True
            await self._notifications.update(notification)
        return len(pending)


class FAQService(IFAQService):
    def __init__(self, faqs: FAQRepository) -> None:
        self._faqs = faqs

    async def create(self, question: str, answer: str, tags: Optional[list[str]] = None) -> FAQ:
        if not question.strip() or not answer.strip():
            raise ValidationError("Pergunta e resposta são obrigatórias.")
        return await self._faqs.add(FAQ(question=question.strip(), answer=answer.strip(), tags=tags or []))

    async def update(self, faq_id: str, **data: Any) -> FAQ:
        faq = await self._faqs.get(faq_id)
        if faq is None:
            raise NotFoundError(f"FAQ {faq_id} não encontrada.")
        _apply(faq, data)
        return await self._faqs.update(faq)

    async def delete(self, faq_id: str) -> bool:
        return await self._faqs.remove(faq_id)

    async def list_all(self) -> list[FAQ]:
        return await self._faqs.list()

    async def search(self, term: str, limit: int = 5) -> list[FAQ]:
        results = await self._faqs.search(term, limit)
        return results or (await self._faqs.active())[:limit]


class SettingsService(ISettingsService):
    def __init__(self, settings: SettingsRepository) -> None:
        self._settings = settings

    async def get(self) -> ClinicSettings:
        return await self._settings.current()

    async def update(self, **data: Any) -> ClinicSettings:
        settings = await self._settings.current()
        _apply(settings, data)
        return await self._settings.update(settings)


# Autenticação
class AuthService(IAuthService):
    """Autenticação simples por token opaco em memória (sessões)."""

    def __init__(self, users: UserRepository) -> None:
        self._users = users
        self._sessions: dict[str, str] = {}

    @staticmethod
    def hash_password(password: str, salt: str = "sorridente") -> str:
        return hashlib.sha256(f"{salt}:{password}".encode("utf-8")).hexdigest()

    async def register(
        self, username: str, password: str, role: str, display_name: str = ""
    ) -> User:
        username = (username or "").strip().lower()
        if not username or not password:
            raise ValidationError("Usuário e senha são obrigatórios.")
        if role not in {r.value for r in Role}:
            raise ValidationError("Perfil inválido.")
        if await self._users.find_by_username(username) is not None:
            raise ConflictError("Este nome de usuário já existe.")
        user = User(
            username=username,
            password_hash=self.hash_password(password),
            role=role,
            display_name=display_name or username,
        )
        return await self._users.add(user)

    async def authenticate(self, username: str, password: str) -> tuple[User, str]:
        user = await self._users.find_by_username((username or "").strip().lower())
        if user is None or not hmac.compare_digest(user.password_hash, self.hash_password(password)):
            raise AuthenticationError("Usuário ou senha inválidos.")
        if not user.active:
            raise AuthenticationError("Usuário desativado.")
        token = secrets.token_urlsafe(32)
        self._sessions[token] = user.id
        return user, token

    async def resolve_token(self, token: str) -> User:
        user_id = self._sessions.get(token or "")
        if user_id is None:
            raise AuthenticationError("Sessão inválida ou expirada.")
        user = await self._users.get(user_id)
        if user is None:
            raise AuthenticationError("Usuário não encontrado.")
        return user

    async def logout(self, token: str) -> None:
        self._sessions.pop(token, None)

    async def list_users(self) -> list[User]:
        return await self._users.list()


# Indicadores do dashboard
class AnalyticsService(IAnalyticsService):
    def __init__(
        self,
        appointments: AppointmentRepository,
        patients: PatientRepository,
        conversations: ConversationRepository,
        notifications: NotificationRepository,
    ) -> None:
        self._appointments = appointments
        self._patients = patients
        self._conversations = conversations
        self._notifications = notifications

    async def dashboard(self) -> dict[str, Any]:
        today = date.today()
        all_appointments = await self._appointments.list()
        today_items = [a for a in all_appointments if a.start[:10] == today.isoformat()]
        week_start = today - timedelta(days=today.weekday())
        week_items = [
            a for a in all_appointments if week_start.isoformat() <= a.start[:10] <= (week_start + timedelta(days=6)).isoformat()
        ]
        by_status: dict[str, int] = {}
        for appointment in all_appointments:
            by_status[appointment.status] = by_status.get(appointment.status, 0) + 1

        series: list[dict[str, Any]] = []
        for offset in range(13, -1, -1):
            day = today - timedelta(days=offset)
            series.append(
                {
                    "date": day.isoformat(),
                    "total": sum(1 for a in all_appointments if a.start[:10] == day.isoformat()),
                }
            )

        conversations = await self._conversations.list()
        return {
            "patients_total": await self._patients.count(),
            "appointments_total": len(all_appointments),
            "appointments_today": len(today_items),
            "appointments_week": len(week_items),
            "conversations_total": len(conversations),
            "conversations_open": sum(1 for c in conversations if c.open),
            "unread_messages": sum(c.unread_for_staff for c in conversations),
            "unread_notifications": len(await self._notifications.unread()),
            "by_status": by_status,
            "by_channel": {
                channel: sum(1 for c in conversations if c.channel == channel)
                for channel in {c.channel for c in conversations}
            },
            "series_14d": series,
            "next_appointments": [a.to_dict() for a in (await self._appointments.upcoming())[:8]],
        }
