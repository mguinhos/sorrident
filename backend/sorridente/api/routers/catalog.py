"""Rotas de pacientes, profissionais e procedimentos."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query

from ...container import ApplicationContainer
from ..dependencies import get_container, require_manager, require_staff
from ..schemas.dto import (
    DentistRequest,
    DentistUpdateRequest,
    PatientRequest,
    PatientUpdateRequest,
    ProcedureRequest,
    ProcedureUpdateRequest,
)

patients_router = APIRouter(prefix="/patients", tags=["pacientes"], dependencies=[Depends(require_staff)])
dentists_router = APIRouter(prefix="/dentists", tags=["profissionais"])
procedures_router = APIRouter(prefix="/procedures", tags=["procedimentos"])


@patients_router.get("")
async def list_patients(
    search: str = Query(default=""), container: ApplicationContainer = Depends(get_container)
) -> list[dict[str, Any]]:
    return [p.to_dict() for p in await container.patient_service.list_all(search)]


@patients_router.post("")
async def create_patient(
    payload: PatientRequest, container: ApplicationContainer = Depends(get_container)
) -> dict[str, Any]:
    patient = await container.patient_service.create(**payload.model_dump())
    return patient.to_dict()


@patients_router.get("/{patient_id}")
async def get_patient(
    patient_id: str, container: ApplicationContainer = Depends(get_container)
) -> dict[str, Any]:
    patient = await container.patient_service.get(patient_id)
    appointments = await container.appointment_service.list_all(patient_id=patient_id)
    return {**patient.to_dict(), "appointments": [a.to_dict() for a in appointments]}


@patients_router.put("/{patient_id}")
async def update_patient(
    patient_id: str,
    payload: PatientUpdateRequest,
    container: ApplicationContainer = Depends(get_container),
) -> dict[str, Any]:
    patient = await container.patient_service.update(patient_id, **payload.model_dump(exclude_none=True))
    return patient.to_dict()


@patients_router.delete("/{patient_id}", dependencies=[Depends(require_manager)])
async def delete_patient(
    patient_id: str, container: ApplicationContainer = Depends(get_container)
) -> dict[str, Any]:
    return {"deleted": await container.patient_service.delete(patient_id)}


@dentists_router.get("")
async def list_dentists(
    only_active: bool = Query(default=False), container: ApplicationContainer = Depends(get_container)
) -> list[dict[str, Any]]:
    return [d.to_dict() for d in await container.dentist_service.list_all(only_active)]


@dentists_router.post("", dependencies=[Depends(require_manager)])
async def create_dentist(
    payload: DentistRequest, container: ApplicationContainer = Depends(get_container)
) -> dict[str, Any]:
    dentist = await container.dentist_service.create(**payload.model_dump())
    return dentist.to_dict()


@dentists_router.put("/{dentist_id}", dependencies=[Depends(require_staff)])
async def update_dentist(
    dentist_id: str,
    payload: DentistUpdateRequest,
    container: ApplicationContainer = Depends(get_container),
) -> dict[str, Any]:
    dentist = await container.dentist_service.update(dentist_id, **payload.model_dump(exclude_none=True))
    return dentist.to_dict()


@dentists_router.delete("/{dentist_id}", dependencies=[Depends(require_manager)])
async def delete_dentist(
    dentist_id: str, container: ApplicationContainer = Depends(get_container)
) -> dict[str, Any]:
    return {"deleted": await container.dentist_service.delete(dentist_id)}


@procedures_router.get("")
async def list_procedures(
    only_active: bool = Query(default=False), container: ApplicationContainer = Depends(get_container)
) -> list[dict[str, Any]]:
    return [p.to_dict() for p in await container.procedure_service.list_all(only_active)]


@procedures_router.post("", dependencies=[Depends(require_manager)])
async def create_procedure(
    payload: ProcedureRequest, container: ApplicationContainer = Depends(get_container)
) -> dict[str, Any]:
    procedure = await container.procedure_service.create(**payload.model_dump())
    return procedure.to_dict()


@procedures_router.put("/{procedure_id}", dependencies=[Depends(require_manager)])
async def update_procedure(
    procedure_id: str,
    payload: ProcedureUpdateRequest,
    container: ApplicationContainer = Depends(get_container),
) -> dict[str, Any]:
    procedure = await container.procedure_service.update(
        procedure_id, **payload.model_dump(exclude_none=True)
    )
    return procedure.to_dict()


@procedures_router.delete("/{procedure_id}", dependencies=[Depends(require_manager)])
async def delete_procedure(
    procedure_id: str, container: ApplicationContainer = Depends(get_container)
) -> dict[str, Any]:
    return {"deleted": await container.procedure_service.delete(procedure_id)}
