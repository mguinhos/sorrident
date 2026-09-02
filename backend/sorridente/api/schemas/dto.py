"""DTOs de entrada da API (validação com Pydantic)."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    username: str
    password: str
    role: str = "cliente"
    display_name: str = ""


class PatientRequest(BaseModel):
    name: str
    phone: str = ""
    email: str = ""
    birth_date: str = ""
    document: str = ""
    insurance_provider: str = ""
    insurance_card: str = ""
    responsible_name: str = ""
    notes: str = ""
    treatment: str = ""
    telegram_id: str = ""
    active: bool = True


class PatientUpdateRequest(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    birth_date: Optional[str] = None
    document: Optional[str] = None
    insurance_provider: Optional[str] = None
    insurance_card: Optional[str] = None
    responsible_name: Optional[str] = None
    notes: Optional[str] = None
    treatment: Optional[str] = None
    telegram_id: Optional[str] = None
    active: Optional[bool] = None


class DentistRequest(BaseModel):
    name: str
    cro: str = ""
    specialty: str = "Ortodontia"
    email: str = ""
    phone: str = ""
    color: str = "#1677ff"
    active: bool = True
    availability: dict[str, list[list[str]]] = Field(default_factory=dict)


class DentistUpdateRequest(BaseModel):
    name: Optional[str] = None
    cro: Optional[str] = None
    specialty: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    color: Optional[str] = None
    active: Optional[bool] = None
    availability: Optional[dict[str, list[list[str]]]] = None


class ProcedureRequest(BaseModel):
    name: str
    description: str = ""
    duration_minutes: int = 30
    price: float = 0.0
    active: bool = True


class ProcedureUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    duration_minutes: Optional[int] = None
    price: Optional[float] = None
    active: Optional[bool] = None


class AppointmentRequest(BaseModel):
    patient_id: str
    start: datetime
    dentist_id: str = ""
    procedure_id: str = ""
    notes: str = ""
    allow_overbook: bool = False
    priority: str = "normal"


class EmergencyAppointmentRequest(BaseModel):
    patient_id: str
    reason: str
    start: Optional[datetime] = None


class RescheduleRequest(BaseModel):
    start: datetime


class StatusRequest(BaseModel):
    status: str


class CancelRequest(BaseModel):
    reason: str = ""


class ChatRequest(BaseModel):
    session_id: str
    message: str
    display_name: str = "Visitante"


class StaffReplyRequest(BaseModel):
    message: str


class HandoffRequest(BaseModel):
    handoff: bool


class FAQRequest(BaseModel):
    question: str
    answer: str
    tags: list[str] = Field(default_factory=list)


class FAQUpdateRequest(BaseModel):
    question: Optional[str] = None
    answer: Optional[str] = None
    tags: Optional[list[str]] = None
    active: Optional[bool] = None


class KnowledgeDocumentRequest(BaseModel):
    title: str
    content: str
    tags: list[str] = Field(default_factory=list)


class KnowledgeDocumentUpdateRequest(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    tags: Optional[list[str]] = None
    active: Optional[bool] = None


class SettingsRequest(BaseModel):
    clinic_name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    opening_hour: Optional[str] = None
    closing_hour: Optional[str] = None
    lunch_start: Optional[str] = None
    lunch_end: Optional[str] = None
    working_days: Optional[list[int]] = None
    slot_minutes: Optional[int] = None
    inactivity_minutes: Optional[int] = None
    emergency_slot_minutes: Optional[int] = None
    max_emergency_per_day: Optional[int] = None
    handoff_notice_cooldown_minutes: Optional[int] = None
    persona: Optional[str] = None


class IntegrationCredentialsRequest(BaseModel):
    """Credenciais de qualquer integração, no formato declarado por ela."""

    values: dict[str, Any] = Field(default_factory=dict)
    enable: Optional[bool] = None
