"""Serviço de exportação de conversas."""
from __future__ import annotations

import logging
from typing import Iterable, Optional

from ..channels.manager import IChannelManager
from ..core.exceptions import NotFoundError, ValidationError
from ..domain.services.interfaces import IConversationService, ISettingsService
from .interfaces import ExportedFile, IConversationExporter, IExportService

logger = logging.getLogger(__name__)


class ConversationExportService(IExportService):
    """Gera o arquivo da conversa e o entrega pelo canal de origem.

    Os formatos vêm de `IConversationExporter` registrados no construtor:
    acrescentar PDF ou CSV é registrar mais um exportador.
    """

    def __init__(
        self,
        conversations: IConversationService,
        settings: ISettingsService,
        channels: IChannelManager,
        exporters: Iterable[IConversationExporter],
    ) -> None:
        self._conversations = conversations
        self._settings = settings
        self._channels = channels
        self._exporters: dict[str, IConversationExporter] = {e.format: e for e in exporters}

    def formats(self) -> list[str]:
        return list(self._exporters)

    def _exporter(self, export_format: str) -> IConversationExporter:
        exporter = self._exporters.get((export_format or "txt").lower().lstrip("."))
        if exporter is None:
            raise ValidationError(
                f"Formato inválido. Disponíveis: {', '.join(sorted(self._exporters))}."
            )
        return exporter

    async def export(self, conversation_id: str, export_format: str = "txt") -> ExportedFile:
        conversation = await self._conversations.get(conversation_id)
        messages = await self._conversations.history(conversation_id, limit=1000)
        if not messages:
            raise NotFoundError("Esta conversa ainda não tem mensagens para exportar.")
        settings = await self._settings.get()
        return self._exporter(export_format).export(conversation, messages, settings.clinic_name)

    async def export_and_send(
        self, conversation_id: str, export_format: str = "txt"
    ) -> dict[str, object]:
        conversation = await self._conversations.get(conversation_id)
        arquivo = await self.export(conversation_id, export_format)
        entregue = await self._channels.send_document(
            conversation.channel,
            conversation.external_id,
            arquivo.filename,
            arquivo.data,
            arquivo.content_type,
            caption="Aqui está a cópia da nossa conversa. 🦷",
        )
        return {
            "arquivo": arquivo.filename,
            "formato": export_format,
            "tamanho_kb": arquivo.size_kb,
            "entregue_no_chat": entregue,
        }
