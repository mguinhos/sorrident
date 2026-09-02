"""Rotas do chat do cliente na interface web."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response

from ...container import ApplicationContainer
from ...channels.base import InboundMessage
from ...core.models import ChannelType, User
from ..dependencies import get_container, get_current_user
from ..schemas.dto import ChatRequest

router = APIRouter(prefix="/chat", tags=["chat"])


def _external_id(user: User, session_id: str) -> str:
    """O cliente logado usa sempre a mesma conversa; visitantes usam a sessão."""
    return f"user:{user.id}" if user.role == "cliente" else f"web:{session_id}"


@router.post("")
async def send_message(
    payload: ChatRequest,
    user: User = Depends(get_current_user),
    container: ApplicationContainer = Depends(get_container),
) -> dict[str, Any]:
    external_id = _external_id(user, payload.session_id)
    answer = await container.web_channel.process(
        InboundMessage(
            channel=ChannelType.WEB.value,
            external_id=external_id,
            text=payload.message,
            display_name=user.display_name or payload.display_name,
        )
    )
    conversation = await container.conversation_service.get_or_create(
        ChannelType.WEB.value, external_id, user.display_name
    )
    return {
        "conversation_id": conversation.id,
        "reply": answer,
        "handoff": conversation.handoff,
    }


@router.get("/history")
async def history(
    session_id: str = "",
    user: User = Depends(get_current_user),
    container: ApplicationContainer = Depends(get_container),
) -> dict[str, Any]:
    external_id = _external_id(user, session_id)
    conversation = await container.conversation_service.get_or_create(
        ChannelType.WEB.value, external_id, user.display_name
    )
    messages = await container.conversation_service.history(conversation.id, 200)
    return {
        "conversation_id": conversation.id,
        "handoff": conversation.handoff,
        "messages": [
            m.to_dict() for m in messages if m.author in ("user", "assistant", "human_agent")
        ],
    }


@router.get("/export")
async def export_my_conversation(
    session_id: str = "",
    format: str = Query(default="txt", pattern="^(txt|md|html)$"),
    user: User = Depends(get_current_user),
    container: ApplicationContainer = Depends(get_container),
) -> Response:
    """Baixa a própria conversa: o paciente sempre pode levar uma cópia."""
    conversation = await container.conversation_service.get_or_create(
        ChannelType.WEB.value, _external_id(user, session_id), user.display_name
    )
    arquivo = await container.export_service.export(conversation.id, format)
    return Response(
        content=arquivo.data,
        media_type=arquivo.content_type,
        headers={"Content-Disposition": f'attachment; filename="{arquivo.filename}"'},
    )


@router.get("/my-appointments")
async def my_appointments(
    user: User = Depends(get_current_user),
    container: ApplicationContainer = Depends(get_container),
) -> list[dict[str, Any]]:
    """Agendamentos do paciente vinculado ao usuário logado."""
    external_id = _external_id(user, "")
    conversation = await container.conversation_service.get_or_create(
        ChannelType.WEB.value, external_id, user.display_name
    )
    patient_id = user.linked_id or conversation.patient_id
    if not patient_id:
        return []
    return [a.to_dict() for a in await container.appointment_service.list_all(patient_id=patient_id)]
