"""Modelo de linguagem como objeto: capacidades, limites e catálogo."""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Flag, auto
from typing import Any, Iterator, Optional


class Supports(Flag):
    """Capacidades de um modelo, combináveis com `|`.

    Exemplo: `Supports.TEXT | Supports.TOOLS | Supports.REASONING`.
    """

    NONE = 0
    TEXT = auto()
    TOOLS = auto()
    STREAMING = auto()
    IMAGE = auto()
    AUDIO = auto()
    JSON_MODE = auto()
    REASONING = auto()
    PARALLEL_TOOLS = auto()

    def describe(self) -> list[str]:
        return [flag.name.lower() for flag in Supports if flag is not Supports.NONE and flag in self]


@dataclass(frozen=True)
class Model:
    """Descrição de um modelo servido por um provedor de inferência."""

    id: str
    provider: str = "groq"
    supports: Supports = Supports.TEXT | Supports.TOOLS | Supports.STREAMING
    context_window: int = 32_768
    max_output_tokens: int = 4_096
    display_name: str = ""
    notes: str = ""

    def capable_of(self, capability: Supports) -> bool:
        return capability in self.supports

    @property
    def name(self) -> str:
        return self.display_name or self.id

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "provider": self.provider,
            "display_name": self.name,
            "supports": self.supports.describe(),
            "context_window": self.context_window,
            "max_output_tokens": self.max_output_tokens,
            "notes": self.notes,
        }


DEFAULT_SUPPORTS = (
    Supports.TEXT
    | Supports.TOOLS
    | Supports.STREAMING
    | Supports.JSON_MODE
    | Supports.PARALLEL_TOOLS
)


class IModelCatalog(ABC):
    """Fonte de descrições de modelos (capacidades e limites)."""

    @abstractmethod
    def register(self, model: Model) -> "IModelCatalog": ...

    @abstractmethod
    def get(self, model_id: str, provider: str = "groq") -> Model: ...


class ModelCatalog(IModelCatalog):
    """Catálogo de modelos conhecidos, com fallback para modelos novos."""

    def __init__(self, models: Optional[list[Model]] = None) -> None:
        source = models if models is not None else self._defaults()
        self._models: dict[str, Model] = {m.id: m for m in source}

    @staticmethod
    def _defaults() -> list[Model]:
        return [
            Model(
                id="qwen/qwen3.8-27b",
                provider="groq",
                supports=DEFAULT_SUPPORTS | Supports.REASONING,
                context_window=131_072,
                max_output_tokens=8_192,
                display_name="Qwen3.8 27B",
                notes="Modelo padrão do agente SorriDente.",
            ),
            Model(
                id="qwen/qwen3.6-27b",
                provider="groq",
                supports=DEFAULT_SUPPORTS | Supports.REASONING,
                context_window=131_072,
                max_output_tokens=8_192,
                display_name="Qwen3.6 27B",
            ),
        ]

    def register(self, model: Model) -> "ModelCatalog":
        self._models[model.id] = model
        return self

    def get(self, model_id: str, provider: str = "groq") -> Model:
        """Devolve o modelo conhecido ou um perfil conservador para modelos novos."""
        known = self._models.get(model_id)
        if known is not None:
            return known
        return Model(id=model_id, provider=provider, supports=DEFAULT_SUPPORTS)

    def __iter__(self) -> Iterator[Model]:
        return iter(self._models.values())
