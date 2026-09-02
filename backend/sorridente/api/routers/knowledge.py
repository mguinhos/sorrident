"""Rotas de FAQ, base de conhecimento (RAG) e configurações da clínica."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query

from ...container import ApplicationContainer
from ..dependencies import get_container, require_manager, require_staff
from ..schemas.dto import (
    FAQRequest,
    FAQUpdateRequest,
    KnowledgeDocumentRequest,
    KnowledgeDocumentUpdateRequest,
    SettingsRequest,
)

faq_router = APIRouter(prefix="/faqs", tags=["faq"])
knowledge_router = APIRouter(prefix="/knowledge", tags=["base de conhecimento"])
settings_router = APIRouter(prefix="/settings", tags=["configurações"])


@faq_router.get("")
async def list_faqs(container: ApplicationContainer = Depends(get_container)) -> list[dict[str, Any]]:
    return [f.to_dict() for f in await container.faq_service.list_all()]


@faq_router.post("", dependencies=[Depends(require_staff)])
async def create_faq(
    payload: FAQRequest, container: ApplicationContainer = Depends(get_container)
) -> dict[str, Any]:
    faq = await container.faq_service.create(payload.question, payload.answer, payload.tags)
    await container.knowledge_service.reindex()
    return faq.to_dict()


@faq_router.put("/{faq_id}", dependencies=[Depends(require_staff)])
async def update_faq(
    faq_id: str, payload: FAQUpdateRequest, container: ApplicationContainer = Depends(get_container)
) -> dict[str, Any]:
    faq = await container.faq_service.update(faq_id, **payload.model_dump(exclude_none=True))
    await container.knowledge_service.reindex()
    return faq.to_dict()


@faq_router.delete("/{faq_id}", dependencies=[Depends(require_manager)])
async def delete_faq(
    faq_id: str, container: ApplicationContainer = Depends(get_container)
) -> dict[str, Any]:
    deleted = await container.faq_service.delete(faq_id)
    await container.knowledge_service.reindex()
    return {"deleted": deleted}


@knowledge_router.get("", dependencies=[Depends(require_staff)])
async def list_documents(
    container: ApplicationContainer = Depends(get_container),
) -> dict[str, Any]:
    documents = await container.knowledge_service.list_all()
    fontes = await container.knowledge_service.sources()
    return {
        "documents": [d.to_dict() for d in documents],
        "indexed_chunks": container.knowledge_service.indexed_chunks,
        "indexed_documents": len(fontes),
        "vocabulary": container.embedder.vocabulary_size,
    }


@knowledge_router.post("", dependencies=[Depends(require_staff)])
async def create_document(
    payload: KnowledgeDocumentRequest, container: ApplicationContainer = Depends(get_container)
) -> dict[str, Any]:
    document = await container.knowledge_service.create(payload.title, payload.content, payload.tags)
    return document.to_dict()


@knowledge_router.put("/{document_id}", dependencies=[Depends(require_staff)])
async def update_document(
    document_id: str,
    payload: KnowledgeDocumentUpdateRequest,
    container: ApplicationContainer = Depends(get_container),
) -> dict[str, Any]:
    document = await container.knowledge_service.update(
        document_id, **payload.model_dump(exclude_none=True)
    )
    return document.to_dict()


@knowledge_router.delete("/{document_id}", dependencies=[Depends(require_manager)])
async def delete_document(
    document_id: str, container: ApplicationContainer = Depends(get_container)
) -> dict[str, Any]:
    return {"deleted": await container.knowledge_service.delete(document_id)}


@knowledge_router.post("/reindex", dependencies=[Depends(require_staff)])
async def reindex(container: ApplicationContainer = Depends(get_container)) -> dict[str, Any]:
    return {"indexed_chunks": await container.knowledge_service.reindex()}


@knowledge_router.get("/search", dependencies=[Depends(require_staff)])
async def search(
    q: str = Query(default="", min_length=1),
    limit: int = Query(default=5, ge=1, le=10),
    container: ApplicationContainer = Depends(get_container),
) -> dict[str, Any]:
    """Testa a recuperação exatamente como o agente a enxerga."""
    results = await container.knowledge_service.search(q, limit)
    return {"query": q, "results": [item.to_dict() for item in results]}


@settings_router.get("")
async def get_settings(container: ApplicationContainer = Depends(get_container)) -> dict[str, Any]:
    return (await container.settings_service.get()).to_dict()


@settings_router.put("", dependencies=[Depends(require_manager)])
async def update_settings(
    payload: SettingsRequest, container: ApplicationContainer = Depends(get_container)
) -> dict[str, Any]:
    settings = await container.settings_service.update(**payload.model_dump(exclude_none=True))
    await container.knowledge_service.reindex()
    return settings.to_dict()
