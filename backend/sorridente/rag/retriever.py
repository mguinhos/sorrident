"""Recuperadores: vetorial, BM25 e híbrido."""
from __future__ import annotations

import asyncio
import math
from abc import ABC
from collections import Counter
from typing import Sequence

from ..core.models import KnowledgeDocument
from .documents import Chunk, ScoredChunk
from .interfaces import IChunker, IEmbedder, IRetriever, IVectorStore
from .text import tokenize


class BaseRetriever(IRetriever, ABC):
    """Comportamento comum: fatiar os documentos e proteger o índice."""

    def __init__(self, chunker: IChunker) -> None:
        self._chunker = chunker
        self._lock = asyncio.Lock()

    def _explode(self, documents: Sequence[KnowledgeDocument]) -> list[Chunk]:
        chunks: list[Chunk] = []
        for document in documents:
            if document.active:
                chunks.extend(self._chunker.split(document))
        return chunks


class VectorRetriever(BaseRetriever):
    """Busca semântica por similaridade de cosseno sobre TF-IDF."""

    def __init__(self, chunker: IChunker, embedder: IEmbedder, store: IVectorStore) -> None:
        super().__init__(chunker)
        self._embedder = embedder
        self._store = store

    async def reindex(self, documents: Sequence[KnowledgeDocument]) -> int:
        async with self._lock:
            chunks = self._explode(documents)
            self._store.clear()
            if not chunks:
                return 0
            self._embedder.fit(chunks)
            self._store.index((chunk, self._embedder.embed(chunk.searchable_text)) for chunk in chunks)
            return len(chunks)

    async def retrieve(self, query: str, limit: int = 4) -> list[ScoredChunk]:
        if not self._embedder.is_fitted or len(self._store) == 0:
            return []
        return self._store.search(self._embedder.embed(query), limit)


class BM25Retriever(BaseRetriever):
    """Ranqueamento léxico BM25, forte em termos exatos (nomes, valores)."""

    def __init__(self, chunker: IChunker, k1: float = 1.5, b: float = 0.75) -> None:
        super().__init__(chunker)
        self._k1 = k1
        self._b = b
        self._chunks: list[Chunk] = []
        self._term_frequencies: list[Counter[str]] = []
        self._lengths: list[int] = []
        self._average_length = 0.0
        self._idf: dict[str, float] = {}

    async def reindex(self, documents: Sequence[KnowledgeDocument]) -> int:
        async with self._lock:
            self._chunks = self._explode(documents)
            self._term_frequencies = [Counter(tokenize(c.searchable_text)) for c in self._chunks]
            self._lengths = [sum(tf.values()) for tf in self._term_frequencies]
            self._average_length = (sum(self._lengths) / len(self._lengths)) if self._lengths else 0.0

            occurrences: Counter[str] = Counter()
            for tf in self._term_frequencies:
                occurrences.update(tf.keys())
            total = len(self._chunks)
            self._idf = {
                term: math.log(1 + (total - count + 0.5) / (count + 0.5))
                for term, count in occurrences.items()
            }
            return len(self._chunks)

    async def retrieve(self, query: str, limit: int = 4) -> list[ScoredChunk]:
        terms = tokenize(query)
        if not terms or not self._chunks:
            return []
        results: list[ScoredChunk] = []
        for index, tf in enumerate(self._term_frequencies):
            score = 0.0
            length = self._lengths[index] or 1
            for term in terms:
                frequency = tf.get(term, 0)
                if not frequency:
                    continue
                denominator = frequency + self._k1 * (
                    1 - self._b + self._b * length / (self._average_length or 1)
                )
                score += self._idf.get(term, 0.0) * frequency * (self._k1 + 1) / denominator
            if score > 0:
                results.append(ScoredChunk(chunk=self._chunks[index], score=score))
        results.sort(key=lambda item: item.score, reverse=True)
        return results[:limit]


class HybridRetriever(IRetriever):
    """Combina os recuperadores por Reciprocal Rank Fusion.

    A fusão por posição dispensa normalizar escalas diferentes (cosseno × BM25)
    e é robusta quando um dos recuperadores erra o alvo.
    """

    def __init__(self, retrievers: Sequence[IRetriever], k: int = 60) -> None:
        self._retrievers = list(retrievers)
        self._k = k

    async def reindex(self, documents: Sequence[KnowledgeDocument]) -> int:
        counts = await asyncio.gather(*(r.reindex(documents) for r in self._retrievers))
        return max(counts) if counts else 0

    async def retrieve(self, query: str, limit: int = 4) -> list[ScoredChunk]:
        rankings = await asyncio.gather(
            *(r.retrieve(query, limit * 2) for r in self._retrievers)
        )
        fused: dict[str, float] = {}
        found: dict[str, Chunk] = {}
        for ranking in rankings:
            for position, scored in enumerate(ranking):
                fused[scored.chunk.id] = fused.get(scored.chunk.id, 0.0) + 1.0 / (self._k + position + 1)
                found[scored.chunk.id] = scored.chunk
        ordered = sorted(fused.items(), key=lambda item: item[1], reverse=True)
        return [ScoredChunk(chunk=found[chunk_id], score=score) for chunk_id, score in ordered[:limit]]
