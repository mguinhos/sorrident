"""Nível de raciocínio (thinking) do provedor OpenCode Go."""
from __future__ import annotations

import json
from typing import Any

import httpx
import pytest
from openai import AsyncOpenAI

from sorridente.config import AppConfig
from sorridente.infrastructure.llm import OpenCodeGoLLMProvider


def _make_provider(reasoning_effort: str | None) -> tuple[OpenCodeGoLLMProvider, list[dict[str, Any]]]:
    requests: list[dict[str, Any]] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(json.loads(request.content))
        return httpx.Response(
            200,
            json={
                "id": "chatcmpl-teste",
                "object": "chat.completion",
                "created": 0,
                "model": "kimi-k2.5",
                "choices": [
                    {
                        "index": 0,
                        "message": {"role": "assistant", "content": "ok"},
                        "finish_reason": "stop",
                    }
                ],
            },
        )

    provider = OpenCodeGoLLMProvider(api_key="teste", reasoning_effort=reasoning_effort)
    provider._client = AsyncOpenAI(  # noqa: SLF001 - injeção de transporte para o teste
        api_key="teste",
        base_url="https://exemplo.invalid/v1",
        http_client=httpx.AsyncClient(transport=httpx.MockTransport(handler)),
    )
    return provider, requests


@pytest.mark.asyncio
async def test_complete_envia_reasoning_effort() -> None:
    provider, requests = _make_provider("medium")

    await provider.complete([{"role": "user", "content": "oi"}])

    assert requests[0]["reasoning_effort"] == "medium"


@pytest.mark.asyncio
async def test_reasoning_off_nao_envia_parametro() -> None:
    provider, requests = _make_provider("off")

    await provider.complete([{"role": "user", "content": "oi"}])

    assert "reasoning_effort" not in requests[0]
    assert provider.reasoning_effort is None


@pytest.mark.asyncio
async def test_configure_atualiza_reasoning_effort() -> None:
    provider, _ = _make_provider("low")

    provider.configure("teste", reasoning_effort="high")
    assert provider.reasoning_effort == "high"

    provider.configure("teste", reasoning_effort="desligado")
    assert provider.reasoning_effort is None


def test_config_usa_env_para_reasoning_effort(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OPENCODE_GO_REASONING_EFFORT", "high")
    assert AppConfig.from_env().opencode_go_reasoning_effort == "high"

    monkeypatch.delenv("OPENCODE_GO_REASONING_EFFORT")
    assert AppConfig.from_env().opencode_go_reasoning_effort == "low"
