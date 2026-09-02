"""Contratos da camada de RAG (recuperação aumentada por geração)."""
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Iterable, Optional, Sequence

from ..core.models import KnowledgeDocument
from .documents import Chunk, ScoredChunk, Vector


class IChunker(ABC):
    """Estratégia de fatiamento de um documento em trechos indexáveis."""

    @abstractmethod
    def split(self, document: KnowledgeDocument) -> list[Chunk]: ...


class IEmbedder(ABC):
    """Transforma texto em vetor.

    A implementação local usa TF-IDF; um provedor externo de embeddings
    (OpenAI, Ollama, …) entra aqui como outra implementação.
    """

    @abstractmethod
    def fit(self, chunks: Sequence[Chunk]) -> None:
        """Prepara o vocabulário/estatísticas a partir do corpus."""

    @abstractmethod
    def embed(self, text: str) -> Vector: ...

    @property
    @abstractmethod
    def is_fitted(self) -> bool: ...


class IVectorStore(ABC):
    """Armazena os vetores dos trechos e devolve os mais próximos."""

    @abstractmethod
    def index(self, entries: Iterable[tuple[Chunk, Vector]]) -> None: ...

    @abstractmethod
    def clear(self) -> None: ...

    @abstractmethod
    def search(self, query: Vector, limit: int = 5) -> list[ScoredChunk]: ...

    @property
    @abstractmethod
    def chunks(self) -> list[Chunk]: ...

    @abstractmethod
    def __len__(self) -> int: ...


class IRetriever(ABC):
    """Recupera os trechos mais relevantes para uma pergunta."""

    @abstractmethod
    async def retrieve(self, query: str, limit: int = 4) -> list[ScoredChunk]: ...

    @abstractmethod
    async def reindex(self, documents: Sequence[KnowledgeDocument]) -> int:
        """Reconstrói o índice e devolve a quantidade de trechos indexados."""


class IKnowledgeService(ABC):
    """Casos de uso da base de conhecimento."""

    @abstractmethod
    async def create(self, title: str, content: str, tags: Optional[list[str]] = None) -> KnowledgeDocument: ...

    @abstractmethod
    async def update(self, document_id: str, **data: Any) -> KnowledgeDocument: ...

    @abstractmethod
    async def delete(self, document_id: str) -> bool: ...

    @abstractmethod
    async def list_all(self) -> list[KnowledgeDocument]: ...

    @abstractmethod
    async def reindex(self) -> int: ...

    @abstractmethod
    async def search(self, question: str, limit: int = 4) -> list[ScoredChunk]: ...

    @abstractmethod
    async def answer_context(self, question: str, limit: int = 4) -> dict[str, Any]:
        """Trechos formatados para o agente citar na resposta."""
