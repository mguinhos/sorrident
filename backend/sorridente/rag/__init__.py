"""Camada de RAG: base de conhecimento consultável pelo agente."""
from .chunking import ParagraphChunker, WholeDocumentChunker
from .documents import Chunk, ScoredChunk, Vector
from .embedding import TfIdfEmbedder
from .interfaces import IChunker, IEmbedder, IKnowledgeService, IRetriever, IVectorStore
from .retriever import BaseRetriever, BM25Retriever, HybridRetriever, VectorRetriever
from .service import KnowledgeBaseService
from .store import InMemoryVectorStore

__all__ = [
    "Chunk",
    "ScoredChunk",
    "Vector",
    "IChunker",
    "IEmbedder",
    "IVectorStore",
    "IRetriever",
    "IKnowledgeService",
    "ParagraphChunker",
    "WholeDocumentChunker",
    "TfIdfEmbedder",
    "InMemoryVectorStore",
    "BaseRetriever",
    "VectorRetriever",
    "BM25Retriever",
    "HybridRetriever",
    "KnowledgeBaseService",
]
