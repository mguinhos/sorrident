"""Estratégias de fatiamento de documentos."""
from __future__ import annotations

from ..core.models import KnowledgeDocument
from .documents import Chunk
from .interfaces import IChunker
from .text import split_paragraphs, split_sentences


class ParagraphChunker(IChunker):
    """Fatia por parágrafo, agrupando até um tamanho alvo de caracteres.

    Parágrafos longos são quebrados por frase, de modo que nenhum trecho
    ultrapasse `max_chars` — o suficiente para textos de clínica.
    """

    def __init__(self, max_chars: int = 700, min_chars: int = 80) -> None:
        self._max_chars = max_chars
        self._min_chars = min_chars

    def split(self, document: KnowledgeDocument) -> list[Chunk]:
        blocks: list[str] = []
        buffer = ""
        for paragraph in split_paragraphs(document.content) or [document.content]:
            for piece in self._explode(paragraph):
                if not buffer:
                    buffer = piece
                elif len(buffer) + len(piece) + 1 <= self._max_chars:
                    buffer = f"{buffer}\n{piece}"
                else:
                    blocks.append(buffer)
                    buffer = piece
        if buffer:
            blocks.append(buffer)

        # Trechos muito curtos são absorvidos pelo anterior.
        merged: list[str] = []
        for block in blocks:
            if merged and len(block) < self._min_chars:
                merged[-1] = f"{merged[-1]}\n{block}"
            else:
                merged.append(block)

        return [
            Chunk(
                id=f"{document.id}:{position}",
                document_id=document.id,
                title=document.title,
                content=content.strip(),
                source=document.source,
                position=position,
                metadata={"tags": document.tags, "source_id": document.source_id},
            )
            for position, content in enumerate(merged)
            if content.strip()
        ]

    def _explode(self, paragraph: str) -> list[str]:
        if len(paragraph) <= self._max_chars:
            return [paragraph]
        pieces: list[str] = []
        buffer = ""
        for sentence in split_sentences(paragraph):
            if buffer and len(buffer) + len(sentence) + 1 > self._max_chars:
                pieces.append(buffer)
                buffer = sentence
            else:
                buffer = f"{buffer} {sentence}".strip()
        if buffer:
            pieces.append(buffer)
        return pieces


class WholeDocumentChunker(IChunker):
    """Mantém o documento inteiro como um único trecho (textos curtos)."""

    def split(self, document: KnowledgeDocument) -> list[Chunk]:
        if not document.content.strip():
            return []
        return [
            Chunk(
                id=f"{document.id}:0",
                document_id=document.id,
                title=document.title,
                content=document.content.strip(),
                source=document.source,
                metadata={"tags": document.tags, "source_id": document.source_id},
            )
        ]
