"""Rotas de agendamentos e agenda."""
from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, Query

from ...container import ApplicationContainer
from ..dependencies import get_container, require_staff
from ..schemas.dto import (
    AppointmentRequest,
    CancelRequest,
    EmergencyAppointmentRequest,
    RescheduleRequest,
    StatusRequest,
)

router = APIRouter(prefix="/appointments", tags=["agendamentos"], dependencies=[Depends(require_staff)])


@router.get("")
async def list_appointments(
    status: str = Query(default=""),
    patient_id: str = Query(default=""),
    dentist_id: str = Query(default=""),
    container: ApplicationContainer = Depends(get_container),
) -> list[dict[str, Any]]:
    items = await container.appointment_service.list_all(
        status=status, patient_id=patient_id, dentist_id=dentist_id
    )
    return [a.to_dict() for a in items]


@router.get("/agenda")
async def agenda(
    start: date = Query(default_factory=date.today),
    days: int = Query(default=7, ge=1, le=90),
    container: ApplicationContainer = Depends(get_container),
) -> list[dict[str, Any]]:
    items = await container.appointment_service.agenda(start, start + timedelta(days=days - 1))
    return [a.to_dict() for a in items]


@router.get("/slots")
async def slots(
    day: date = Query(default_factory=date.today),
    dentist_id: str = Query(default=""),
    duration: int = Query(default=0, ge=0, le=480),
    container: ApplicationContainer = Depends(get_container),
) -> list[dict[str, Any]]:
    return await container.scheduling_service.available_slots(day, dentist_id, duration)


@router.post("")
async def create_appointment(
    payload: AppointmentRequest, container: ApplicationContainer = Depends(get_container)
) -> dict[str, Any]:
    appointment = await container.appointment_service.schedule(
        patient_id=payload.patient_id,
        start=payload.start,
        dentist_id=payload.dentist_id,
        procedure_id=payload.procedure_id,
        notes=payload.notes,
        origin="web",
        allow_overbook=payload.allow_overbook,
        priority=payload.priority,
    )
    return appointment.to_dict()


@router.get("/emergency-slot")
async def emergency_slot(
    container: ApplicationContainer = Depends(get_container),
) -> dict[str, Any]:
    """Próximo horário viável para uma urgência, mesmo com a grade cheia."""
    return await container.scheduling_service.next_emergency_slot()


@router.post("/emergency")
async def create_emergency(
    payload: EmergencyAppointmentRequest,
    container: ApplicationContainer = Depends(get_container),
) -> dict[str, Any]:
    appointment = await container.appointment_service.schedule_emergency(
        patient_id=payload.patient_id,
        reason=payload.reason,
        origin="web",
        start=payload.start,
    )
    return appointment.to_dict()


@router.get("/{appointment_id}")
async def get_appointment(
    appointment_id: str, container: ApplicationContainer = Depends(get_container)
) -> dict[str, Any]:
    return (await container.appointment_service.get(appointment_id)).to_dict()


@router.put("/{appointment_id}/reschedule")
async def reschedule(
    appointment_id: str,
    payload: RescheduleRequest,
    container: ApplicationContainer = Depends(get_container),
) -> dict[str, Any]:
    return (await container.appointment_service.reschedule(appointment_id, payload.start)).to_dict()


@router.put("/{appointment_id}/status")
async def set_status(
    appointment_id: str,
    payload: StatusRequest,
    container: ApplicationContainer = Depends(get_container),
) -> dict[str, Any]:
    return (await container.appointment_service.set_status(appointment_id, payload.status)).to_dict()


@router.post("/{appointment_id}/cancel")
async def cancel(
    appointment_id: str,
    payload: CancelRequest,
    container: ApplicationContainer = Depends(get_container),
) -> dict[str, Any]:
    return (await container.appointment_service.cancel(appointment_id, payload.reason)).to_dict()
