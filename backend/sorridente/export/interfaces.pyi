"""Stub de tipos: contrato público de sorridente.export.interfaces."""
import abc
from ..core.models import ChatMessage as ChatMessage, Conversation as Conversation
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Sequence

@dataclass(frozen=True)
class ExportedFile:
    filename: str
    content_type: str
    data: bytes
    @property
    def size_kb(self) -> int: ...

class IConversationExporter(ABC, metaclass=abc.ABCMeta):
    @property
    @abstractmethod
    def format(self) -> str: ...
    @property
    @abstractmethod
    def content_type(self) -> str: ...
    @abstractmethod
    def export(self, conversation: Conversation, messages: Sequence[ChatMessage], clinic_name: str) -> ExportedFile: ...

class IExportService(ABC, metaclass=abc.ABCMeta):
    @abstractmethod
    def formats(self) -> list[str]: ...
    @abstractmethod
    async def export(self, conversation_id: str, export_format: str = 'txt') -> ExportedFile: ...
    @abstractmethod
    async def export_and_send(self, conversation_id: str, export_format: str = 'txt') -> dict[str, object]: ...
