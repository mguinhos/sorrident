"""Repositórios especializados por entidade.

Cada repositório herda o CRUD genérico e adiciona apenas as consultas
específicas do seu agregado.
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from ...core.interfaces import IDatabase
from ...core.models import (
    Appointment,
    ChatMessage,
    ClinicSettings,
    Conversation,
    Dentist,
    FAQ,
    KnowledgeDocument,
    Notification,
    Patient,
    Procedure,
    User,
)
from ...infrastructure.database.repository import TinyDBRepository


class PatientRepository(TinyDBRepository[Patient]):
    def __init__(self, database: IDatabase) -> None:
        super().__init__(database, Patient, "patients")

    async def find_by_telegram(self, telegram_id: str) -> Optional[Patient]:
        return await self.find_one({"telegram_id": str(telegram_id)})

    async def find_by_phone(self, phone: str) -> Optional[Patient]:
        return await self.find_one({"phone": phone})

    async def find_by_document(self, document: str) -> Optional[Patient]:
        """Busca por CPF, ignorando pontuação."""
        digits = "".join(ch for ch in (document or "") if ch.isdigit())
        if not digits:
            return None
        for patient in await self.list():
            if "".join(ch for ch in patient.document if ch.isdigit()) == digits:
                return patient
        return None

    async def search(self, term: str) -> list[Patient]:
        term = (term or "").strip().lower()
        patients = await self.list()
        if not term:
            return patients
        return [
            p
            for p in patients
            if term in p.name.lower() or term in p.phone or term in p.email.lower() or term in p.document
        ]


class DentistRepository(TinyDBRepository[Dentist]):
    def __init__(self, database: IDatabase) -> None:
        super().__init__(database, Dentist, "dentists")

    async def active(self) -> list[Dentist]:
        return await self.list({"active": True})


class ProcedureRepository(TinyDBRepository[Procedure]):
    def __init__(self, database: IDatabase) -> None:
        super().__init__(database, Procedure, "procedures")

    async def active(self) -> list[Procedure]:
        return await self.list({"active": True})

    async def find_by_name(self, name: str) -> Optional[Procedure]:
        name = (name or "").strip().lower()
        for procedure in await self.list():
            if procedure.name.strip().lower() == name:
                return procedure
        return None


class AppointmentRepository(TinyDBRepository[Appointment]):
    def __init__(self, database: IDatabase) -> None:
        super().__init__(database, Appointment, "appointments")

    async def by_patient(self, patient_id: str) -> list[Appointment]:
        items = await self.list({"patient_id": patient_id})
        return sorted(items, key=lambda a: a.start)

    async def by_dentist(self, dentist_id: str) -> list[Appointment]:
        items = await self.list({"dentist_id": dentist_id})
        return sorted(items, key=lambda a: a.start)

    async def in_range(self, start: datetime, end: datetime) -> list[Appointment]:
        items = await self.list()
        result = []
        for appointment in items:
            try:
                if start <= appointment.start_dt < end:
                    result.append(appointment)
            except ValueError:
                continue
        return sorted(result, key=lambda a: a.start)

    async def upcoming(self, reference: Optional[datetime] = None) -> list[Appointment]:
        reference = reference or datetime.now()
        items = [
            a
            for a in await self.list()
            if a.status in ("agendado", "confirmado") and a.start >= reference.isoformat()
        ]
        return sorted(items, key=lambda a: a.start)


class ConversationRepository(TinyDBRepository[Conversation]):
    def __init__(self, database: IDatabase) -> None:
        super().__init__(database, Conversation, "conversations")

    async def find_by_external(self, channel: str, external_id: str) -> Optional[Conversation]:
        return await self.find_one({"channel": channel, "external_id": str(external_id)})

    async def recent(self, limit: int = 100) -> list[Conversation]:
        items = await self.list()
        return sorted(items, key=lambda c: c.last_message_at, reverse=True)[:limit]

    async def open_conversations(self) -> list[Conversation]:
        return await self.list({"open": True})


class MessageRepository(TinyDBRepository[ChatMessage]):
    def __init__(self, database: IDatabase) -> None:
        super().__init__(database, ChatMessage, "messages")

    async def by_conversation(self, conversation_id: str, limit: int = 200) -> list[ChatMessage]:
        items = await self.list({"conversation_id": conversation_id})
        items.sort(key=lambda m: m.created_at)
        return items[-limit:]


class NotificationRepository(TinyDBRepository[Notification]):
    def __init__(self, database: IDatabase) -> None:
        super().__init__(database, Notification, "notifications")

    async def unread(self) -> list[Notification]:
        return await self.list({"read": False})

    async def recent(self, limit: int = 50) -> list[Notification]:
        items = await self.list()
        return sorted(items, key=lambda n: n.created_at, reverse=True)[:limit]


class FAQRepository(TinyDBRepository[FAQ]):
    def __init__(self, database: IDatabase) -> None:
        super().__init__(database, FAQ, "faqs")

    async def active(self) -> list[FAQ]:
        return await self.list({"active": True})

    async def search(self, term: str, limit: int = 5) -> list[FAQ]:
        """Busca simples por sobreposição de palavras (sem dependências externas)."""
        words = {w for w in (term or "").lower().split() if len(w) > 3}
        scored: list[tuple[int, FAQ]] = []
        for faq in await self.active():
            haystack = f"{faq.question} {faq.answer} {' '.join(faq.tags)}".lower()
            score = sum(1 for w in words if w in haystack)
            if score:
                scored.append((score, faq))
        scored.sort(key=lambda pair: pair[0], reverse=True)
        return [faq for _, faq in scored[:limit]]


class KnowledgeRepository(TinyDBRepository[KnowledgeDocument]):
    def __init__(self, database: IDatabase) -> None:
        super().__init__(database, KnowledgeDocument, "knowledge")

    async def active(self) -> list[KnowledgeDocument]:
        return await self.list({"active": True})


class UserRepository(TinyDBRepository[User]):
    def __init__(self, database: IDatabase) -> None:
        super().__init__(database, User, "users")

    async def find_by_username(self, username: str) -> Optional[User]:
        return await self.find_one({"username": (username or "").strip().lower()})


class SettingsRepository(TinyDBRepository[ClinicSettings]):
    SINGLETON_ID = "clinic"

    def __init__(self, database: IDatabase) -> None:
        super().__init__(database, ClinicSettings, "settings")

    async def current(self) -> ClinicSettings:
        settings = await self.get(self.SINGLETON_ID)
        if settings is None:
            settings = ClinicSettings(id=self.SINGLETON_ID)
            await self.add(settings)
        return settings
