"""Camada de integrações: contrato único para tudo que é externo ao sistema.

Um provedor de inferência (Groq), um canal de mensageria (Telegram, WhatsApp)
ou qualquer serviço futuro (pagamentos, e-mail) são a mesma coisa aos olhos do
sistema: uma `IIntegration` com credenciais declaradas, ciclo de vida e status.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional


class IntegrationKind(str, Enum):
    """Categoria da integração — define como o sistema a utiliza."""

    INFERENCE_PROVIDER = "inference_provider"
    MESSAGING_CHANNEL = "messaging_channel"
    CALENDAR = "calendar"
    PAYMENT = "payment"


@dataclass(frozen=True)
class CredentialField:
    """Descreve um campo de credencial para o formulário dinâmico da web."""

    key: str
    label: str
    secret: bool = False
    required: bool = True
    placeholder: str = ""
    help_text: str = ""
    default: Any = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "key": self.key,
            "label": self.label,
            "secret": self.secret,
            "required": self.required,
            "placeholder": self.placeholder,
            "help_text": self.help_text,
            "default": self.default,
        }


@dataclass
class IntegrationStatus:
    """Estado corrente de uma integração."""

    key: str
    kind: str
    name: str
    description: str
    configured: bool = False
    enabled: bool = False
    running: bool = False
    detail: str = ""
    last_error: str = ""
    extra: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "key": self.key,
            "kind": self.kind,
            "name": self.name,
            "description": self.description,
            "configured": self.configured,
            "enabled": self.enabled,
            "running": self.running,
            "detail": self.detail,
            "last_error": self.last_error,
            "extra": self.extra,
        }


class IIntegration(ABC):
    """Contrato de uma integração externa."""

    @property
    @abstractmethod
    def key(self) -> str:
        """Identificador estável usado nas rotas e no credentials.json."""

    @property
    @abstractmethod
    def kind(self) -> IntegrationKind: ...

    @property
    @abstractmethod
    def name(self) -> str: ...

    @property
    def description(self) -> str:
        return ""

    @property
    @abstractmethod
    def credential_fields(self) -> tuple[CredentialField, ...]:
        """Campos que a interface web deve pedir ao gestor."""

    @abstractmethod
    async def configure(self, credentials: dict[str, Any]) -> None:
        """Aplica credenciais ao componente concreto."""

    @abstractmethod
    async def enable(self) -> None: ...

    @abstractmethod
    async def disable(self) -> None: ...

    @abstractmethod
    async def test(self) -> dict[str, Any]:
        """Verifica a integração e devolve um diagnóstico legível."""

    @abstractmethod
    def status(self) -> IntegrationStatus: ...

    def describe(self) -> dict[str, Any]:
        return {
            "key": self.key,
            "kind": self.kind.value,
            "name": self.name,
            "description": self.description,
            "fields": [f.to_dict() for f in self.credential_fields],
        }


class BaseIntegration(IIntegration, ABC):
    """Comportamento comum: guarda credenciais e memoriza o último erro."""

    def __init__(self) -> None:
        self._credentials: dict[str, Any] = {}
        self._last_error: str = ""

    @property
    def credentials(self) -> dict[str, Any]:
        return dict(self._credentials)

    @property
    def last_error(self) -> str:
        return self._last_error

    def _remember(self, credentials: dict[str, Any]) -> None:
        """Mescla mantendo o valor anterior de segredos enviados em branco."""
        merged = dict(self._credentials)
        for field_spec in self.credential_fields:
            value = credentials.get(field_spec.key)
            if value in (None, "") and field_spec.secret:
                continue
            if value is not None:
                merged[field_spec.key] = value
        self._credentials = merged

    def masked_credentials(self) -> dict[str, Any]:
        """Versão segura para exibir na interface (segredos mascarados)."""
        result: dict[str, Any] = {}
        for field_spec in self.credential_fields:
            value = self._credentials.get(field_spec.key, field_spec.default)
            if field_spec.secret and isinstance(value, str) and value:
                value = f"{value[:6]}…{value[-4:]}" if len(value) > 12 else "•" * len(value)
            result[field_spec.key] = value
        return result

    def is_configured(self) -> bool:
        return all(
            bool(self._credentials.get(f.key))
            for f in self.credential_fields
            if f.required
        )
