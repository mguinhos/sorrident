"""Canal Telegram: bot SorriDente com long polling assíncrono (httpx)."""
from __future__ import annotations

import asyncio
import logging
from typing import Any, Optional

import httpx

from ..core.exceptions import CredentialsNotConfiguredError
from ..core.models import ChannelType
from .base import BaseChannel, InboundMessage, MessageDispatcher

logger = logging.getLogger(__name__)

API_BASE = "https://api.telegram.org"


class TelegramClient:
    """Cliente HTTP fino para a Bot API (SRP: só fala HTTP)."""

    def __init__(self, token: str, timeout: float = 65.0) -> None:
        self._token = token
        self._client = httpx.AsyncClient(base_url=f"{API_BASE}/bot{token}", timeout=timeout)

    async def close(self) -> None:
        await self._client.aclose()

    async def call(self, method: str, **payload: Any) -> dict[str, Any]:
        response = await self._client.post(f"/{method}", json=payload)
        response.raise_for_status()
        data: dict[str, Any] = response.json()
        if not data.get("ok"):
            raise RuntimeError(f"Telegram respondeu erro em {method}: {data.get('description')}")
        return data.get("result", {})

    async def get_me(self) -> dict[str, Any]:
        return await self.call("getMe")

    async def get_updates(self, offset: int, timeout: int = 45) -> list[dict[str, Any]]:
        result = await self._client.post(
            "/getUpdates",
            json={"offset": offset, "timeout": timeout, "allowed_updates": ["message"]},
        )
        result.raise_for_status()
        data = result.json()
        return data.get("result", []) if data.get("ok") else []

    async def send_message(self, chat_id: str, text: str) -> dict[str, Any]:
        return await self.call("sendMessage", chat_id=chat_id, text=text, parse_mode="HTML")

    async def send_document(
        self, chat_id: str, filename: str, data: bytes, content_type: str, caption: str = ""
    ) -> dict[str, Any]:
        """Envia um arquivo (multipart), usado na exportação da conversa."""
        response = await self._client.post(
            "/sendDocument",
            data={"chat_id": chat_id, "caption": caption[:1024]},
            files={"document": (filename, data, content_type.split(";")[0])},
        )
        response.raise_for_status()
        payload: dict[str, Any] = response.json()
        if not payload.get("ok"):
            raise RuntimeError(f"Telegram recusou o arquivo: {payload.get('description')}")
        return payload.get("result", {})

    async def send_chat_action(self, chat_id: str, action: str = "typing") -> None:
        try:
            await self.call("sendChatAction", chat_id=chat_id, action=action)
        except Exception:  # noqa: BLE001 - indicador de digitação é best-effort
            pass


class TelegramChannel(BaseChannel):
    """Bot do Telegram do SorriDente, com start/stop em tempo de execução."""

    WELCOME = (
        "Olá! Eu sou o <b>SorriDente</b>, da Clínica Ortodôntica SorriDente. 🦷\n\n"
        "Cuido dos agendamentos e das dúvidas dos pacientes por aqui.\n"
        "<b>Quer marcar uma consulta?</b> É só me dizer que eu já começo o seu atendimento."
    )

    def __init__(self, dispatcher: MessageDispatcher, token: str = "") -> None:
        super().__init__(dispatcher)
        self._token = token
        self._client: Optional[TelegramClient] = None
        self._task: Optional[asyncio.Task[None]] = None
        self._offset = 0
        self._bot_username = ""
        self._last_error = ""

    @property
    def channel_type(self) -> str:
        return ChannelType.TELEGRAM.value

    @property
    def bot_username(self) -> str:
        return self._bot_username

    @property
    def last_error(self) -> str:
        return self._last_error

    def set_token(self, token: str) -> None:
        self._token = (token or "").strip()

    def status(self) -> dict[str, Any]:
        return {
            "channel": self.channel_type,
            "running": self.is_running,
            "configured": bool(self._token),
            "bot_username": self._bot_username,
            "last_error": self._last_error,
        }

    async def start(self) -> None:
        if self._running:
            return
        if not self._token:
            raise CredentialsNotConfiguredError(
                "Token do bot do Telegram não configurado. Salve-o na aba Integrações."
            )
        self._client = TelegramClient(self._token)
        try:
            me = await self._client.get_me()
            self._bot_username = me.get("username", "")
            self._last_error = ""
        except Exception as exc:  # noqa: BLE001
            await self._client.close()
            self._client = None
            self._last_error = str(exc)
            raise CredentialsNotConfiguredError(f"Token do Telegram inválido: {exc}") from exc

        self._running = True
        self._task = asyncio.create_task(self._poll_loop(), name="telegram-polling")
        logger.info("Bot do Telegram @%s iniciado.", self._bot_username)

    async def stop(self) -> None:
        self._running = False
        if self._task is not None:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None
        if self._client is not None:
            await self._client.close()
            self._client = None
        logger.info("Bot do Telegram parado.")

    async def send(self, external_id: str, text: str) -> bool:
        if self._client is None:
            return False
        try:
            await self._client.send_message(external_id, text)
            return True
        except Exception as exc:  # noqa: BLE001
            logger.warning("Falha ao enviar mensagem no Telegram: %s", exc)
            return False

    async def send_document(
        self,
        external_id: str,
        filename: str,
        data: bytes,
        content_type: str = "text/plain",
        caption: str = "",
    ) -> bool:
        if self._client is None:
            return False
        try:
            await self._client.send_document(external_id, filename, data, content_type, caption)
            return True
        except Exception as exc:  # noqa: BLE001
            logger.warning("Falha ao enviar arquivo no Telegram: %s", exc)
            return False

    async def _poll_loop(self) -> None:
        backoff = 1.0
        while self._running and self._client is not None:
            try:
                updates = await self._client.get_updates(self._offset)
                backoff = 1.0
                for update in updates:
                    self._offset = max(self._offset, update.get("update_id", 0) + 1)
                    asyncio.create_task(self._handle_update(update))
            except asyncio.CancelledError:
                raise
            except Exception as exc:  # noqa: BLE001
                self._last_error = str(exc)
                logger.warning("Erro no polling do Telegram: %s (retry em %.0fs)", exc, backoff)
                await asyncio.sleep(backoff)
                backoff = min(backoff * 2, 60.0)

    async def _handle_update(self, update: dict[str, Any]) -> None:
        message = update.get("message") or {}
        text: str = (message.get("text") or "").strip()
        chat = message.get("chat") or {}
        chat_id = str(chat.get("id", ""))
        if not text or not chat_id or self._client is None:
            return

        sender = message.get("from") or {}
        display_name = " ".join(
            part for part in (sender.get("first_name"), sender.get("last_name")) if part
        ) or sender.get("username", "Contato")

        if text.startswith("/start"):
            await self._client.send_message(chat_id, self.WELCOME)
            return
        if text.startswith("/ajuda") or text.startswith("/help"):
            await self._client.send_message(
                chat_id,
                "Posso <b>marcar</b>, <b>remarcar</b> e <b>cancelar</b> consultas, além de "
                "responder dúvidas sobre tratamento, valores e convênios.\n"
                "Escreva naturalmente — por exemplo: <i>quero marcar uma avaliação</i>. 🙂",
            )
            return

        await self._client.send_chat_action(chat_id)
        answer = await self.process(
            InboundMessage(self.channel_type, chat_id, text, display_name)
        )
        if answer:
            await self._client.send_message(chat_id, answer)
