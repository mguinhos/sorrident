"""Base dos canais de atendimento e o orquestrador de mensagens recebidas."""
from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from datetime import datetime, timedelta
from typing import Any, Optional

from ..core.interfaces import AgentContext, IAgent, IMessagingChannel
from ..core.models import ChannelType, MessageAuthor
from ..domain.services.interfaces import (
    IConversationService,
    IPatientService,
    ISettingsService,
)

logger = logging.getLogger(__name__)


class InboundMessage:
    """Mensagem recebida por qualquer canal (Value Object)."""

    def __init__(
        self,
        channel: str,
        external_id: str,
        text: str,
        display_name: str = "",
        metadata: Optional[dict[str, Any]] = None,
    ) -> None:
        self.channel = channel
        self.external_id = str(external_id)
        self.text = text
        self.display_name = display_name or "Visitante"
        self.metadata: dict[str, Any] = metadata or {}


class IMessageDispatcher(ABC):
    """Trata uma mensagem recebida por qualquer canal."""

    @abstractmethod
    async def handle(self, inbound: InboundMessage) -> Optional[str]: ...


class MessageDispatcher(IMessageDispatcher):
    """Fluxo único de tratamento de mensagens, comum a todos os canais.

    Centraliza: resolução da conversa, persistência do histórico, decisão de
    handoff e chamada ao agente (GRASP — Controller / Pure Fabrication).
    """

    def __init__(
        self,
        agent: IAgent,
        conversations: IConversationService,
        patients: IPatientService,
        settings: ISettingsService,
        scheduling: Optional[ISchedulingService] = None,
        procedures: Optional[IProcedureService] = None,
        dentists: Optional[IDentistService] = None,
        appointments: Optional[IAppointmentService] = None,
    ) -> None:
        self._agent = agent
        self._conversations = conversations
        self._patients = patients
        self._settings = settings
        self._scheduling = scheduling
        self._procedures = procedures
        self._dentists = dentists
        self._appointments = appointments
        self._visitor_state: dict[str, dict] = {}

    def _waiting_notice(self, settings: Any) -> str:
        """Aviso de espera com o prazo prometido ao paciente."""
        eta = max(1, getattr(settings, "handoff_eta_minutes", 5) or 5)
        plural = "s" if eta > 1 else ""
        return (
            "Sua solicitação já está com a equipe da SorriDente e um atendente responde por aqui "
            f"em até {eta} minuto{plural}. Se for uma emergência com dor intensa, sangramento que "
            "não para ou inchaço no rosto, procure um pronto-socorro odontológico."
        )

    async def _should_send_waiting_notice(self, conversation: Any, settings: Any = None) -> bool:
        """Evita repetir o aviso de espera a cada mensagem do paciente."""
        if settings is None:
            settings = await self._settings.get()
        if not conversation.handoff_notice_at:
            return True
        try:
            enviado = datetime.fromisoformat(conversation.handoff_notice_at)
        except ValueError:
            return True
        return datetime.now() - enviado >= timedelta(
            minutes=max(1, settings.handoff_notice_cooldown_minutes)
        )

    async def _registration_summary(self, patient_id: str) -> str:
        """Resumo curto do cadastro, para o prompt saber o que já foi coletado."""
        if not patient_id:
            return ""
        try:
            patient = await self._patients.get(patient_id)
        except Exception:  # noqa: BLE001 - sem cadastro é um estado válido
            return ""
        faltando = [
            campo
            for campo, valor in (
                ("nome completo", patient.name),
                ("idade", patient.age),
                ("convênio", patient.insurance_provider),
                ("e-mail", patient.email),
            )
            if not valor
        ]
        pendencia = f"falta: {', '.join(faltando)}" if faltando else "completo"
        return f"{patient.name or 'sem nome'} — cadastro {pendencia}"

    async def _fallback_reply(self, inbound: InboundMessage, conversation: Any) -> str:
        """Fluxo guiado de agendamento para o modo visitante (sem IA)."""
        state = self._visitor_state.get(conversation.id, {})
        text = (inbound.text or "").strip()
        t = text.lower()

        try:
            settings = await self._settings.get()
        except Exception:  # noqa: BLE001
            settings = None
        clinica = getattr(settings, "clinic_name", None) or "SorriDente"
        telefone = getattr(settings, "phone", None) or ""
        abertura = getattr(settings, "opening_hour", None) or "08:00"
        fechamento = getattr(settings, "closing_hour", None) or "18:00"

        # Usuário logado: não pede nome/telefone; usa os dados da conta.
        if inbound.metadata.get("logado"):
            if not state and any(k in t for k in ("agendar", "consulta", "marcar")):
                state = {"step": "date", "name": inbound.display_name or "Paciente"}
                self._visitor_state[conversation.id] = state
                sugestoes = []
                if self._scheduling is not None:
                    from datetime import date as _date, timedelta as _td
                    hoje = _date.today()
                    for i in range(7):
                        dia = hoje + _td(days=i)
                        try:
                            slots = await self._scheduling.available_slots(dia)
                        except Exception:  # noqa: BLE001
                            slots = []
                        if slots:
                            sugestoes.append(dia.strftime("%d/%m/%Y"))
                if sugestoes:
                    return (
                        f"Vou ajudar a agendar para {state['name']}. "
                        "Para qual data você prefere? Datas com horários livres esta semana:\n- "
                        + "\n- ".join(sugestoes[:5])
                        + "."
                    )
                return f"Vou ajudar a agendar para {state['name']}. Para qual data você prefere?"

        # Início do fluxo de agendamento (visitante)
        if not state and any(k in t for k in ("agendar", "consulta", "marcar")):
            self._visitor_state[conversation.id] = {"step": "name"}
            return (
                f"Vou ajudar a agendar na {clinica}. Qual é o seu nome completo?"
            )

        if state.get("step") == "name":
            state["name"] = text
            state["step"] = "phone"
            self._visitor_state[conversation.id] = state
            return "Qual é o seu telefone (com DDD)?"

        if state.get("step") == "phone":
            state["phone"] = text
            state["step"] = "date"
            self._visitor_state[conversation.id] = state
            sugestoes = []
            if self._scheduling is not None:
                from datetime import date as _date, timedelta as _td
                hoje = _date.today()
                for i in range(7):
                    dia = hoje + _td(days=i)
                    try:
                        slots = await self._scheduling.available_slots(dia)
                    except Exception:  # noqa: BLE001
                        slots = []
                    if slots:
                        sugestoes.append(dia.strftime("%d/%m/%Y"))
            if sugestoes:
                return (
                    "Para qual data você prefere? Datas com horários livres esta semana:\n- "
                    + "\n- ".join(sugestoes[:5])
                    + "."
                )
            return "Para qual data você prefere?"

        if state.get("step") == "date":
            try:
                from datetime import datetime as _datetime
                for fmt in ("%d-%m-%Y", "%d/%m/%Y"):
                    try:
                        day = _datetime.strptime(text, fmt).date()
                        break
                    except ValueError:
                        continue
                else:
                    raise ValueError
            except ValueError:
                return "Data inválida. Use o formato DD/MM/AAAA (ex.: 20/12/2025)."
            if self._scheduling is None:
                self._visitor_state.pop(conversation.id, None)
                return "Agendamento indisponível no momento. Um atendente assume em instantes."
            slots = await self._scheduling.available_slots(day)
            if not slots:
                return "Não há horários livres nessa data. Tente outra data (DD-MM-AAAA)."
            state["date"] = text
            state["slots"] = slots
            state["step"] = "slot"
            self._visitor_state[conversation.id] = state
            linhas = [f"{i+1}. {str(s.get('start', ''))[11:16]}" for i, s in enumerate(slots[:8])]
            return "Horários disponíveis:\n" + "\n".join(linhas) + "\nDigite o número do horário desejado."

        if state.get("step") == "slot":
            slots = state.get("slots") or []
            slot = None
            texto = (text or "").strip()
            # aceita número da lista ou o próprio horário (HH:MM)
            try:
                idx = int(texto) - 1
                if 0 <= idx < len(slots):
                    slot = slots[idx]
            except ValueError:
                for s in slots:
                    start = str(s.get("start", ""))
                    hora = start[11:16] if len(start) >= 16 else start
                    if texto == hora:
                        slot = s
                        break
            if slot is None:
                return "Opção inválida. Clique em um horário ou digite o número/opção."
            if self._appointments is None or self._patients is None:
                self._visitor_state.pop(conversation.id, None)
                return "Agendamento indisponível no momento. Um atendente assume em instantes."
            patient = await self._patients.get_or_create_by_channel(
                inbound.channel, inbound.external_id, state.get("name", "Visitante")
            )
            try:
                await self._patients.update(patient.id, phone=state.get("phone", ""))
            except Exception:  # noqa: BLE001
                pass
            from datetime import datetime as _dt
            start = _dt.fromisoformat(slot["start"]) if isinstance(slot.get("start"), str) else slot["start"]
            await self._appointments.schedule(
                patient_id=patient.id,
                start=start,
                dentist_id=slot.get("dentist_id", "") or "",
                origin="web",
            )
            self._visitor_state.pop(conversation.id, None)
            return f"Agendamento confirmado para {state.get('name')} em {slot.get('start')}. Obrigado!"

        # Informações gerais
        if any(k in t for k in ("telefone", "contato", "whatsapp", "fone")):
            if telefone:
                return f"O contato da {clinica} é {telefone}. Atendimento de {abertura} às {fechamento}."
            return f"Atendimento da {clinica}: de {abertura} às {fechamento}."
        if any(k in t for k in ("horário", "horario", "funciona", "abre", "fecha")):
            return f"A {clinica} atende de {abertura} às {fechamento}."
        return (
            "Posso ajudar com agendamentos, horários e contato da clínica. "
            "Digite 'agendar' para marcar uma consulta."
        )

    async def handle(self, inbound: InboundMessage) -> Optional[str]:
        conversation = await self._conversations.get_or_create(
            inbound.channel, inbound.external_id, inbound.display_name
        )
        await self._conversations.append(
            conversation.id, MessageAuthor.USER.value, inbound.text
        )

        if conversation.handoff:
            # O agente não responde no lugar da equipe, mas o paciente nunca fica no
            # vácuo: um aviso de espera é enviado, com intervalo mínimo entre eles.
            logger.info("Conversa %s em atendimento humano; agente silenciado.", conversation.id)
            settings = await self._settings.get()
            if not await self._should_send_waiting_notice(conversation, settings):
                return None
            notice = self._waiting_notice(settings)
            await self._conversations.append(
                conversation.id, MessageAuthor.ASSISTANT.value, notice
            )
            await self._conversations.mark_handoff_notice(conversation.id)
            return notice

        cadastro = await self._registration_summary(conversation.patient_id)
        if inbound.metadata.get("logado"):
            nome = (conversation.display_name or inbound.display_name or "").strip() or "Paciente"
            cadastro = (
                f"{nome} — identificado pela conta do portal. NÃO pergunte nome, idade, "
                "convênio, CPF, telefone nem e-mail; use os dados da conta e responda à "
                "pergunta do paciente."
            )
        context = AgentContext(
            conversation_id=conversation.id,
            channel=inbound.channel,
            external_id=inbound.external_id,
            patient_id=conversation.patient_id,
            display_name=conversation.display_name,
            metadata={**inbound.metadata, "cadastro": cadastro},
        )

        t_lower = (inbound.text or "").lower()
        # Usuário logado agendando: usa o fluxo guiado (sem pedir cadastro),
        # pois modelos pequenos podem ignorar a instrução e pedir dados já existentes.
        agendando_logado = bool(inbound.metadata.get("logado")) and (
            "agendar" in t_lower
            or "marcar consulta" in t_lower
            or "marcar uma consulta" in t_lower
            or t_lower.strip() in {"marcar", "agendar"}
        ) and "remarcar" not in t_lower and "cancelar" not in t_lower

        if agendando_logado:
            answer = await self._fallback_reply(inbound, conversation)
        else:
            try:
                answer = await self._agent.reply(context, inbound.text)
            except Exception as exc:  # noqa: BLE001 - nunca derruba o canal
                logger.exception("Falha do agente na conversa %s", conversation.id)
                answer = await self._fallback_reply(inbound, conversation)
        await self._conversations.append(
            conversation.id, MessageAuthor.ASSISTANT.value, answer
        )
        return answer


class BaseChannel(IMessagingChannel, ABC):
    """Comportamento comum a canais (estado de execução e despacho)."""

    def __init__(self, dispatcher: MessageDispatcher) -> None:
        self._dispatcher = dispatcher
        self._running = False

    @property
    def is_running(self) -> bool:
        return self._running

    @property
    @abstractmethod
    def channel_type(self) -> str: ...

    async def process(self, inbound: InboundMessage) -> Optional[str]:
        return await self._dispatcher.handle(inbound)

    @abstractmethod
    async def start(self) -> None: ...

    @abstractmethod
    async def stop(self) -> None: ...

    @abstractmethod
    async def send(self, external_id: str, text: str) -> bool: ...

    async def send_document(
        self,
        external_id: str,
        filename: str,
        data: bytes,
        content_type: str = "text/plain",
        caption: str = "",
    ) -> bool:
        """Canais que não transportam arquivo herdam esta recusa explícita."""
        return False


class WebChannel(BaseChannel):
    """Canal da interface web: entrega síncrona pela própria requisição HTTP."""

    @property
    def channel_type(self) -> str:
        return ChannelType.WEB.value

    async def start(self) -> None:
        self._running = True

    async def stop(self) -> None:
        self._running = False

    async def send(self, external_id: str, text: str) -> bool:
        # O front consome as mensagens pelo histórico/SSE; nada a enviar aqui.
        return True
