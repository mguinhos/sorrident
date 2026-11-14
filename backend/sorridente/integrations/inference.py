"""Integrações do tipo provedor de inferência (LLM).

O sistema nunca fala com um provedor concreto: fala com `RoutingLLMProvider`,
que delega ao provedor de inferência ativo no registro. Adicionar Ollama,
OpenRouter ou outro provedor é criar uma subclasse de
`BaseInferenceIntegration` e registrá-la — nada mais muda.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, AsyncIterator, Optional, Sequence

from ..core.exceptions import LLMError
from ..core.interfaces import ILLMProvider
from ..infrastructure.llm import OpenRouterLLMProvider
from .base import BaseIntegration, CredentialField, IntegrationKind, IntegrationStatus


class BaseInferenceIntegration(BaseIntegration, ABC):
    """Integração que fornece um `ILLMProvider` ao agente."""

    @property
    def kind(self) -> IntegrationKind:
        return IntegrationKind.INFERENCE_PROVIDER

    @property
    @abstractmethod
    def provider(self) -> ILLMProvider:
        """Provedor de LLM configurado por esta integração."""

    @property
    @abstractmethod
    def default_model(self) -> str: ...

    async def test(self) -> dict[str, Any]:
        try:
            answer = await self.provider.complete(
                [{"role": "user", "content": "Responda apenas: ok"}], max_tokens=16
            )
            return {"ok": True, "model": self.provider.model, "resposta": answer.get("content", "")}
        except LLMError as exc:
            self._last_error = exc.message
            return {"ok": False, "erro": exc.message}


class OpenRouterInferenceIntegration(BaseInferenceIntegration):
    """OpenRouter — inferência via `openai.AsyncOpenAI` na API do OpenRouter."""

    KEY = "openrouter"

    def __init__(self, provider: Optional[OpenRouterLLMProvider] = None, default_model: str = "openai/gpt-4o-mini") -> None:
        super().__init__()
        self._provider = provider or OpenRouterLLMProvider(model=default_model)
        self._default_model = default_model
        self._enabled = True

    @property
    def key(self) -> str:
        return self.KEY

    @property
    def name(self) -> str:
        return "OpenRouter"

    @property
    def description(self) -> str:
        return "Provedor de inferência do agente SorriDente via OpenRouter (modelos OpenAI, Anthropic, Meta e outros)."

    @property
    def default_model(self) -> str:
        return self._default_model

    @property
    def provider(self) -> ILLMProvider:
        return self._provider

    @property
    def credential_fields(self) -> tuple[CredentialField, ...]:
        return (
            CredentialField(
                key="api_key",
                label="API key do OpenRouter",
                secret=True,
                placeholder="sk-or-…",
                help_text="Também pode vir da variável de ambiente OPENROUTER_API_KEY.",
            ),
            CredentialField(
                key="model",
                label="Modelo",
                required=False,
                placeholder=self._default_model,
                default=self._default_model,
                help_text="Identificador do modelo no OpenRouter (ex.: openai/gpt-4o-mini).",
            ),
        )

    async def configure(self, credentials: dict[str, Any]) -> None:
        self._remember(credentials)
        self._provider.configure(
            self._credentials.get("api_key", ""),
            self._credentials.get("model") or None,
        )

    async def enable(self) -> None:
        self._enabled = True

    async def disable(self) -> None:
        self._enabled = False

    def is_configured(self) -> bool:
        return self._provider.configured

    def status(self) -> IntegrationStatus:
        return IntegrationStatus(
            key=self.key,
            kind=self.kind.value,
            name=self.name,
            description=self.description,
            configured=self.is_configured(),
            enabled=self._enabled,
            running=self._enabled and self.is_configured(),
            detail=f"Modelo: {self._provider.model}",
            last_error=self._last_error,
            extra={"model": self._provider.model, "credentials": self.masked_credentials()},
        )


class GeminiInferenceIntegration(BaseInferenceIntegration):
    """Google Gemini — inferência via endpoint compatível com OpenAI."""

    KEY = "gemini"

    GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/"

    def __init__(self, provider: Optional[OpenRouterLLMProvider] = None, default_model: str = "gemini-2.0-flash") -> None:
        super().__init__()
        self._provider = provider or OpenRouterLLMProvider(
            model=default_model, base_url=self.GEMINI_BASE_URL
        )
        self._default_model = default_model
        self._enabled = True

    @property
    def key(self) -> str:
        return self.KEY

    @property
    def name(self) -> str:
        return "Google Gemini"

    @property
    def description(self) -> str:
        return "Provedor de inferência do agente SorriDente via Google Gemini (API compatível com OpenAI)."

    @property
    def default_model(self) -> str:
        return self._default_model

    @property
    def provider(self) -> ILLMProvider:
        return self._provider

    @property
    def credential_fields(self) -> tuple[CredentialField, ...]:
        return (
            CredentialField(
                key="api_key",
                label="API key do Google Gemini",
                secret=True,
                placeholder="AIza…",
                help_text="Crie em https://aistudio.google.com/apikey. Também pode vir de GEMINI_API_KEY.",
            ),
            CredentialField(
                key="model",
                label="Modelo",
                required=False,
                placeholder=self._default_model,
                default=self._default_model,
                help_text="Ex.: gemini-2.0-flash, gemini-2.5-flash, gemini-2.5-pro.",
            ),
        )

    async def configure(self, credentials: dict[str, Any]) -> None:
        self._remember(credentials)
        self._provider.configure(
            self._credentials.get("api_key", ""),
            self._credentials.get("model") or None,
            base_url=self.GEMINI_BASE_URL,
        )

    async def enable(self) -> None:
        self._enabled = True

    async def disable(self) -> None:
        self._enabled = False

    def is_configured(self) -> bool:
        return self._provider.configured

    def status(self) -> IntegrationStatus:
        return IntegrationStatus(
            key=self.key,
            kind=self.kind.value,
            name=self.name,
            description=self.description,
            configured=self.is_configured(),
            enabled=self._enabled,
            running=self._enabled and self.is_configured(),
            detail=f"Modelo: {self._provider.model}",
            last_error=self._last_error,
            extra={"model": self._provider.model, "credentials": self.masked_credentials()},
        )


class RoutingLLMProvider(ILLMProvider):
    """Proxy que encaminha as chamadas ao provedor de inferência ativo.

    O agente depende deste objeto e não precisa saber qual provedor está
    configurado — trocar de Groq para Ollama é trocar a integração ativa.
    """

    def __init__(self, resolver: "InferenceResolver") -> None:
        self._resolver = resolver

    @property
    def model(self) -> str:
        provider = self._resolver.active_provider()
        return provider.model if provider else "(nenhum provedor ativo)"

    @property
    def configured(self) -> bool:
        integration = self._resolver.active_integration()
        return bool(integration and integration.is_configured())

    def _provider(self) -> ILLMProvider:
        provider = self._resolver.active_provider()
        if provider is None:
            raise LLMError(
                "Nenhum provedor de inferência ativo. Configure um na aba Integrações."
            )
        return provider

    async def complete(
        self,
        messages: Sequence[dict[str, Any]],
        tools: Optional[Sequence[dict[str, Any]]] = None,
        temperature: float = 0.3,
        max_tokens: int = 1024,
    ) -> dict[str, Any]:
        return await self._provider().complete(messages, tools, temperature, max_tokens)

    async def stream(
        self,
        messages: Sequence[dict[str, Any]],
        temperature: float = 0.3,
        max_tokens: int = 1024,
    ) -> AsyncIterator[str]:
        async for chunk in self._provider().stream(messages, temperature, max_tokens):
            yield chunk


class InferenceResolver(ABC):
    """Resolve qual integração de inferência está ativa."""

    @abstractmethod
    def active_integration(self) -> Optional[BaseInferenceIntegration]: ...

    def active_provider(self) -> Optional[ILLMProvider]:
        integration = self.active_integration()
        return integration.provider if integration else None
