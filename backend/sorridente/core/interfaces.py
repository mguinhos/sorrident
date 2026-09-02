"""Contratos abstratos (ABCs) do SorriDente.

Toda camada de infraestrutura implementa uma destas interfaces; a camada de
domínio depende exclusivamente delas (inversão de dependência).
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, AsyncIterator, Generic, Optional, Sequence, TypeVar

from .models import Entity

T = TypeVar("T", bound=Entity)


# Persistência
class IDatabase(ABC):
    """Abstração do banco de dados (implementada por TinyDB)."""

    @abstractmethod
    async def connect(self) -> None: ...

    @abstractmethod
    async def disconnect(self) -> None: ...

    @abstractmethod
    async def insert(self, table: str, document: dict[str, Any]) -> dict[str, Any]: ...

    @abstractmethod
    async def update(self, table: str, doc_id: str, document: dict[str, Any]) -> dict[str, Any]: ...

    @abstractmethod
    async def delete(self, table: str, doc_id: str) -> bool: ...

    @abstractmethod
    async def get(self, table: str, doc_id: str) -> Optional[dict[str, Any]]: ...

    @abstractmethod
    async def find(self, table: str, filters: Optional[dict[str, Any]] = None) -> list[dict[str, Any]]: ...

    @abstractmethod
    async def all(self, table: str) -> list[dict[str, Any]]: ...

    @abstractmethod
    async def count(self, table: str, filters: Optional[dict[str, Any]] = None) -> int: ...


class IRepository(ABC, Generic[T]):
    """Repositório genérico tipado por entidade."""

    @property
    @abstractmethod
    def table_name(self) -> str: ...

    @abstractmethod
    async def add(self, entity: T) -> T: ...

    @abstractmethod
    async def update(self, entity: T) -> T: ...

    @abstractmethod
    async def remove(self, entity_id: str) -> bool: ...

    @abstractmethod
    async def get(self, entity_id: str) -> Optional[T]: ...

    @abstractmethod
    async def list(self, filters: Optional[dict[str, Any]] = None) -> list[T]: ...


class ICredentialStore(ABC):
    """Armazenamento de credenciais (credentials.json)."""

    @abstractmethod
    async def get(self, key: str, default: Any = None) -> Any: ...

    @abstractmethod
    async def set(self, key: str, value: Any) -> None: ...

    @abstractmethod
    async def all(self) -> dict[str, Any]: ...

    @abstractmethod
    async def delete(self, key: str) -> None: ...


# LLM
class ILLMProvider(ABC):
    """Provedor de modelo de linguagem."""

    @property
    @abstractmethod
    def model(self) -> str: ...

    @abstractmethod
    async def complete(
        self,
        messages: Sequence[dict[str, Any]],
        tools: Optional[Sequence[dict[str, Any]]] = None,
        temperature: float = 0.3,
        max_tokens: int = 1024,
    ) -> dict[str, Any]:
        """Retorna a mensagem do assistente no formato OpenAI/Groq."""

    @abstractmethod
    def stream(
        self,
        messages: Sequence[dict[str, Any]],
        temperature: float = 0.3,
        max_tokens: int = 1024,
    ) -> AsyncIterator[str]:
        """Async generator com os fragmentos da resposta."""


class ITool(ABC):
    """Ferramenta que o agente pode executar (function calling)."""

    @property
    @abstractmethod
    def name(self) -> str: ...

    @property
    @abstractmethod
    def description(self) -> str: ...

    @property
    @abstractmethod
    def parameters(self) -> dict[str, Any]:
        """JSON Schema dos argumentos."""

    @abstractmethod
    async def execute(self, context: "AgentContext", **kwargs: Any) -> Any: ...

    def to_schema(self) -> dict[str, Any]:
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.parameters,
            },
        }


class IAgent(ABC):
    """Agente conversacional."""

    @abstractmethod
    async def reply(self, context: "AgentContext", user_message: str) -> str: ...


class AgentContext:
    """Contexto de execução de uma conversa (canal, contato, conversa)."""

    def __init__(
        self,
        conversation_id: str,
        channel: str,
        external_id: str = "",
        patient_id: str = "",
        display_name: str = "Visitante",
        metadata: Optional[dict[str, Any]] = None,
    ) -> None:
        self.conversation_id = conversation_id
        self.channel = channel
        self.external_id = external_id
        self.patient_id = patient_id
        self.display_name = display_name
        self.metadata: dict[str, Any] = metadata or {}

    def to_dict(self) -> dict[str, Any]:
        return {
            "conversation_id": self.conversation_id,
            "channel": self.channel,
            "external_id": self.external_id,
            "patient_id": self.patient_id,
            "display_name": self.display_name,
            "metadata": self.metadata,
        }


# Canais de mensageria
class IMessagingChannel(ABC):
    """Canal de mensageria (Telegram, WhatsApp, Web)."""

    @property
    @abstractmethod
    def channel_type(self) -> str: ...

    @property
    @abstractmethod
    def is_running(self) -> bool: ...

    @abstractmethod
    async def start(self) -> None: ...

    @abstractmethod
    async def stop(self) -> None: ...

    @abstractmethod
    async def send(self, external_id: str, text: str) -> bool: ...

    @abstractmethod
    async def send_document(
        self,
        external_id: str,
        filename: str,
        data: bytes,
        content_type: str = "text/plain",
        caption: str = "",
    ) -> bool:
        """Envia um arquivo pelo canal. Devolve False se o canal não suportar."""


class IEventBus(ABC):
    """Barramento de eventos internos (notificações em tempo real)."""

    @abstractmethod
    async def publish(self, event: str, payload: dict[str, Any]) -> None: ...

    @abstractmethod
    def subscribe(self) -> Any: ...

    @abstractmethod
    def unsubscribe(self, queue: Any) -> None: ...
