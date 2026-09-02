"""Stub de tipos: contrato público de sorridente.rag.documents."""
from dataclasses import dataclass, field
from typing import Any

@dataclass(frozen=True)
class Chunk:
    id: str
    document_id: str
    title: str
    content: str
    source: str = ...
    position: int = ...
    metadata: dict[str, Any] = field(default_factory=dict)
    @property
    def searchable_text(self) -> str: ...
    def to_dict(self) -> dict[str, Any]: ...

@dataclass(frozen=True)
class ScoredChunk:
    chunk: Chunk
    score: float
    def to_dict(self) -> dict[str, Any]: ...

@dataclass(frozen=True)
class Vector:
    values: dict[str, float]
    norm: float = ...
    @classmethod
    def from_weights(cls, weights: dict[str, float]) -> Vector: ...
    def cosine(self, other: Vector) -> float: ...
