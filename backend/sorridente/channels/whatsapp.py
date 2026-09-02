"""Canal WhatsApp (esqueleto pronto para Cloud API).

Mantido como implementação concreta de `BaseChannel` para que a adição do
WhatsApp não exija nenhuma alteração no agente, nos serviços ou na API.
"""
from __future__ import annotations

from typing import Any, Optional

import httpx

from ..core.exceptions import CredentialsNotConfiguredError
from ..core.models import ChannelType
from .base import BaseChannel, InboundMessage, MessageDispatcher


class WhatsAppChannel(BaseChannel):
    """Integração com a WhatsApp Cloud API via webhook."""

    def __init__(
        self,
        dispatcher: MessageDispatcher,
        token: str = "",
        phone_number_id: str = "",
        verify_token: str = "",
    ) -> None:
        super().__init__(dispatcher)
        self._token = token
        self._phone_number_id = phone_number_id
        self._verify_token = verify_token
        self._client: Optional[httpx.AsyncClient] = None

    @property
    def channel_type(self) -> str:
        return ChannelType.WHATSAPP.value

    @property
    def verify_token(self) -> str:
        return self._verify_token

    def configure(self, token: str, phone_number_id: str, verify_token: str = "") -> None:
        self._token = token
        self._phone_number_id = phone_number_id
        self._verify_token = verify_token or self._verify_token

    def status(self) -> dict[str, Any]:
        return {
            "channel": self.channel_type,
            "running": self.is_running,
            "configured": bool(self._token and self._phone_number_id),
            "phone_number_id": self._phone_number_id,
        }

    async def start(self) -> None:
        if not (self._token and self._phone_number_id):
            raise CredentialsNotConfiguredError("Credenciais do WhatsApp não configuradas.")
        self._client = httpx.AsyncClient(
            base_url="https://graph.facebook.com/v20.0",
            headers={"Authorization": f"Bearer {self._token}"},
            timeout=30.0,
        )
        self._running = True

    async def stop(self) -> None:
        self._running = False
        if self._client is not None:
            await self._client.aclose()
            self._client = None

    async def send(self, external_id: str, text: str) -> bool:
        if self._client is None:
            return False
        response = await self._client.post(
            f"/{self._phone_number_id}/messages",
            json={
                "messaging_product": "whatsapp",
                "to": external_id,
                "type": "text",
                "text": {"body": text},
            },
        )
        return response.is_success

    async def handle_webhook(self, payload: dict[str, Any]) -> None:
        """Processa o payload do webhook da Cloud API."""
        for entry in payload.get("entry", []):
            for change in entry.get("changes", []):
                value = change.get("value", {})
                contacts = {c["wa_id"]: c.get("profile", {}).get("name", "") for c in value.get("contacts", [])}
                for message in value.get("messages", []):
                    if message.get("type") != "text":
                        continue
                    sender = message["from"]
                    answer = await self.process(
                        InboundMessage(
                            self.channel_type,
                            sender,
                            message["text"]["body"],
                            contacts.get(sender, "Contato"),
                        )
                    )
                    if answer:
                        await self.send(sender, answer)
