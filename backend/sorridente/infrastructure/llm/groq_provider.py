"""Provedor de LLM baseado no Groq Cloud (AsyncGroq)."""
from __future__ import annotations

import os
from typing import Any, AsyncIterator, Optional, Sequence, cast

from groq import AsyncGroq

from ...core.exceptions import LLMError
from ...core.interfaces import ILLMProvider

DEFAULT_MODEL = os.environ.get("GROQ_MODEL", "qwen/qwen3.8-27b")


class GroqLLMProvider(ILLMProvider):
    """Implementação de ILLMProvider usando `groq.AsyncGroq`."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: str = DEFAULT_MODEL,
        timeout: float = 60.0,
    ) -> None:
        self._api_key = api_key or os.environ.get("GROQ_CLOUD_API_KEY", "")
        self._model = model
        self._timeout = timeout
        self._client: Optional[AsyncGroq] = None

    @property
    def model(self) -> str:
        return self._model

    @property
    def configured(self) -> bool:
        return bool(self._api_key)

    def configure(self, api_key: str, model: Optional[str] = None) -> None:
        """Reconfigura o provedor em tempo de execução (via interface web)."""
        if api_key and api_key != self._api_key:
            self._api_key = api_key
            self._client = None
        if model:
            self._model = model

    @property
    def client(self) -> AsyncGroq:
        if not self._api_key:
            raise LLMError(
                "GROQ_CLOUD_API_KEY não configurada. Defina a variável de ambiente "
                "ou salve a credencial pela interface web."
            )
        if self._client is None:
            self._client = AsyncGroq(api_key=self._api_key, timeout=self._timeout)
        return self._client

    async def complete(
        self,
        messages: Sequence[dict[str, Any]],
        tools: Optional[Sequence[dict[str, Any]]] = None,
        temperature: float = 0.3,
        max_tokens: int = 1024,
    ) -> dict[str, Any]:
        kwargs: dict[str, Any] = {
            "model": self._model,
            "messages": cast(Any, list(messages)),
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if tools:
            kwargs["tools"] = list(tools)
            kwargs["tool_choice"] = "auto"
        try:
            response = await self.client.chat.completions.create(**kwargs)
        except Exception as exc:  # noqa: BLE001 - erro do SDK vira erro de domínio
            raise LLMError(f"Falha ao consultar o Groq Cloud: {exc}") from exc

        message = response.choices[0].message
        return {
            "role": "assistant",
            "content": self._clean(message.content or ""),
            "tool_calls": [
                {
                    "id": call.id,
                    "type": "function",
                    "function": {
                        "name": call.function.name,
                        "arguments": call.function.arguments,
                    },
                }
                for call in (message.tool_calls or [])
            ],
        }

    async def stream(
        self,
        messages: Sequence[dict[str, Any]],
        temperature: float = 0.3,
        max_tokens: int = 1024,
    ) -> AsyncIterator[str]:
        try:
            stream = await self.client.chat.completions.create(
                model=self._model,
                messages=cast(Any, list(messages)),
                temperature=temperature,
                max_tokens=max_tokens,
                stream=True,
            )
            async for chunk in cast(Any, stream):
                delta = chunk.choices[0].delta.content
                if delta:
                    yield delta
        except LLMError:
            raise
        except Exception as exc:  # noqa: BLE001
            raise LLMError(f"Falha no streaming do Groq Cloud: {exc}") from exc

    @staticmethod
    def _clean(text: str) -> str:
        """Remove blocos <think>...</think> emitidos por modelos de raciocínio."""
        import re

        text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL)
        return text.strip()
