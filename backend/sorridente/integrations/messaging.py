"""Integrações do tipo canal de mensageria (Telegram, WhatsApp)."""
from __future__ import annotations

from abc import ABC
from typing import Any

from ..channels.telegram import TelegramChannel
from ..channels.whatsapp import WhatsAppChannel
from ..core.exceptions import SorriDenteError
from .base import BaseIntegration, CredentialField, IntegrationKind, IntegrationStatus


class BaseChannelIntegration(BaseIntegration, ABC):
    """Integração que liga/desliga um `IMessagingChannel`."""

    @property
    def kind(self) -> IntegrationKind:
        return IntegrationKind.MESSAGING_CHANNEL


class TelegramIntegration(BaseChannelIntegration):
    """Bot do Telegram do SorriDente."""

    KEY = "telegram"

    def __init__(self, channel: TelegramChannel) -> None:
        super().__init__()
        self._channel = channel

    @property
    def key(self) -> str:
        return self.KEY

    @property
    def name(self) -> str:
        return "Telegram"

    @property
    def description(self) -> str:
        return "Bot de atendimento e agendamento no Telegram."

    @property
    def credential_fields(self) -> tuple[CredentialField, ...]:
        return (
            CredentialField(
                key="bot_token",
                label="Token do bot",
                secret=True,
                placeholder="123456:ABC-DEF…",
                help_text="Obtido com o @BotFather no Telegram.",
            ),
            CredentialField(
                key="bot_username",
                label="Usuário do bot",
                required=False,
                placeholder="sorrident",
            ),
            CredentialField(
                key="autostart",
                label="Iniciar automaticamente",
                required=False,
                default=True,
            ),
        )

    async def configure(self, credentials: dict[str, Any]) -> None:
        self._remember(credentials)
        self._channel.set_token(self._credentials.get("bot_token", ""))

    async def enable(self) -> None:
        try:
            await self._channel.start()
            self._last_error = ""
        except SorriDenteError as exc:
            self._last_error = exc.message
            raise

    async def disable(self) -> None:
        await self._channel.stop()

    async def test(self) -> dict[str, Any]:
        status = self._channel.status()
        if status["running"]:
            return {"ok": True, "bot": f"@{status['bot_username']}"}
        try:
            await self.enable()
            return {"ok": True, "bot": f"@{self._channel.bot_username}"}
        except SorriDenteError as exc:
            return {"ok": False, "erro": exc.message}

    def is_configured(self) -> bool:
        return bool(self._credentials.get("bot_token"))

    def status(self) -> IntegrationStatus:
        channel_status = self._channel.status()
        return IntegrationStatus(
            key=self.key,
            kind=self.kind.value,
            name=self.name,
            description=self.description,
            configured=self.is_configured(),
            enabled=bool(self._credentials.get("autostart", True)),
            running=channel_status["running"],
            detail=f"@{channel_status['bot_username']}" if channel_status["bot_username"] else "",
            last_error=self._last_error or channel_status["last_error"],
            extra={"credentials": self.masked_credentials()},
        )


class WhatsAppIntegration(BaseChannelIntegration):
    """WhatsApp Cloud API (recebe por webhook)."""

    KEY = "whatsapp"

    def __init__(self, channel: WhatsAppChannel) -> None:
        super().__init__()
        self._channel = channel

    @property
    def key(self) -> str:
        return self.KEY

    @property
    def name(self) -> str:
        return "WhatsApp"

    @property
    def description(self) -> str:
        return "Atendimento pelo WhatsApp via Cloud API (webhook em /api/integrations/webhooks/whatsapp)."

    @property
    def credential_fields(self) -> tuple[CredentialField, ...]:
        return (
            CredentialField(key="token", label="Token de acesso", secret=True),
            CredentialField(key="phone_number_id", label="Phone Number ID"),
            CredentialField(
                key="verify_token",
                label="Verify token do webhook",
                required=False,
                default="sorridente-webhook",
            ),
        )

    async def configure(self, credentials: dict[str, Any]) -> None:
        self._remember(credentials)
        self._channel.configure(
            self._credentials.get("token", ""),
            self._credentials.get("phone_number_id", ""),
            self._credentials.get("verify_token", ""),
        )

    async def enable(self) -> None:
        await self._channel.start()

    async def disable(self) -> None:
        await self._channel.stop()

    async def test(self) -> dict[str, Any]:
        if not self.is_configured():
            return {"ok": False, "erro": "Credenciais do WhatsApp incompletas."}
        return {"ok": True, "phone_number_id": self._credentials.get("phone_number_id", "")}

    def is_configured(self) -> bool:
        return bool(self._credentials.get("token") and self._credentials.get("phone_number_id"))

    def status(self) -> IntegrationStatus:
        channel_status = self._channel.status()
        return IntegrationStatus(
            key=self.key,
            kind=self.kind.value,
            name=self.name,
            description=self.description,
            configured=self.is_configured(),
            enabled=self.is_configured(),
            running=channel_status["running"],
            detail=channel_status["phone_number_id"],
            last_error=self._last_error,
            extra={"credentials": self.masked_credentials()},
        )
