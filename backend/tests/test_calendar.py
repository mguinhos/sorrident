"""Testes da integração com o Google Calendar (sincronização best-effort)."""
from __future__ import annotations

from datetime import datetime, timedelta

import pytest

from sorridente.config import AppConfig
from sorridente.container import ApplicationContainer
from sorridente.core.models import Appointment, Patient
from sorridente.integrations import GoogleCalendarIntegration

pytestmark = pytest.mark.asyncio


class FakeRequest:
    """Dublê do HttpRequest do Google: precisa de .execute()."""

    def __init__(self, resultado: dict) -> None:
        self._resultado = resultado

    def execute(self) -> dict:
        return self._resultado


class FakeEvents:
    """Dublê do recurso events() do client do Google."""

    def __init__(self) -> None:
        self.criados: list[dict] = []
        self.atualizados: list[str] = []
        self.excluidos: list[str] = []
        self._contador = 0

    def insert(self, calendarId: str, body: dict) -> FakeRequest:
        self._contador += 1
        self.criados.append(body)
        return FakeRequest({"id": f"evento-{self._contador}"})

    def update(self, calendarId: str, eventId: str, body: dict) -> FakeRequest:
        self.atualizados.append(eventId)
        return FakeRequest({"id": eventId})

    def delete(self, calendarId: str, eventId: str) -> FakeRequest:
        self.excluidos.append(eventId)
        return FakeRequest({})


class FakeService:
    def __init__(self) -> None:
        self.events_resource = FakeEvents()

    def events(self) -> FakeEvents:
        return self.events_resource


async def _configurado(monkeypatch: pytest.MonkeyPatch, service: FakeService) -> GoogleCalendarIntegration:
    integration = GoogleCalendarIntegration()
    await integration.configure(
        {"calendar_id": "clinica@group.calendar.google.com", "service_account_json": '{"type": "service_account"}'}
    )

    async def fake_ensure() -> FakeService:
        integration._service = service
        return service

    monkeypatch.setattr(integration, "_ensure_service", fake_ensure)
    await integration.enable()
    return integration


def _appointment(start: str) -> Appointment:
    fim = (datetime.fromisoformat(start) + timedelta(minutes=30)).isoformat(timespec="minutes")
    return Appointment(
        id="ap-1",
        patient_id="pac-1",
        patient_name="Bia Souza",
        dentist_name="Dra. Mônica",
        procedure_name="Manutenção de aparelho fixo",
        start=start,
        end=fim,
        status="agendado",
    )


async def test_integracao_aparece_no_registro_e_desligada_nao_sincroniza() -> None:
    config = AppConfig(database_path="/tmp/sd-cal-test.json", credentials_path="/tmp/sd-cal-creds.json", autostart_telegram=False)
    container = ApplicationContainer(config)
    assert "google_calendar" in container.integrations.calendar
    integration = container.google_calendar
    assert integration.kind.value == "calendar"

    # desligada: sincronização vira no-op (nunca derruba o agendamento)
    appointment = _appointment((datetime.now() + timedelta(days=1)).replace(hour=9, minute=0).isoformat(timespec="minutes"))
    assert await integration.sync_upsert(appointment, Patient(name="Bia")) is False
    assert await integration.sync_cancel(appointment) is False


async def test_sync_upsert_cria_e_depois_atualiza_evento(monkeypatch: pytest.MonkeyPatch) -> None:
    service = FakeService()
    integration = await _configurado(monkeypatch, service)

    appointment = _appointment((datetime.now() + timedelta(days=1)).replace(hour=9, minute=0).isoformat(timespec="minutes"))
    paciente = Patient(id="pac-1", name="Bia Souza", email="bia@email.com")

    assert await integration.sync_upsert(appointment, paciente) is True
    assert len(service.events().criados) == 1
    evento = service.events().criados[0]
    assert "Bia Souza" in evento["summary"]
    assert evento["start"]["dateTime"] == appointment.start

    # segunda chamada: atualiza o evento já existente, sem duplicar
    assert await integration.sync_upsert(appointment, paciente) is True
    assert len(service.events().criados) == 1
    assert service.events().atualizados == ["evento-1"]


async def test_sync_cancel_remove_evento(monkeypatch: pytest.MonkeyPatch) -> None:
    service = FakeService()
    integration = await _configurado(monkeypatch, service)

    appointment = _appointment((datetime.now() + timedelta(days=1)).replace(hour=9, minute=0).isoformat(timespec="minutes"))
    await integration.sync_upsert(appointment, Patient(id="pac-1", name="Bia"))

    assert await integration.sync_cancel(appointment) is True
    assert service.events().excluidos == ["evento-1"]

    # cancelar de novo não tem o que excluir
    assert await integration.sync_cancel(appointment) is False


async def test_erro_do_google_nao_derruba_sincronizacao(monkeypatch: pytest.MonkeyPatch) -> None:
    class FailingEvents:
        def insert(self, calendarId: str, body: dict) -> FakeRequest:
            raise ConnectionError("sem internet")

    class FailingService:
        def events(self) -> FailingEvents:
            return FailingEvents()

    integration = GoogleCalendarIntegration()
    await integration.configure({"calendar_id": "primary", "service_account_json": '{"type": "service_account"}'})

    async def _fail() -> FailingService:
        return FailingService()

    monkeypatch.setattr(integration, "_ensure_service", _fail)
    await integration.enable()

    appointment = _appointment((datetime.now() + timedelta(days=1)).replace(hour=9, minute=0).isoformat(timespec="minutes"))
    assert await integration.sync_upsert(appointment, Patient(id="pac-1", name="Bia")) is False
    assert integration.last_error
