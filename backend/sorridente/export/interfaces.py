"""Contratos de exportação de conversas."""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Sequence

from ..core.models import ChatMessage, Conversation


@dataclass(frozen=True)
class ExportedFile:
    """Arquivo pronto para download ou envio por um canal."""

    filename: str
    content_type: str
    data: bytes

    @property
    def size_kb(self) -> int:
        return max(1, len(self.data) // 1024)


class IConversationExporter(ABC):
    """Serializa uma conversa em um formato de arquivo."""

    @property
    @abstractmethod
    def format(self) -> str:
        """Identificador usado na API e pelo agente (txt, md, html)."""

    @property
    @abstractmethod
    def content_type(self) -> str: ...

    @abstractmethod
    def export(
        self, conversation: Conversation, messages: Sequence[ChatMessage], clinic_name: str
    ) -> ExportedFile: ...


class IExportService(ABC):
    """Casos de uso de exportação."""

    @abstractmethod
    def formats(self) -> list[str]: ...

    @abstractmethod
    async def export(self, conversation_id: str, export_format: str = "txt") -> ExportedFile: ...

    @abstractmethod
    async def export_and_send(self, conversation_id: str, export_format: str = "txt") -> dict[str, object]:
        """Exporta e entrega o arquivo pelo canal de origem da conversa."""
