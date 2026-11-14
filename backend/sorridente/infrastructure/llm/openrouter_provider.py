"""Provedor de LLM baseado no OpenRouter (API compatível com OpenAI)."""
from __future__ import annotations

import os
import uuid
from typing import Any, AsyncIterator, Optional, Sequence, cast

from openai import AsyncOpenAI

from ...core.exceptions import LLMError
from ...core.interfaces import ILLMProvider

# Endpoint do OpenRouter (compatível com OpenAI).
BASE_URL = os.environ.get("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")

# Identificador de sessão para roteamento/cache (quando suportado).
_SESSION_ID = os.environ.get("OPENROUTER_SESSION_ID", str(uuid.uuid4()))
DEFAULT_MODEL = os.environ.get("OPENROUTER_MODEL", "openai/gpt-4o-mini")
DEFAULT_REASONING_EFFORT = os.environ.get("OPENROUTER_REASONING_EFFORT", "low")

# Valores que significam "não enviar reasoning_effort" (raciocínio desligado).
_REASONING_DISABLED = {"", "off", "none", "disabled", "desligado"}


def _normalize_reasoning_effort(value: Optional[str]) -> Optional[str]:
    """Normaliza o nível de raciocínio; devolve `None` para desligá-lo."""
    if value is None:
        return None
    normalized = value.strip().lower()
    return None if normalized in _REASONING_DISABLED else normalized


class OpenRouterLLMProvider(ILLMProvider):
    """Implementação de ILLMProvider usando `openai.AsyncOpenAI` contra o OpenRouter."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: str = DEFAULT_MODEL,
        timeout: float = 60.0,
        reasoning_effort: Optional[str] = DEFAULT_REASONING_EFFORT,
        base_url: Optional[str] = None,
        api_key_env: str = "OPENROUTER_API_KEY",
    ) -> None:
        if api_key is None:
            api_key = os.environ.get(api_key_env, "")
        self._api_key = api_key or ""
        self._model = model
        self._timeout = timeout
        self._reasoning_effort = _normalize_reasoning_effort(reasoning_effort)
        self._base_url = base_url or BASE_URL
        self._client: Optional[AsyncOpenAI] = None

    @property
    def model(self) -> str:
        return self._model

    @property
    def reasoning_effort(self) -> Optional[str]:
        """Nível de raciocínio enviado ao provedor (`None` = não envia)."""
        return self._reasoning_effort

    @property
    def configured(self) -> bool:
        return bool(self._api_key)

    def configure(
        self,
        api_key: str,
        model: Optional[str] = None,
        reasoning_effort: Optional[str] = None,
        base_url: Optional[str] = None,
    ) -> None:
        """Reconfigura o provedor em tempo de execução (via interface web)."""
        if api_key and api_key != self._api_key:
            self._api_key = api_key
            self._client = None
        if model:
            self._model = model
        if reasoning_effort is not None:
            self._reasoning_effort = _normalize_reasoning_effort(reasoning_effort)
        if base_url:
            self._base_url = base_url
            self._client = None

    def _reasoning_kwargs(self) -> dict[str, Any]:
        """Parâmetro opcional de raciocínio para a API compatível com OpenAI."""
        if not self._reasoning_effort:
            return {}
        return {"reasoning_effort": self._reasoning_effort}

    @property
    def client(self) -> AsyncOpenAI:
        if not self._api_key:
            raise LLMError(
                "OPENROUTER_API_KEY não configurada. Defina a variável de ambiente "
                "ou salve a credencial pela interface web."
            )
        if self._client is None:
            self._client = AsyncOpenAI(
                api_key=self._api_key,
                base_url=self._base_url,
                timeout=self._timeout,
                default_headers={
                    "HTTP-Referer": os.environ.get("OPENROUTER_HTTP_REFERER", "https://sorridente.local"),
                    "X-Title": os.environ.get("OPENROUTER_APP_TITLE", "SorriDente"),
                },
            )
        return self._client

    async def complete(
        self,
        messages: Sequence[dict[str, Any]],
        tools: Optional[Sequence[dict[str, Any]]] = None,
        temperature: float = 0.3,
        max_tokens: int = 512,
    ) -> dict[str, Any]:
        kwargs: dict[str, Any] = {
            "model": self._model,
            "messages": cast(Any, list(messages)),
            "temperature": temperature,
            "max_tokens": max_tokens,
            **self._reasoning_kwargs(),
        }
        if tools:
            kwargs["tools"] = list(tools)
            kwargs["tool_choice"] = "auto"
        try:
            response = await self.client.chat.completions.create(**kwargs)
        except Exception as exc:  # noqa: BLE001 - erro do SDK vira erro de domínio
            raise LLMError(f"Falha ao consultar o OpenRouter: {exc}") from exc

        message = response.choices[0].message
        tool_calls = []
        for call in (message.tool_calls or []):
            entry = {
                "id": call.id,
                "type": "function",
                "function": {
                    "name": call.function.name,
                    "arguments": call.function.arguments,
                },
            }
            extra = getattr(call, "extra_content", None)
            if extra:
                entry["extra_content"] = extra
            tool_calls.append(entry)
        return {
            "role": "assistant",
            "content": self._clean(message.content or ""),
            "tool_calls": tool_calls,
        }

    async def stream(
        self,
        messages: Sequence[dict[str, Any]],
        temperature: float = 0.3,
        max_tokens: int = 512,
    ) -> AsyncIterator[str]:
        try:
            stream = await self.client.chat.completions.create(
                model=self._model,
                messages=cast(Any, list(messages)),
                temperature=temperature,
                max_tokens=max_tokens,
                stream=True,
                **self._reasoning_kwargs(),
            )
            async for chunk in cast(Any, stream):
                delta = chunk.choices[0].delta.content
                if delta:
                    yield delta
        except LLMError:
            raise
        except Exception as exc:  # noqa: BLE001
            raise LLMError(f"Falha no streaming do OpenRouter: {exc}") from exc

    @staticmethod
    def _clean(text: str) -> str:
        """Remove blocos <think>...</think> emitidos por modelos de raciocínio."""
        import re

        text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL)
        return text.strip()
