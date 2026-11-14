"""Rotas do chat do cliente na interface web."""
from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any, Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response

from ...container import ApplicationContainer
from ...channels.base import InboundMessage
from ...core.models import ChannelType, MessageAuthor, User
from ..dependencies import get_container, get_current_user, get_optional_user
from ..schemas.dto import ChatRequest

router = APIRouter(prefix="/chat", tags=["chat"])


# Estado de fluxo pré-programado para visitantes anônimos (sem Gemini).
# Chave = conversation_id.
_FLOW_STATE: dict[str, dict[str, Any]] = {}

_DIAS_SEMANA = {
    "segunda": 0, "terca": 1, "terça": 1, "quarta": 2, "quinta": 3,
    "sexta": 4, "sabado": 5, "sábado": 5, "domingo": 6,
}


def _parse_day(text: str) -> Optional[date]:
    t = text.lower().strip()
    hoje = datetime.now().date()
    if "hoje" in t:
        return hoje
    if "amanha" in t or "amanhã" in t:
        return hoje + timedelta(days=1)
    for nome, wd in _DIAS_SEMANA.items():
        if nome in t:
            # próximo dia da semana
            days_ahead = (wd - hoje.weekday()) % 7
            if days_ahead == 0:
                days_ahead = 7
            return hoje + timedelta(days=days_ahead)
    # tenta AAAA-MM-DD ou DD/MM
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d/%m"):
        try:
            d = datetime.strptime(t, fmt).date()
            if fmt == "%d/%m":
                d = d.replace(year=hoje.year)
            return d
        except ValueError:
            pass
    return None


async def _handle_anonymous_flow(container, conversation, user_text, display_name):
    """Fluxo pré-programado (sem LLM) para visitantes. Devolve a resposta ou None."""
    from ...domain.services.interfaces import ISettingsService
    cid = conversation.id
    state = _FLOW_STATE.get(cid, {"step": 0})
    text = user_text.strip()
    low = text.lower()

    # Gatilhos de início
    if "marcar uma consulta" in low or "marcar consulta" in low:
        _FLOW_STATE[cid] = {"step": 1, "name": "", "age": "", "insurance": "particular", "patient_id": ""}
        return "Ótimo! Para começar, qual é o seu nome completo?"

    if "dúvidas mais frequentes" in low or "duvidas mais frequentes" in low or "dúvidas frequentes" in low:
        faqs = await container.faq_service.list_all()
        itens = [f"• {f.question}" for f in faqs[:6]]
        return "Aqui estão as dúvidas mais frequentes:\n" + "\n".join(itens) + "\n\nPergunte sobre qualquer uma delas."

    if "remarcar" in low or "cancelar" in low:
        modo = "remarcar" if "remarcar" in low else "cancelar"
        _FLOW_STATE[cid] = {"step": "rc_nome", "modo": modo, "name": "", "appt_id": ""}
        return f"Para {modo}, qual é o seu nome completo?"

    # Resposta direta a uma pergunta frequente clicada
    faqs = await container.faq_service.list_all()
    for f in faqs:
        if f.question.strip().lower() == low or low in f.question.strip().lower():
            return f.answer

    if "falar com um atendente" in low or "falar com atendente" in low:
        await container.conversation_service.set_handoff(cid, True)
        await container.notification_service.notify(
            "Atendimento humano solicitado",
            f"{display_name} (web): {text}",
            "alerta",
            conversation_id=cid,
            whatsapp=True,
        )
        return "Vou chamar a equipe da clínica. Um atendente responde por aqui em instantes."

    if "urgência odontológica" in low or "urgencia odontologica" in low:
        _FLOW_STATE[cid] = {"step": 0, "urgency": True}
        return "Sinto muito! Descreva o que está acontecendo (dor, sangramento, dente quebrado) para eu te encaixar o quanto antes."

    if "horários estão disponíveis" in low or "horarios estao disponiveis" in low or "ver horários" in low:
        # mostra disponibilidade dos próximos dias
        lines = []
        for i in range(7):
            day = datetime.now().date() + timedelta(days=i)
            slots = await container.scheduling_service.available_slots(day)
            if slots:
                horas = ", ".join(s["start"][11:16] for s in slots[:6])
                lines.append(f"• {day.strftime('%d/%m')}: {horas}")
        if not lines:
            return "Não há horários livres nos próximos dias. Tente novamente mais tarde."
        return "Horários livres nos próximos dias:\n" + "\n".join(lines) + "\n\nMe diga o dia e período (manhã/tarde) que prefere."

    # Fluxo de remarcar/cancelar
    if state.get("step") == "rc_nome":
        if len(text.split()) < 2:
            return "Por favor, informe seu nome completo."
        state["name"] = text.strip()
        state["step"] = "rc_data"
        _FLOW_STATE[cid] = state
        return "Qual o dia da consulta? (dd/mm)"

    if state.get("step") == "rc_data":
        import re as _re
        dm = _re.search(r"(\d{1,2})[/-](\d{1,2})", text)
        if not dm:
            return "Não entendi o dia. Use DD/MM (ex.: 16/11)."
        d, m = int(dm.group(1)), int(dm.group(2))
        year = datetime.now().year
        try:
            dia = datetime(year, m, d).date()
        except ValueError:
            return "Data inválida. Tente novamente (DD/MM)."
        state["dia"] = dia.isoformat()
        state["step"] = "rc_hora"
        _FLOW_STATE[cid] = state
        return "Qual o horário da consulta? (hh:mm)"

    if state.get("step") == "rc_hora":
        import re as _re
        tm = _re.search(r"(\d{1,2}):(\d{2})", text)
        if not tm:
            return "Não entendi o horário. Use HH:MM (hh:mm)."
        hh, mm = int(tm.group(1)), int(tm.group(2))
        day = datetime.fromisoformat(state["dia"]).date()
        try:
            alvo = datetime(day.year, day.month, day.day, hh, mm)
        except ValueError:
            return "Hora inválida. Tente novamente (HH:MM)."
        # localiza o paciente pelo nome (evita criar cadastro novo)
        pacientes = [pp for pp in await container.patient_service.list_all()
                    if state["name"].strip().lower() in (pp.name or "").lower()]
        appts = []
        for pp in pacientes:
            appts.extend(await container.appointment_service.list_all(patient_id=pp.id))
        if not appts:
            # fallback: busca por horário em todos os agendamentos
            todos = await container.appointment_service.list_all()
            appts = [a for a in todos if state["name"].strip().lower() in (a.patient_name or "").lower()]
        alvo_str = alvo.strftime("%Y-%m-%dT%H:%M")
        escolhido = None
        for a in appts:
            if (a.start or "")[:16].replace(" ", "T") == alvo_str[:16]:
                escolhido = a
                break
        if escolhido is None:
            state["step"] = "rc_data"
            _FLOW_STATE[cid] = state
            return "Não encontrei uma consulta nesse horário. Verifique o dia e a hora."
        state["appt_id"] = escolhido.id
        if state.get("modo") == "cancelar":
            await container.appointment_service.cancel(escolhido.id, "Cancelado pelo paciente via chat")
            _FLOW_STATE[cid] = {"step": 0}
            return f"Consulta cancelada: {alvo.strftime('%d/%m/%Y')} às {alvo.strftime('%H:%M')}. Posso ajudar com mais alguma coisa?"
        state["step"] = "rc_novo_data"
        _FLOW_STATE[cid] = state
        return "Para qual novo dia? (ex.: 17/11)"

    if state.get("step") == "rc_novo_data":
        import re as _re
        dm = _re.search(r"(\d{1,2})[/-](\d{1,2})", text)
        if not dm:
            return "Não entendi o dia. Use DD/MM (ex.: 17/11)."
        d, m = int(dm.group(1)), int(dm.group(2))
        year = datetime.now().year
        try:
            dia = datetime(year, m, d).date()
        except ValueError:
            return "Data inválida. Tente novamente (DD/MM)."
        state["novo_dia"] = dia.isoformat()
        state["step"] = "rc_novo_hora"
        _FLOW_STATE[cid] = state
        return "Qual o novo horário? (hh:mm)"

    if state.get("step") == "rc_novo_hora":
        import re as _re
        tm = _re.search(r"(\d{1,2}):(\d{2})", text)
        if not tm:
            return "Não entendi o horário. Use HH:MM (hh:mm)."
        hh, mm = int(tm.group(1)), int(tm.group(2))
        day = datetime.fromisoformat(state["novo_dia"]).date()
        try:
            novo = datetime(day.year, day.month, day.day, hh, mm)
        except ValueError:
            return "Hora inválida. Tente novamente (HH:MM)."
        appt = await container.appointment_service.reschedule(state["appt_id"], novo)
        _FLOW_STATE[cid] = {"step": 0}
        return f"Consulta remarcada para {novo.strftime('%d/%m/%Y')} às {novo.strftime('%H:%M')}. Posso ajudar com mais alguma coisa?"

    if state.get("step") == "rc_novo":
        import re as _re
        dm = _re.search(r"(\d{1,2})[/-](\d{1,2})", text)
        tm = _re.search(r"(\d{1,2}):(\d{2})", text)
        if not dm or not tm:
            return "Não entendi. Use o formato DD/MM HH:MM (ex.: 17/11 09:00)."
        d, m = int(dm.group(1)), int(dm.group(2))
        hh, mm = int(tm.group(1)), int(tm.group(2))
        year = datetime.now().year
        try:
            novo = datetime(year, m, d, hh, mm)
        except ValueError:
            return "Data/hora inválida. Tente novamente (DD/MM HH:MM)."
        appt = await container.appointment_service.reschedule(state["appt_id"], novo)
        _FLOW_STATE[cid] = {"step": 0}
        return f"Consulta remarcada para {novo.strftime('%d/%m/%Y')} às {novo.strftime('%H:%M')}. Posso ajudar com mais alguma coisa?"

    if state.get("step") == "confirmar":
        appt_id = state.get("appt_id", "")
        lowt = text.strip().lower()
        if lowt in ("sim", "s", "yes", "confirmar", "confirmo"):
            try:
                await container.appointment_service.set_status(appt_id, "confirmado")
            except Exception:  # noqa: BLE001
                pass
            _FLOW_STATE[cid] = {"step": 0}
            return "Consulta confirmada! Posso ajudar com mais alguma coisa?"
        _FLOW_STATE[cid] = {"step": 0}
        return "Ok, consulta agendada (a confirmar). Posso ajudar com mais alguma coisa?"

    step = state.get("step", 0)

    # Passo 1: coletar nome
    if step == 1:
        if len(text.split()) < 2:
            return "Por favor, informe seu nome completo."
        state["name"] = text.strip()
        state["step"] = 2
        _FLOW_STATE[cid] = state
        return f"Prazer, {text.split()[0]}! Qual é a sua idade?"

    # Passo 2: coletar idade
    if step == 2:
        digits = "".join(c for c in text if c.isdigit())
        if not digits:
            return "Por favor, informe sua idade em números."
        state["age"] = digits
        state["step"] = 3
        _FLOW_STATE[cid] = state
        return "Você tem convênio odontológico? Se sim, qual?"

    # Passo 3: convênio + mostrar dias
    if step == 3:
        lowt = text.strip().lower()
        if lowt in ("nao", "não", "no", "nao tenho", "não tenho", "nenhum", "sus"):
            state["insurance"] = "SUS"
        else:
            state["insurance"] = text.strip() if text.strip() else "SUS"
        state["step"] = 4
        _FLOW_STATE[cid] = state
        # Sugestões de dias (apenas dias, sem horários)
        linhas = []
        for i in range(7):
            day = datetime.now().date() + timedelta(days=i)
            slots = await container.scheduling_service.available_slots(day)
            if slots:
                linhas.append(f"• {day.strftime('%d/%m')} ({day.strftime('%a')})")
        sugestao = "\n".join(linhas) if linhas else "Sem horários livres nos próximos dias."
        return (
            "Dias com horários livres (a partir de hoje):\n"
            + sugestao
            + "\n\nQual dia você prefere?"
        )

    # Passo 4: mostrar horários
    if step == 4:
        day = _parse_day(text)
        if day is None:
            return "Não entendi o dia. Tente: hoje, amanhã, segunda, ou uma data (dd/mm)."
        state["day"] = day.isoformat()
        state["step"] = 5
        _FLOW_STATE[cid] = state
        return f"Dia escolhido: {day.strftime('%d/%m')}. Qual período você prefere? (manhã ou tarde)"

    if step == 5:
        day = datetime.fromisoformat(state.get("day", "")).date() if state.get("day") else None
        if day is None:
            state["step"] = 4
            _FLOW_STATE[cid] = state
            return "Qual dia você prefere?"
        periodo = "qualquer"
        lowt = text.lower()
        if "manh" in lowt:
            periodo = "manha"
        elif "tarde" in lowt:
            periodo = "tarde"
        slots = await container.scheduling_service.available_slots(day)
        if periodo == "manha":
            slots = [s for s in slots if int(s["start"][11:13]) < 12]
        elif periodo == "tarde":
            slots = [s for s in slots if int(s["start"][11:13]) >= 12]
        if not slots:
            state["step"] = 4
            _FLOW_STATE[cid] = state
            return f"Não há horários livres em {day.strftime('%d/%m')} nesse período. Tente outro dia/período."
        state["periodo"] = periodo
        state["step"] = 6
        _FLOW_STATE[cid] = state
        horas = ", ".join(s["start"][11:16] for s in slots[:6])
        return f"Horários livres em {day.strftime('%d/%m')}: {horas}.\nQual horário você prefere?"

    # Passo 6: escolher horário
    if step == 6:
        import re as _re
        m = _re.search(r"(\d{1,2}):(\d{2})", text)
        if not m:
            return "Informe o horário."
        hh = m.group(1).zfill(2)
        mm = m.group(2)
        state["hora"] = f"{hh}:{mm}"
        state["step"] = 7
        _FLOW_STATE[cid] = state
        dentists = await container.dentist_service.list_all(only_active=True)
        nomes = ", ".join(d.name for d in dentists)
        return f"Horário escolhido: {state['hora']}. Qual profissional você prefere?\n[[profissionais: {nomes}]]"

    # Passo 7: escolher profissional e agendar
    if step == 7:
        hora = state.get("hora", "")
        if not hora:
            state["step"] = 6
            _FLOW_STATE[cid] = state
            return "Qual horário você prefere?"
        day = date.fromisoformat(state["day"])
        hh, mm = hora.split(":")
        start = datetime(day.year, day.month, day.day, int(hh), int(mm))
        dentist_id = ""
        dentists = await container.dentist_service.list_all(only_active=True)
        lowt = text.lower()
        if lowt not in ("qualquer", "qualquer um", "tanto faz", "indiferente"):
            for d in dentists:
                if d.name.lower() in lowt or lowt in d.name.lower():
                    dentist_id = d.id
                    break
        patient = await container.patient_service.get_or_create_by_channel("web", conversation.external_id, state["name"])
        await container.patient_service.update(patient.id, age=state.get("age", ""), insurance_provider=state.get("insurance", "particular"))
        await container.conversation_service.link_patient(conversation.id, patient.id)
        try:
            appt = await container.appointment_service.schedule(
                patient_id=patient.id,
                start=start,
                dentist_id=dentist_id,
                origin="web",
            )
        except Exception as exc:  # noqa: BLE001
            # Tenta outro profissional no mesmo horário
            outros = [d for d in dentists if d.id != dentist_id]
            for cand in outros:
                try:
                    appt = await container.appointment_service.schedule(
                        patient_id=patient.id,
                        start=start,
                        dentist_id=cand.id,
                        origin="web",
                    )
                    _FLOW_STATE[cid] = {"step": 0}
                    try:
                        _dt = datetime.fromisoformat(str(appt.start).replace(" ", "T"))
                        _data = _dt.strftime("%d/%m/%Y")
                        _hora = _dt.strftime("%H:%M")
                    except ValueError:
                        _data = str(appt.start)[:10]
                        _hora = str(appt.start)[11:16]
                    if dentist_id and dentist_id != cand.id:
                        nome_escolhido = next((d.name for d in dentists if d.id == dentist_id), "")
                        state["appt_id"] = appt.id
                        state["step"] = "confirmar"
                        _FLOW_STATE[cid] = state
                        return f"O horário não estava disponível para {nome_escolhido}, mas marquei com {appt.dentist_name}: {_data} às {_hora}. Chegue 10 minutos antes. Deseja confirmar a consulta agora? (sim/não)"
                    state["appt_id"] = appt.id
                    state["step"] = "confirmar"
                    _FLOW_STATE[cid] = state
                    return f"Consulta marcada para {_data} às {_hora}, com {appt.dentist_name}. Chegue 10 minutos antes. Deseja confirmar a consulta agora? (sim/não)"
                except Exception:  # noqa: BLE001
                    continue
            # Sem profissional disponível: volta para escolher horário
            state["step"] = 6
            state.pop("hora", None)
            _FLOW_STATE[cid] = state
            slots = await container.scheduling_service.available_slots(day, "", 0)
            periodo = state.get("periodo", "qualquer")
            if periodo == "manha":
                slots = [sl for sl in slots if int(sl["start"][11:13]) < 12]
            elif periodo == "tarde":
                slots = [sl for sl in slots if int(sl["start"][11:13]) >= 12]
            horas = ", ".join(sl["start"][11:16] for sl in slots[:6])
            return f"Não foi possível agendar: {exc}. Horários livres em {day.strftime('%d/%m')}: {horas}.\nQual horário você prefere?"
        _FLOW_STATE[cid] = {"step": 0}
        try:
            _dt = datetime.fromisoformat(str(appt.start).replace(" ", "T"))
            _data = _dt.strftime("%d/%m/%Y")
            _hora = _dt.strftime("%H:%M")
        except ValueError:
            _data = str(appt.start)[:10]
            _hora = str(appt.start)[11:16]
        state["appt_id"] = appt.id
        state["step"] = "confirmar"
        _FLOW_STATE[cid] = state
        return f"Consulta marcada para {_data} às {_hora}, com {appt.dentist_name}. Chegue 10 minutos antes. Deseja confirmar a consulta agora? (sim/não)"

    # Fora de fluxo: orienta
    return "Use as opções abaixo para começar. Isto é uma demonstração. Para ver seus agendamentos, crie sua conta e faça o login."


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

    # Visitante anônimo: fluxo pré-programado, sem Gemini.
    if user is None:
        answer = await _handle_anonymous_flow(container, conversation, payload.message, payload.display_name or "Visitante")
        await container.conversation_service.append(conversation.id, MessageAuthor.USER.value, payload.message)
        await container.conversation_service.append(conversation.id, MessageAuthor.ASSISTANT.value, answer)
        conversation = await container.conversation_service.get_or_create(
            ChannelType.WEB.value, external_id, payload.display_name or "Visitante"
        )
        return {
            "conversation_id": conversation.id,
            "reply": answer,
            "handoff": conversation.handoff,
        }

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
