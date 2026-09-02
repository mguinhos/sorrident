"""Stub de tipos: contrato público de sorridente.rag.chunking."""
from ..core.models import KnowledgeDocument as KnowledgeDocument
from .documents import Chunk as Chunk
from .interfaces import IChunker as IChunker
from .text import split_paragraphs as split_paragraphs, split_sentences as split_sentences
from _typeshed import Incomplete

class ParagraphChunker(IChunker):
    _max_chars: Incomplete
    _min_chars: Incomplete
    def __init__(self, max_chars: int = 700, min_chars: int = 80) -> None: ...
    def split(self, document: KnowledgeDocument) -> list[Chunk]: ...
    def _explode(self, paragraph: str) -> list[str]: ...

class WholeDocumentChunker(IChunker):
    def split(self, document: KnowledgeDocument) -> list[Chunk]: ...
