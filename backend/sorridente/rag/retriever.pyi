"""Stub de tipos: contrato público de sorridente.rag.retriever."""
import abc
from ..core.models import KnowledgeDocument as KnowledgeDocument
from .documents import Chunk as Chunk, ScoredChunk as ScoredChunk
from .interfaces import IChunker as IChunker, IEmbedder as IEmbedder, IRetriever as IRetriever, IVectorStore as IVectorStore
from .text import tokenize as tokenize
from _typeshed import Incomplete
from abc import ABC
from collections import Counter
from typing import Sequence

class BaseRetriever(IRetriever, ABC, metaclass=abc.ABCMeta):
    _chunker: Incomplete
    _lock: Incomplete
    def __init__(self, chunker: IChunker) -> None: ...
    def _explode(self, documents: Sequence[KnowledgeDocument]) -> list[Chunk]: ...

class VectorRetriever(BaseRetriever):
    _embedder: Incomplete
    _store: Incomplete
    def __init__(self, chunker: IChunker, embedder: IEmbedder, store: IVectorStore) -> None: ...
    async def reindex(self, documents: Sequence[KnowledgeDocument]) -> int: ...
    async def retrieve(self, query: str, limit: int = 4) -> list[ScoredChunk]: ...

class BM25Retriever(BaseRetriever):
    _k1: Incomplete
    _b: Incomplete
    _chunks: list[Chunk]
    _term_frequencies: list[Counter[str]]
    _lengths: list[int]
    _average_length: float
    _idf: dict[str, float]
    def __init__(self, chunker: IChunker, k1: float = 1.5, b: float = 0.75) -> None: ...
    async def reindex(self, documents: Sequence[KnowledgeDocument]) -> int: ...
    async def retrieve(self, query: str, limit: int = 4) -> list[ScoredChunk]: ...

class HybridRetriever(IRetriever):
    _retrievers: Incomplete
    _k: Incomplete
    def __init__(self, retrievers: Sequence[IRetriever], k: int = 60) -> None: ...
    async def reindex(self, documents: Sequence[KnowledgeDocument]) -> int: ...
    async def retrieve(self, query: str, limit: int = 4) -> list[ScoredChunk]: ...
