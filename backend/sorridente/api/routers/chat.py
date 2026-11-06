"""Rotas do chat do cliente na interface web."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response

from ...container import ApplicationContainer
from ...channels.base import InboundMessage
from ...core.models import ChannelType, User
from ..dependencies import get_container, get_current_user, get_optional_user
from ..schemas.dto import ChatRequest

router = APIRouter(prefix="/chat", tags=["chat"])


def _external_id(user: Optional[User], session_id: str) -> str:
    """O cliente logado usa sempre a mesma conversa; visitantes usam a sessão."""
    if user is not None and user.role == "cliente":
        return f"user:{user.id}"
    return f"web:{session_id}"


async def _ensure_patient_link(
    container: ApplicationContainer,
    user: Optional[User],
    conversation: Any,
) -> None:
    """Vincula a conversa ao paciente do usuário logado para o painel de agendamentos."""
    if user is None or not user.linked_id or conversation.patient_id == user.linked_id:
        return
    await container.conversation_service.link_patient(conversation.id, user.linked_id)


@router.post("")
async def send_message(
    payload: ChatRequest,
    user: Optional[User] = Depends(get_optional_user),
    container: ApplicationContainer = Depends(get_container),
) -> dict[str, Any]:
    external_id = _external_id(user, payload.session_id)
    conversation = await container.conversation_service.get_or_create(
        ChannelType.WEB.value, external_id, user.display_name if user else payload.display_name
    )
    await _ensure_patient_link(container, user, conversation)
    answer = await container.web_channel.process(
        InboundMessage(
            channel=ChannelType.WEB.value,
            external_id=external_id,
            text=payload.message,
            display_name=(user.display_name if user else payload.display_name) or "Visitante",
            metadata={"logado": user is not None},
        )
    )
    conversation = await container.conversation_service.get_or_create(
        ChannelType.WEB.value, external_id, user.display_name if user else payload.display_name
    )
    return {
        "conversation_id": conversation.id,
        "reply": answer,
        "handoff": conversation.handoff,
    }


@router.get("/history")
async def history(
    session_id: str = "",
    user: Optional[User] = Depends(get_optional_user),
    container: ApplicationContainer = Depends(get_container),
) -> dict[str, Any]:
    external_id = _external_id(user, session_id)
    conversation = await container.conversation_service.get_or_create(
        ChannelType.WEB.value, external_id, user.display_name if user else "Visitante"
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
    user: Optional[User] = Depends(get_optional_user),
    container: ApplicationContainer = Depends(get_container),
) -> Response:
    """Baixa a própria conversa: o paciente sempre pode levar uma cópia."""
    conversation = await container.conversation_service.get_or_create(
        ChannelType.WEB.value, _external_id(user, session_id), user.display_name if user else "Visitante"
    )
    arquivo = await container.export_service.export(conversation.id, format)
    return Response(
        content=arquivo.data,
        media_type=arquivo.content_type,
        headers={"Content-Disposition": f'attachment; filename="{arquivo.filename}"'},
    )


@router.get("/my-appointments")
async def my_appointments(
    user: Optional[User] = Depends(get_optional_user),
    container: ApplicationContainer = Depends(get_container),
) -> list[dict[str, Any]]:
    """Agendamentos da entidade do usuário logado (vazio para visitantes).

    Cada conta tem sua própria entidade de paciente: não herdamos pacientes
    vinculados à conversa do chat, para não misturar cadastros de outras pessoas.
    """
    if user is None or user.role != "cliente" or not user.linked_id:
        return []
    return [
        a.to_dict()
        for a in await container.appointment_service.list_all(patient_id=user.linked_id)
    ]


@router.post("/enviar-confirmacao-email")
async def enviar_confirmacao_email(
    user: Optional[User] = Depends(get_optional_user),
    container: ApplicationContainer = Depends(get_container),
) -> dict[str, Any]:
    """Envia por e-mail a confirmação das consultas agendadas do paciente.

    Chamado pelo chat quando a conversa carrega (a etiqueta "Hoje" aparece):
    garante que o aviso de agendamento chegue ao e-mail do cadastro, sem
    repetir e-mails já enviados.
    """
    if user is None or user.role != "cliente" or not user.linked_id:
        return {"enviados": 0}
    try:
        patient = await container.patient_service.get(user.linked_id)
    except Exception:  # noqa: BLE001 - sem ficha não há para quem enviar
        return {"enviados": 0}
    if not patient.email:
        return {"enviados": 0}

    agora = datetime.now()
    enviados = 0
    for appointment in await container.appointment_service.list_all(patient_id=user.linked_id):
        if appointment.confirmation_email_sent:
            continue
        if appointment.status in ("cancelado", "concluido", "faltou"):
            continue
        try:
            if datetime.fromisoformat(appointment.start) < agora:
                continue
        except ValueError:
            continue
        ok = await container.email_sender.send_appointment_confirmation(appointment, patient)
        if ok:
            await container.appointment_service.mark_confirmation_sent(appointment.id)
            enviados += 1
    return {"enviados": enviados}
