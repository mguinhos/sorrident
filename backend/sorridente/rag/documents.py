"""Objetos de valor da camada de RAG."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class Chunk:
    """Trecho indexável de um documento."""

    id: str
    document_id: str
    title: str
    content: str
    source: str = "manual"
    position: int = 0
    metadata: dict[str, Any] = field(default_factory=dict)

    @property
    def searchable_text(self) -> str:
        """Texto usado na indexação: o título pesa junto com o conteúdo."""
        return f"{self.title}\n{self.title}\n{self.content}"

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "document_id": self.document_id,
            "title": self.title,
            "content": self.content,
            "source": self.source,
            "position": self.position,
            "metadata": self.metadata,
        }


@dataclass(frozen=True)
class ScoredChunk:
    """Trecho recuperado com a sua pontuação de relevância."""

    chunk: Chunk
    score: float

    def to_dict(self) -> dict[str, Any]:
        return {**self.chunk.to_dict(), "score": round(self.score, 4)}


@dataclass(frozen=True)
class Vector:
    """Vetor esparso (termo → peso), suficiente para bases pequenas."""

    values: dict[str, float]
    norm: float = 0.0

    @classmethod
    def from_weights(cls, weights: dict[str, float]) -> "Vector":
        norm = sum(value * value for value in weights.values()) ** 0.5
        return cls(values=weights, norm=norm)

    def cosine(self, other: "Vector") -> float:
        if not self.norm or not other.norm:
            return 0.0
        smaller, larger = (
            (self.values, other.values)
            if len(self.values) <= len(other.values)
            else (other.values, self.values)
        )
        product = sum(weight * larger.get(term, 0.0) for term, weight in smaller.items())
        return product / (self.norm * other.norm)
