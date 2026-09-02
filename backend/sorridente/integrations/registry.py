"""Registros de integrações.

Provedores de inferência e canais de mensageria são famílias distintas, com
regras próprias: só um provedor de inferência fica ativo por vez, enquanto
vários canais podem rodar simultaneamente. Cada família tem o seu registro, e
`IntegrationRegistry` compõe as duas para cuidar da descoberta e da
persistência das credenciais.
"""
from __future__ import annotations

import logging
from typing import Any, Generic, Iterator, Optional, TypeVar

from ..core.exceptions import NotFoundError, ValidationError
from ..core.interfaces import ICredentialStore
from .base import IIntegration, IntegrationKind
from .inference import BaseInferenceIntegration, InferenceResolver
from .messaging import BaseChannelIntegration

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=IIntegration)


class BaseIntegrationRegistry(Generic[T]):
    """Coleção de integrações de uma mesma família."""

    kind: IntegrationKind

    def __init__(self) -> None:
        self._items: dict[str, T] = {}

    def register(self, integration: T) -> "BaseIntegrationRegistry[T]":
        if integration.kind is not self.kind:
            raise ValidationError(
                f"'{integration.key}' é do tipo {integration.kind.value}; "
                f"este registro aceita apenas {self.kind.value}."
            )
        self._items[integration.key] = integration
        return self

    def get(self, key: str) -> T:
        integration = self._items.get(key)
        if integration is None:
            raise NotFoundError(f"Integração '{key}' não registrada em {self.kind.value}.")
        return integration

    def find(self, key: str) -> Optional[T]:
        return self._items.get(key)

    def keys(self) -> list[str]:
        return list(self._items)

    def __iter__(self) -> Iterator[T]:
        return iter(self._items.values())

    def __len__(self) -> int:
        return len(self._items)

    def __contains__(self, key: object) -> bool:
        return key in self._items


class InferenceRegistry(BaseIntegrationRegistry[BaseInferenceIntegration], InferenceResolver):
    """Provedores de inferência disponíveis e qual deles está ativo.

    Um provedor novo (Ollama, OpenRouter, …) entra aqui como mais uma
    `BaseInferenceIntegration`; o agente continua falando com o proxy.
    """

    kind = IntegrationKind.INFERENCE_PROVIDER

    def __init__(self) -> None:
        super().__init__()
        self._active_key: str = ""

    def register(  # type: ignore[override]
        self, integration: BaseInferenceIntegration, *, activate: bool = False
    ) -> "InferenceRegistry":
        super().register(integration)
        if activate or not self._active_key:
            self._active_key = integration.key
        return self

    @property
    def active_key(self) -> str:
        return self._active_key

    def active_integration(self) -> Optional[BaseInferenceIntegration]:
        return self._items.get(self._active_key)

    def activate(self, key: str) -> BaseInferenceIntegration:
        integration = self.get(key)
        self._active_key = key
        return integration


class MessagingRegistry(BaseIntegrationRegistry[BaseChannelIntegration]):
    """Canais de mensageria; vários podem estar ativos ao mesmo tempo."""

    kind = IntegrationKind.MESSAGING_CHANNEL

    async def start_enabled(self) -> None:
        for integration in self:
            status = integration.status()
            if status.configured and status.enabled and not status.running:
                try:
                    await integration.enable()
                except Exception as exc:  # noqa: BLE001 - um canal não derruba o sistema
                    logger.warning("Canal %s não iniciou: %s", integration.key, exc)

    async def stop_all(self) -> None:
        for integration in self:
            try:
                await integration.disable()
            except Exception as exc:  # noqa: BLE001
                logger.warning("Falha ao parar o canal %s: %s", integration.key, exc)

    def running(self) -> list[BaseChannelIntegration]:
        return [i for i in self if i.status().running]


class IntegrationRegistry:
    """Fachada sobre os registros por família (GRASP — Facade/Indirection).

    Responsável pela descoberta unificada e pela persistência das credenciais
    em `credentials.json`; as regras de cada família ficam no registro dela.
    """

    def __init__(self, credentials: ICredentialStore) -> None:
        self._credentials = credentials
        self.inference = InferenceRegistry()
        self.messaging = MessagingRegistry()

    @property
    def registries(self) -> tuple[BaseIntegrationRegistry[Any], ...]:
        return (self.inference, self.messaging)

    def register(self, integration: IIntegration, *, activate: bool = False) -> "IntegrationRegistry":
        """Encaminha a integração para o registro da família correspondente."""
        if isinstance(integration, BaseInferenceIntegration):
            self.inference.register(integration, activate=activate)
        elif isinstance(integration, BaseChannelIntegration):
            self.messaging.register(integration)
        else:
            raise ValidationError(
                f"Tipo de integração não suportado: {integration.kind.value}."
            )
        return self

    def get(self, key: str) -> IIntegration:
        for registry in self.registries:
            found = registry.find(key)
            if found is not None:
                return found
        raise NotFoundError(f"Integração '{key}' não registrada.")

    def all(self) -> list[IIntegration]:
        return [integration for registry in self.registries for integration in registry]

    async def load_all(self) -> None:
        """Aplica a cada integração as credenciais salvas em credentials.json."""
        data: dict[str, Any] = await self._credentials.all()
        active = data.get("active_inference_provider")
        if isinstance(active, str) and active in self.inference:
            self.inference.activate(active)
        for integration in self.all():
            stored = data.get(integration.key)
            if isinstance(stored, dict):
                await integration.configure(stored)

    async def save(self, key: str, values: dict[str, Any]) -> IIntegration:
        integration = self.get(key)
        await integration.configure(values)
        stored = {
            k: v for k, v in integration.credentials.items() if v not in (None, "")  # type: ignore[attr-defined]
        }
        await self._credentials.set(key, stored)
        return integration

    async def enable(self, key: str) -> IIntegration:
        integration = self.get(key)
        await integration.enable()
        return integration

    async def disable(self, key: str) -> IIntegration:
        integration = self.get(key)
        await integration.disable()
        return integration

    async def set_active_inference(self, key: str) -> BaseInferenceIntegration:
        integration = self.inference.activate(key)
        await self._credentials.set("active_inference_provider", key)
        return integration

    async def autostart(self) -> None:
        await self.messaging.start_enabled()

    async def shutdown(self) -> None:
        await self.messaging.stop_all()

    def describe_all(self) -> list[dict[str, Any]]:
        return [
            {
                **integration.describe(),
                "status": integration.status().to_dict(),
                "values": integration.masked_credentials(),  # type: ignore[attr-defined]
                "active_inference": integration.key == self.inference.active_key,
            }
            for integration in self.all()
        ]

    def __iter__(self) -> Iterator[IIntegration]:
        return iter(self.all())

    def __len__(self) -> int:
        return sum(len(registry) for registry in self.registries)
