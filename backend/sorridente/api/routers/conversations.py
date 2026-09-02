"""Rotas de conversas: histórico, resposta humana e handoff."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response

from ...container import ApplicationContainer
from ...core.models import MessageAuthor
from ..dependencies import get_container, require_staff
from ..schemas.dto import HandoffRequest, StaffReplyRequest

router = APIRouter(prefix="/conversations", tags=["conversas"], dependencies=[Depends(require_staff)])


@router.get("")
async def list_conversations(
    limit: int = Query(default=100, ge=1, le=500),
    container: ApplicationContainer = Depends(get_container),
) -> list[dict[str, Any]]:
    return [c.to_dict() for c in await container.conversation_service.list_all(limit)]


@router.get("/{conversation_id}")
async def get_conversation(
    conversation_id: str,
    limit: int = Query(default=200, ge=1, le=1000),
    container: ApplicationContainer = Depends(get_container),
) -> dict[str, Any]:
    conversation = await container.conversation_service.get(conversation_id)
    messages = await container.conversation_service.history(conversation_id, limit)
    return {"conversation": conversation.to_dict(), "messages": [m.to_dict() for m in messages]}


@router.get("/{conversation_id}/export")
async def export_conversation(
    conversation_id: str,
    format: str = Query(default="txt", pattern="^(txt|md|html)$"),
    container: ApplicationContainer = Depends(get_container),
) -> Response:
    """Baixa o histórico da conversa como arquivo."""
    arquivo = await container.export_service.export(conversation_id, format)
    return Response(
        content=arquivo.data,
        media_type=arquivo.content_type,
        headers={"Content-Disposition": f'attachment; filename="{arquivo.filename}"'},
    )


@router.post("/{conversation_id}/export/send")
async def send_conversation_export(
    conversation_id: str,
    format: str = Query(default="txt", pattern="^(txt|md|html)$"),
    container: ApplicationContainer = Depends(get_container),
) -> dict[str, Any]:
    """Envia o histórico ao paciente pelo canal de origem."""
    return await container.export_service.export_and_send(conversation_id, format)


@router.post("/{conversation_id}/read")
async def mark_read(
    conversation_id: str, container: ApplicationContainer = Depends(get_container)
) -> dict[str, Any]:
    return (await container.conversation_service.mark_read(conversation_id)).to_dict()


@router.post("/{conversation_id}/handoff")
async def set_handoff(
    conversation_id: str,
    payload: HandoffRequest,
    container: ApplicationContainer = Depends(get_container),
) -> dict[str, Any]:
    return (await container.conversation_service.set_handoff(conversation_id, payload.handoff)).to_dict()


@router.post("/{conversation_id}/reply")
async def staff_reply(
    conversation_id: str,
    payload: StaffReplyRequest,
    container: ApplicationContainer = Depends(get_container),
) -> dict[str, Any]:
    """Envia uma mensagem escrita por um humano da clínica pelo canal de origem."""
    conversation = await container.conversation_service.get(conversation_id)
    message = await container.conversation_service.append(
        conversation_id, MessageAuthor.HUMAN_AGENT.value, payload.message
    )
    delivered = await container.channels.send(
        conversation.channel, conversation.external_id, payload.message
    )
    return {"message": message.to_dict(), "delivered": delivered}
