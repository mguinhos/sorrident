"""Vetorização de texto sem dependências externas (TF-IDF em português)."""
from __future__ import annotations

import math
from collections import Counter
from typing import Sequence

from .documents import Chunk, Vector
from .interfaces import IEmbedder
from .text import tokenize


class TfIdfEmbedder(IEmbedder):
    """TF-IDF com pesos logarítmicos, ajustado ao corpus indexado.

    Escolhido por rodar em processo, sem rede nem modelo externo — adequado ao
    volume de uma clínica. Trocar por embeddings densos é implementar outra
    `IEmbedder` e registrar no lugar desta.
    """

    def __init__(self, use_bigrams: bool = True) -> None:
        self._idf: dict[str, float] = {}
        self._documents = 0
        self._use_bigrams = use_bigrams

    @property
    def is_fitted(self) -> bool:
        return bool(self._idf)

    @property
    def vocabulary_size(self) -> int:
        return len(self._idf)

    def _terms(self, text: str) -> list[str]:
        tokens = tokenize(text)
        if not self._use_bigrams or len(tokens) < 2:
            return tokens
        bigrams = [f"{a}_{b}" for a, b in zip(tokens, tokens[1:])]
        return tokens + bigrams

    def fit(self, chunks: Sequence[Chunk]) -> None:
        self._documents = len(chunks)
        frequency: Counter[str] = Counter()
        for chunk in chunks:
            frequency.update(set(self._terms(chunk.searchable_text)))
        self._idf = {
            term: math.log((self._documents + 1) / (count + 0.5)) + 1.0
            for term, count in frequency.items()
        }

    def embed(self, text: str) -> Vector:
        counts = Counter(self._terms(text))
        if not counts:
            return Vector.from_weights({})
        # Termos ausentes do corpus recebem o IDF máximo (são muito específicos).
        fallback = max(self._idf.values(), default=1.0)
        weights = {
            term: (1.0 + math.log(count)) * self._idf.get(term, fallback)
            for term, count in counts.items()
        }
        return Vector.from_weights(weights)
