"""Integração com o Google Calendar.

Sincroniza os agendamentos da SorriDente com uma agenda do Google usando uma
**conta de serviço** (Service Account):

1. No Google Cloud, crie um projeto e ative a API Calendar.
2. Crie uma conta de serviço e baixe o JSON da chave.
3. No Google Calendar, compartilhe a agenda desejada com o e-mail da conta de
   serviço com permissão "Fazer alterações nos eventos".
4. No painel do SorriDente (Gestor → Integrações → Google Calendar), informe o
   ID da agenda (`primary` ou `sua-clinica@group.calendar.google.com`) e cole o
   conteúdo do JSON da conta de serviço.

A sincronização é best-effort: se o Google estiver indisponível, o agendamento
continua valendo no sistema e a falha fica registrada no log/status.
"""
from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from ..core.interfaces import ICredentialStore
from .base import (
    BaseIntegration,
    CredentialField,
    IntegrationKind,
    IntegrationStatus,
)

logger = logging.getLogger(__name__)

SCOPES = ["https://www.googleapis.com/auth/calendar"]
EVENT_MAP_KEY = "google_calendar_events"  # appointment_id -> event_id
ENABLED_KEY = "google_calendar_enabled"  # ligada/desligada no painel


class BaseCalendarIntegration(BaseIntegration):
    """Família de integrações de agenda (Google Calendar e futuras)."""

    kind = IntegrationKind.CALENDAR


class GoogleCalendarIntegration(BaseCalendarIntegration):
    """Agenda do Google como espelho dos agendamentos da clínica."""

    key = "google_calendar"
    kind = IntegrationKind.CALENDAR
    name = "Google Calendar"
    description = (
        "Sincroniza os agendamentos com uma agenda do Google (via conta de serviço): "
        "novas consultas viram eventos e remarcações/cancelamentos são refletidos."
    )

    credential_fields = (
        CredentialField(
            key="calendar_id",
            label="ID da agenda",
            placeholder="primary ou clinica@group.calendar.google.com",
            help_text="ID da agenda do Google; 'primary' usa a agenda principal da conta de serviço.",
        ),
        CredentialField(
            key="service_account_json",
            label="JSON da conta de serviço",
            secret=True,
            placeholder='{"type": "service_account", ...}',
            help_text="Cole o conteúdo completo do arquivo JSON da chave da conta de serviço.",
        ),
    )

    def __init__(self, store: Optional[ICredentialStore] = None) -> None:
        super().__init__()
        self._store = store
        self._enabled = False
        self._service: Any = None
        self._calendar_id = ""
        self._event_ids: dict[str, str] = {}   # cache do mapa em memória

    # ---------- ciclo de vida ----------

    async def configure(self, credentials: dict[str, Any]) -> None:
        self._remember(credentials)
        self._calendar_id = (self._credentials.get("calendar_id") or "").strip()
        self._service = None  # reconstrói com as novas credenciais
        # restaura o estado ligado/desligado persistido no painel
        self._enabled = False
        if self._store is not None and await self._store.get(ENABLED_KEY, False):
            if not self.is_configured():
                return
            try:
                await self._ensure_service()
                self._enabled = True
                self._last_error = ""
            except Exception as exc:  # noqa: BLE001
                self._last_error = str(exc)

    async def enable(self) -> None:
        try:
            await self._ensure_service()
            self._enabled = True
            self._last_error = ""
            if self._store is not None:
                await self._store.set(ENABLED_KEY, True)
        except Exception as exc:  # noqa: BLE001
            self._enabled = False
            self._last_error = str(exc)
            raise

    async def disable(self) -> None:
        self._enabled = False
        if self._store is not None:
            await self._store.set(ENABLED_KEY, False)

    async def test(self) -> dict[str, Any]:
        service = await self._ensure_service()
        calendar = await asyncio.to_thread(
            lambda: service.calendars().get(calendarId=self._calendar_id or "primary").execute()
        )
        return {
            "ok": True,
            "summary": calendar.get("summary", self._calendar_id or "primary"),
            "time_zone": calendar.get("timeZone", ""),
        }

    def status(self) -> IntegrationStatus:
        return IntegrationStatus(
            key=self.key,
            kind=self.kind.value,
            name=self.name,
            description=self.description,
            configured=self.is_configured(),
            enabled=self._enabled,
            running=self._enabled,
            detail=f"Agenda: {self._calendar_id or 'primary'}" if self.is_configured() else "",
            last_error=self._last_error,
            extra={"eventos_sincronizados": "sim" if self._enabled else "não"},
        )

    # ---------- serviço Google ----------

    async def _ensure_service(self) -> Any:
        if self._service is not None:
            return self._service
        raw = (self._credentials.get("service_account_json") or "").strip()
        if not raw:
            raise ValueError("JSON da conta de serviço não informado.")
        self._service = await asyncio.to_thread(self._build_service, raw)
        return self._service

    @staticmethod
    def _build_service(raw_json: str) -> Any:
        from google.oauth2 import service_account  # import local: dependência opcional
        from googleapiclient.discovery import build

        info = json.loads(raw_json)
        credentials = service_account.Credentials.from_service_account_info(
            info, scopes=SCOPES
        )
        return build("calendar", "v3", credentials=credentials, cache_discovery=False)

    # ---------- mapa appointment -> evento Google ----------

    async def _event_map(self) -> dict[str, str]:
        if self._store is not None and not self._event_ids:
            stored = await self._store.get(EVENT_MAP_KEY, {})
            if isinstance(stored, dict):
                self._event_ids = dict(stored)
        return dict(self._event_ids)

    async def _save_event_map(self, mapping: dict[str, str]) -> None:
        self._event_ids = dict(mapping)
        if self._store is not None:
            await self._store.set(EVENT_MAP_KEY, mapping)

    async def _google_datetime(self, iso: str) -> dict[str, str]:
        dt = datetime.fromisoformat(iso)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc).astimezone()
        return {
            "dateTime": dt.isoformat(timespec="minutes"),
            "timeZone": dt.tzinfo.key if dt.tzinfo and hasattr(dt.tzinfo, "key") else "",
        }

    # ---------- sincronização (best-effort) ----------

    async def _ready(self) -> Any:
        """Devolve o serviço se a integração estiver habilitada; caso contrário, None."""
        if not self._enabled or not self.is_configured():
            return None
        try:
            return await self._ensure_service()
        except Exception as exc:  # noqa: BLE001
            self._last_error = str(exc)
            logger.warning("Google Calendar indisponível: %s", exc)
            return None

    async def sync_upsert(self, appointment: Any, patient: Any) -> bool:
        """Cria ou atualiza o evento do Google correspondente ao agendamento."""
        service = await self._ready()
        if service is None:
            return False
        mapping = await self._event_map()
        evento = self._build_event(appointment, patient)
        try:
            if appointment.id in mapping:
                await asyncio.to_thread(
                    lambda: service.events().update(
                        calendarId=self._calendar_id or "primary",
                        eventId=mapping[appointment.id],
                        body=evento,
                    ).execute()
                )
            else:
                created = await asyncio.to_thread(
                    lambda: service.events().insert(
                        calendarId=self._calendar_id or "primary", body=evento
                    ).execute()
                )
                mapping[appointment.id] = created.get("id", "")
                await self._save_event_map(mapping)
            logger.info("Google Calendar sincronizado: %s", appointment.id)
            return True
        except Exception as exc:  # noqa: BLE001
            self._last_error = str(exc)
            logger.warning("Falha ao sincronizar com o Google Calendar (%s): %s", appointment.id, exc)
            return False

    async def sync_cancel(self, appointment: Any) -> bool:
        """Remove o evento do Google quando a consulta é cancelada."""
        service = await self._ready()
        if service is None:
            return False
        mapping = await self._event_map()
        event_id = mapping.pop(appointment.id, "")
        if not event_id:
            return False
        try:
            await asyncio.to_thread(
                lambda: service.events().delete(
                    calendarId=self._calendar_id or "primary", eventId=event_id
                ).execute()
            )
            await self._save_event_map(mapping)
            logger.info("Evento removido do Google Calendar: %s", appointment.id)
            return True
        except Exception as exc:  # noqa: BLE001
            self._last_error = str(exc)
            logger.warning("Falha ao remover evento do Google Calendar (%s): %s", appointment.id, exc)
            return False

    @staticmethod
    def _build_event(appointment: Any, patient: Any) -> dict[str, Any]:
        """Evento do Google correspondente ao agendamento (cores: padrão)."""
        inicio = datetime.fromisoformat(appointment.start)
        fim = datetime.fromisoformat(appointment.end)
        # o Google usa horário local da agenda quando o offset não é informado
        return {
            "summary": f"{appointment.procedure_name or 'Consulta'} — {patient.name}",
            "description": (
                f"Paciente: {appointment.patient_name}\n"
                f"Procedimento: {appointment.procedure_name or 'Consulta'}\n"
                f"Profissional: {appointment.dentist_name or 'Equipe SorriDente'}\n"
                + (f"Observações: {appointment.notes}\n" if appointment.notes else "")
                + f"Origem: {appointment.origin}\nStatus: {appointment.status}"
            ),
            "start": {"dateTime": inicio.isoformat(timespec="minutes")},
            "end": {"dateTime": fim.isoformat(timespec="minutes")},
            "status": "cancelled" if appointment.status == "cancelado" else "confirmed",
        }
