"""Gerenciador (registry + factory) dos canais de atendimento."""
from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from typing import Any, Iterator, Optional

from ..core.exceptions import NotFoundError
from ..core.interfaces import IMessagingChannel

logger = logging.getLogger(__name__)


class IChannelManager(ABC):
    """Roteia mensagens de saída para o canal de origem da conversa."""

    @abstractmethod
    def register(self, channel: IMessagingChannel) -> "IChannelManager": ...

    @abstractmethod
    def get(self, channel_type: str) -> IMessagingChannel: ...

    @abstractmethod
    def find(self, channel_type: str) -> Optional[IMessagingChannel]: ...

    @abstractmethod
    async def send(self, channel_type: str, external_id: str, text: str) -> bool: ...

    @abstractmethod
    async def send_document(
        self,
        channel_type: str,
        external_id: str,
        filename: str,
        data: bytes,
        content_type: str = "text/plain",
        caption: str = "",
    ) -> bool: ...

    @abstractmethod
    async def start(self, channel_type: str) -> None: ...

    @abstractmethod
    async def stop(self, channel_type: str) -> None: ...

    @abstractmethod
    async def stop_all(self) -> None: ...

    @abstractmethod
    def status(self) -> list[dict[str, Any]]: ...


class ChannelManager(IChannelManager):
    """Mantém os canais registrados e roteia envios por tipo de canal.

    Adicionar um canal novo (ex.: Instagram) é registrar outra implementação
    de `IMessagingChannel` — nada mais no sistema muda (OCP).
    """

    def __init__(self) -> None:
        self._channels: dict[str, IMessagingChannel] = {}

    def register(self, channel: IMessagingChannel) -> "ChannelManager":
        self._channels[channel.channel_type] = channel
        return self

    def get(self, channel_type: str) -> IMessagingChannel:
        channel = self._channels.get(channel_type)
        if channel is None:
            raise NotFoundError(f"Canal '{channel_type}' não registrado.")
        return channel

    def find(self, channel_type: str) -> Optional[IMessagingChannel]:
        return self._channels.get(channel_type)

    async def send(self, channel_type: str, external_id: str, text: str) -> bool:
        channel = self.find(channel_type)
        if channel is None or not channel.is_running:
            return False
        return await channel.send(external_id, text)

    async def send_document(
        self,
        channel_type: str,
        external_id: str,
        filename: str,
        data: bytes,
        content_type: str = "text/plain",
        caption: str = "",
    ) -> bool:
        channel = self.find(channel_type)
        if channel is None or not channel.is_running:
            return False
        return await channel.send_document(external_id, filename, data, content_type, caption)

    async def start(self, channel_type: str) -> None:
        await self.get(channel_type).start()

    async def stop(self, channel_type: str) -> None:
        await self.get(channel_type).stop()

    async def stop_all(self) -> None:
        for channel in self._channels.values():
            try:
                await channel.stop()
            except Exception as exc:  # noqa: BLE001
                logger.warning("Erro ao parar canal %s: %s", channel.channel_type, exc)

    def status(self) -> list[dict[str, Any]]:
        return [
            channel.status()  # type: ignore[attr-defined]
            if hasattr(channel, "status")
            else {"channel": channel.channel_type, "running": channel.is_running}
            for channel in self._channels.values()
        ]

    def __iter__(self) -> Iterator[IMessagingChannel]:
        return iter(self._channels.values())
