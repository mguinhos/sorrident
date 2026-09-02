"""Serviço da base de conhecimento: fontes, indexação e consulta."""
from __future__ import annotations

import logging
from typing import Any, Optional, Sequence

from ..core.exceptions import NotFoundError, ValidationError
from ..core.models import KnowledgeDocument
from ..domain.repositories import (
    DentistRepository,
    FAQRepository,
    KnowledgeRepository,
    ProcedureRepository,
    SettingsRepository,
)
from .documents import ScoredChunk
from .interfaces import IKnowledgeService, IRetriever

logger = logging.getLogger(__name__)


class KnowledgeBaseService(IKnowledgeService):
    """Reúne o conteúdo da clínica e o mantém indexado para o agente.

    As fontes são derivadas das próprias entidades do sistema (FAQs,
    procedimentos, dados da clínica) e somadas aos documentos escritos pela
    equipe, de modo que a base nunca fica desatualizada em relação ao cadastro.
    """

    def __init__(
        self,
        documents: KnowledgeRepository,
        faqs: FAQRepository,
        procedures: ProcedureRepository,
        dentists: DentistRepository,
        settings: SettingsRepository,
        retriever: IRetriever,
    ) -> None:
        self._documents = documents
        self._faqs = faqs
        self._procedures = procedures
        self._dentists = dentists
        self._settings = settings
        self._retriever = retriever
        self._indexed_chunks = 0

    @property
    def indexed_chunks(self) -> int:
        return self._indexed_chunks

    async def create(
        self, title: str, content: str, tags: Optional[list[str]] = None
    ) -> KnowledgeDocument:
        if not title.strip() or not content.strip():
            raise ValidationError("Título e conteúdo são obrigatórios.")
        document = KnowledgeDocument(
            title=title.strip(), content=content.strip(), tags=tags or [], source="manual"
        )
        await self._documents.add(document)
        await self.reindex()
        return document

    async def update(self, document_id: str, **data: Any) -> KnowledgeDocument:
        document = await self._documents.get(document_id)
        if document is None:
            raise NotFoundError(f"Documento {document_id} não encontrado.")
        for key, value in data.items():
            if value is not None and hasattr(document, key) and key not in ("id", "created_at"):
                setattr(document, key, value)
        await self._documents.update(document)
        await self.reindex()
        return document

    async def delete(self, document_id: str) -> bool:
        removed = await self._documents.remove(document_id)
        await self.reindex()
        return removed

    async def list_all(self) -> list[KnowledgeDocument]:
        return await self._documents.list()

    async def sources(self) -> list[KnowledgeDocument]:
        """Documentos manuais somados aos derivados do cadastro da clínica."""
        collected: list[KnowledgeDocument] = [d for d in await self._documents.list() if d.active]

        for faq in await self._faqs.active():
            collected.append(
                KnowledgeDocument(
                    id=f"faq-{faq.id}",
                    title=faq.question,
                    content=faq.answer,
                    source="faq",
                    source_id=faq.id,
                    tags=faq.tags,
                )
            )

        for procedure in await self._procedures.active():
            preco = "gratuito" if procedure.price == 0 else f"R$ {procedure.price:.2f}"
            collected.append(
                KnowledgeDocument(
                    id=f"proc-{procedure.id}",
                    title=f"Procedimento: {procedure.name}",
                    content=(
                        f"{procedure.description}\n"
                        f"Duração aproximada: {procedure.duration_minutes} minutos.\n"
                        f"Valor: {preco}."
                    ),
                    source="procedimento",
                    source_id=procedure.id,
                    tags=["procedimento", "preço", "duração"],
                )
            )

        settings = await self._settings.current()
        dias = ["segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"]
        equipe = ", ".join(f"{d.name} ({d.specialty}, {d.cro})" for d in await self._dentists.active())
        collected.append(
            KnowledgeDocument(
                id="clinica-info",
                title=f"Sobre a {settings.clinic_name}",
                content=(
                    f"Endereço: {settings.address}.\n"
                    f"Telefone: {settings.phone}. E-mail: {settings.email}.\n"
                    f"Horário de atendimento: {settings.opening_hour} às {settings.closing_hour}, "
                    f"com almoço das {settings.lunch_start} às {settings.lunch_end}.\n"
                    f"Dias de funcionamento: {', '.join(dias[d] for d in settings.working_days if 0 <= d < 7)}.\n"
                    f"Equipe: {equipe}."
                ),
                source="clinica",
                tags=["endereço", "horário", "contato", "equipe"],
            )
        )
        return collected

    async def reindex(self) -> int:
        documents = await self.sources()
        self._indexed_chunks = await self._retriever.reindex(documents)
        logger.info(
            "Base de conhecimento reindexada: %s documentos, %s trechos.",
            len(documents),
            self._indexed_chunks,
        )
        return self._indexed_chunks

    async def search(self, question: str, limit: int = 4) -> list[ScoredChunk]:
        return await self._retriever.retrieve(question, limit)

    async def answer_context(self, question: str, limit: int = 4) -> dict[str, Any]:
        results = await self.search(question, limit)
        if not results:
            return {
                "encontrado": False,
                "trechos": [],
                "aviso": (
                    "Nada específico na base da clínica. Responda apenas o que souber com "
                    "segurança ou ofereça falar com a equipe."
                ),
            }
        return {
            "encontrado": True,
            "trechos": [
                {
                    "titulo": item.chunk.title,
                    "conteudo": item.chunk.content,
                    "fonte": item.chunk.source,
                    "relevancia": round(item.score, 4),
                }
                for item in results
            ],
        }
