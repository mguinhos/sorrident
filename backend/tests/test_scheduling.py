"""Regras de agenda: disponibilidade, conflito, remarcação e cancelamento."""
from __future__ import annotations

from datetime import date, datetime, time, timedelta

import pytest

from sorridente.container import ApplicationContainer
from sorridente.core.exceptions import ConflictError, NotFoundError, ValidationError
from sorridente.core.models import AppointmentStatus

pytestmark = pytest.mark.asyncio


def _next_weekday(days_ahead: int = 1) -> date:
    day = date.today() + timedelta(days=days_ahead)
    while day.weekday() > 4:
        day += timedelta(days=1)
    return day


async def test_slots_respeitam_expediente(container: ApplicationContainer) -> None:
    slots = await container.scheduling_service.available_slots(_next_weekday())
    assert slots, "deveria haver horários livres em um dia útil"
    horas = {datetime.fromisoformat(s["start"]).time() for s in slots}
    assert min(horas) >= time(8, 0)
    assert max(horas) < time(18, 0)
    # nenhum horário durante o almoço
    assert not any(time(12, 0) <= h < time(13, 0) for h in horas)


async def test_fim_de_semana_sem_horarios(container: ApplicationContainer) -> None:
    day = date.today()
    while day.weekday() != 6:  # domingo
        day += timedelta(days=1)
    assert await container.scheduling_service.available_slots(day) == []


async def test_agendamento_e_conflito(container: ApplicationContainer) -> None:
    patient = await container.patient_service.create(name="Ana Souza", phone="11999990000")
    slot = (await container.scheduling_service.available_slots(_next_weekday()))[0]
    start = datetime.fromisoformat(slot["start"])

    appointment = await container.appointment_service.schedule(
        patient_id=patient.id, start=start, dentist_id=slot["dentist_id"]
    )
    assert appointment.status == AppointmentStatus.AGENDADO.value
    assert appointment.patient_name == "Ana Souza"

    with pytest.raises(ConflictError):
        await container.appointment_service.schedule(
            patient_id=patient.id, start=start, dentist_id=slot["dentist_id"]
        )


async def test_nao_agenda_no_passado(container: ApplicationContainer) -> None:
    patient = await container.patient_service.create(name="João Lima")
    with pytest.raises(ValidationError):
        await container.appointment_service.schedule(
            patient_id=patient.id, start=datetime.now() - timedelta(days=1)
        )


async def test_remarcar_e_cancelar(container: ApplicationContainer) -> None:
    patient = await container.patient_service.create(name="Carla Dias")
    slots = await container.scheduling_service.available_slots(_next_weekday())
    appointment = await container.appointment_service.schedule(
        patient_id=patient.id,
        start=datetime.fromisoformat(slots[0]["start"]),
        dentist_id=slots[0]["dentist_id"],
    )

    livre = next(s for s in slots if s["dentist_id"] == slots[0]["dentist_id"] and s["start"] != slots[0]["start"])
    remarcado = await container.appointment_service.reschedule(
        appointment.id, datetime.fromisoformat(livre["start"])
    )
    assert remarcado.start == livre["start"]

    cancelado = await container.appointment_service.cancel(appointment.id, "imprevisto")
    assert cancelado.status == AppointmentStatus.CANCELADO.value
    # o horário volta a ficar livre depois do cancelamento
    assert await container.scheduling_service.is_free(
        slots[0]["dentist_id"], remarcado.start_dt, remarcado.end_dt, ignore_id=""
    ) is True


async def test_procedimento_define_duracao(container: ApplicationContainer) -> None:
    patient = await container.patient_service.create(name="Rita Alves")
    procedures = await container.procedure_service.list_all(only_active=True)
    longo = max(procedures, key=lambda p: p.duration_minutes)
    slot = (await container.scheduling_service.available_slots(_next_weekday()))[0]

    appointment = await container.appointment_service.schedule(
        patient_id=patient.id,
        start=datetime.fromisoformat(slot["start"]),
        dentist_id=slot["dentist_id"],
        procedure_id=longo.id,
    )
    duracao = int((appointment.end_dt - appointment.start_dt).total_seconds() // 60)
    assert duracao == longo.duration_minutes
    assert appointment.procedure_name == longo.name


async def test_paciente_inexistente(container: ApplicationContainer) -> None:
    with pytest.raises(NotFoundError):
        await container.appointment_service.schedule(
            patient_id="nao-existe", start=datetime.now() + timedelta(days=1)
        )
