"""Modelos de domínio da clínica SorriDente.

Entidades puras, sem qualquer dependência de framework, banco de dados ou LLM.
"""
from __future__ import annotations

import uuid
from dataclasses import dataclass, field, asdict
from datetime import datetime, date, time
from enum import Enum
from typing import Any, Optional


def new_id() -> str:
    return uuid.uuid4().hex[:12]


def now_iso() -> str:
    return datetime.now().isoformat(timespec="seconds")


class Role(str, Enum):
    """Perfis de acesso da interface web."""

    CLIENTE = "cliente"
    GESTOR = "gestor"
    MEDICO = "medico"


class SlotType(str, Enum):
    """Como o horário foi ocupado na agenda."""

    REGULAR = "regular"      # horário livre da grade
    ENCAIXE = "encaixe"      # sobreposto à grade, autorizado pela clínica


class Priority(str, Enum):
    NORMAL = "normal"
    URGENTE = "urgente"


class AppointmentStatus(str, Enum):
    AGENDADO = "agendado"
    CONFIRMADO = "confirmado"
    CONCLUIDO = "concluido"
    CANCELADO = "cancelado"
    FALTOU = "faltou"


class ChannelType(str, Enum):
    WEB = "web"
    TELEGRAM = "telegram"
    WHATSAPP = "whatsapp"


class MessageAuthor(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"
    TOOL = "tool"
    HUMAN_AGENT = "human_agent"


class NotificationLevel(str, Enum):
    INFO = "info"
    SUCESSO = "sucesso"
    ALERTA = "alerta"
    ERRO = "erro"


@dataclass
class Entity:
    """Base de todas as entidades persistidas."""

    id: str = field(default_factory=new_id)
    created_at: str = field(default_factory=now_iso)
    updated_at: str = field(default_factory=now_iso)

    def to_dict(self) -> dict[str, Any]:
        data = asdict(self)
        return {k: (v.value if isinstance(v, Enum) else v) for k, v in data.items()}

    @classmethod
    def from_dict(cls, data: dict[str, Any]):
        allowed = {f for f in cls.__dataclass_fields__}  # type: ignore[attr-defined]
        return cls(**{k: v for k, v in data.items() if k in allowed})

    def touch(self) -> None:
        self.updated_at = now_iso()


@dataclass
class Patient(Entity):
    """Paciente / cliente da clínica."""

    name: str = ""
    phone: str = ""
    email: str = ""
    birth_date: str = ""            # ISO YYYY-MM-DD
    document: str = ""              # CPF
    insurance_provider: str = ""    # convênio odontológico
    insurance_card: str = ""        # número da carteirinha
    responsible_name: str = ""      # responsável, quando menor de idade
    notes: str = ""
    telegram_id: str = ""           # chat_id do Telegram, quando vinculado
    whatsapp_id: str = ""
    treatment: str = ""             # tratamento ortodôntico em curso
    active: bool = True


@dataclass
class Dentist(Entity):
    """Profissional (ortodontista) da clínica."""

    name: str = ""
    cro: str = ""
    specialty: str = "Ortodontia"
    email: str = ""
    phone: str = ""
    color: str = "#1677ff"          # cor na agenda
    active: bool = True
    # Disponibilidade semanal: {"0": [["08:00","12:00"],["13:00","18:00"]], ...}
    # chave = dia da semana (0=segunda ... 6=domingo)
    availability: dict[str, list[list[str]]] = field(default_factory=dict)


@dataclass
class Procedure(Entity):
    """Procedimento ofertado pela clínica."""

    name: str = ""
    description: str = ""
    duration_minutes: int = 30
    price: float = 0.0
    active: bool = True


@dataclass
class Appointment(Entity):
    """Agendamento de consulta."""

    patient_id: str = ""
    patient_name: str = ""
    dentist_id: str = ""
    dentist_name: str = ""
    procedure_id: str = ""
    procedure_name: str = ""
    start: str = ""                 # ISO datetime
    end: str = ""                   # ISO datetime
    status: str = AppointmentStatus.AGENDADO.value
    slot_type: str = SlotType.REGULAR.value
    priority: str = Priority.NORMAL.value
    notes: str = ""
    origin: str = ChannelType.WEB.value
    reminder_sent: bool = False

    @property
    def is_encaixe(self) -> bool:
        return self.slot_type == SlotType.ENCAIXE.value

    @property
    def is_urgent(self) -> bool:
        return self.priority == Priority.URGENTE.value

    @property
    def duration_minutes(self) -> int:
        return int((self.end_dt - self.start_dt).total_seconds() // 60)

    @property
    def start_dt(self) -> datetime:
        return datetime.fromisoformat(self.start)

    @property
    def end_dt(self) -> datetime:
        return datetime.fromisoformat(self.end)


@dataclass
class ChatMessage(Entity):
    """Mensagem de uma conversa."""

    conversation_id: str = ""
    author: str = MessageAuthor.USER.value
    content: str = ""
    tool_name: str = ""
    tool_payload: dict[str, Any] = field(default_factory=dict)


@dataclass
class Conversation(Entity):
    """Fio de conversa entre um contato e o agente SorriDente."""

    channel: str = ChannelType.WEB.value
    external_id: str = ""           # chat_id do Telegram / session id da web
    patient_id: str = ""
    display_name: str = "Visitante"
    last_message_at: str = field(default_factory=now_iso)
    unread_for_staff: int = 0
    handoff: bool = False           # atendimento assumido por humano
    open: bool = True
    closed_at: str = ""             # encerramento por inatividade ou pela equipe
    closed_reason: str = ""
    handoff_notice_at: str = ""     # último aviso de espera enviado ao paciente


@dataclass
class Notification(Entity):
    """Notificação exibida no dashboard do gestor."""

    title: str = ""
    message: str = ""
    level: str = NotificationLevel.INFO.value
    read: bool = False
    link: str = ""
    meta: dict[str, Any] = field(default_factory=dict)


@dataclass
class FAQ(Entity):
    """Dúvida frequente usada como base de conhecimento do agente."""

    question: str = ""
    answer: str = ""
    tags: list[str] = field(default_factory=list)
    active: bool = True


@dataclass
class KnowledgeDocument(Entity):
    """Documento da base de conhecimento consultada por RAG."""

    title: str = ""
    content: str = ""
    source: str = "manual"          # manual | faq | procedimento | clinica
    source_id: str = ""             # id da entidade de origem, quando derivado
    tags: list[str] = field(default_factory=list)
    active: bool = True


@dataclass
class ClinicSettings(Entity):
    """Configurações gerais da clínica."""

    clinic_name: str = "Clínica Ortodôntica SorriDente"
    address: str = ""
    phone: str = ""
    email: str = ""
    opening_hour: str = "08:00"
    closing_hour: str = "18:00"
    lunch_start: str = "12:00"
    lunch_end: str = "13:00"
    working_days: list[int] = field(default_factory=lambda: [0, 1, 2, 3, 4])
    slot_minutes: int = 30
    inactivity_minutes: int = 20    # encerra o atendimento após este silêncio
    emergency_slot_minutes: int = 30       # duração do encaixe de urgência
    max_emergency_per_day: int = 4         # limite de encaixes de urgência por dia
    handoff_notice_cooldown_minutes: int = 5
    persona: str = (
        "Você é o SorriDente, atendente virtual da Clínica Ortodôntica SorriDente, "
        "especialista em atendimento clínico odontológico: acolhedor, objetivo e "
        "organizado, conduzindo o paciente do primeiro contato até a consulta marcada."
    )


@dataclass
class User(Entity):
    """Usuário da interface web (gestor, médico ou cliente)."""

    username: str = ""
    password_hash: str = ""
    role: str = Role.CLIENTE.value
    display_name: str = ""
    linked_id: str = ""             # dentist_id ou patient_id correspondente
    active: bool = True
