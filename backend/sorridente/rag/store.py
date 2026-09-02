"""Armazenamento de vetores em memória."""
from __future__ import annotations

from typing import Iterable

from .documents import Chunk, ScoredChunk, Vector
from .interfaces import IVectorStore


class InMemoryVectorStore(IVectorStore):
    """Índice em memória com busca por similaridade de cosseno.

    O índice é reconstruído a partir do TinyDB no startup e a cada alteração
    da base — barato para o volume de uma clínica e sem serviço externo.
    """

    def __init__(self) -> None:
        self._entries: list[tuple[Chunk, Vector]] = []

    def index(self, entries: Iterable[tuple[Chunk, Vector]]) -> None:
        self._entries.extend(entries)

    def clear(self) -> None:
        self._entries.clear()

    def search(self, query: Vector, limit: int = 5) -> list[ScoredChunk]:
        scored = [
            ScoredChunk(chunk=chunk, score=query.cosine(vector))
            for chunk, vector in self._entries
        ]
        scored = [item for item in scored if item.score > 0]
        scored.sort(key=lambda item: item.score, reverse=True)
        return scored[:limit]

    @property
    def chunks(self) -> list[Chunk]:
        return [chunk for chunk, _ in self._entries]

    def __len__(self) -> int:
        return len(self._entries)
