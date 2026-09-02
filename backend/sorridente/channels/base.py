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

    ESPERA = (
        "Sua solicitação já está com a equipe da SorriDente e alguém responde por aqui "
        "assim que possível. Se for uma emergência com dor intensa, sangramento que não "
        "para ou inchaço no rosto, procure um pronto-socorro odontológico."
    )

    def __init__(
        self,
        agent: IAgent,
        conversations: IConversationService,
        patients: IPatientService,
        settings: ISettingsService,
    ) -> None:
        self._agent = agent
        self._conversations = conversations
        self._patients = patients
        self._settings = settings

    async def _should_send_waiting_notice(self, conversation: Any) -> bool:
        """Evita repetir o aviso de espera a cada mensagem do paciente."""
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
                ("CPF", patient.document),
                ("telefone", patient.phone),
                ("data de nascimento", patient.birth_date),
            )
            if not valor
        ]
        pendencia = f"falta {', '.join(faltando)}" if faltando else "completo"
        return f"{patient.name or 'sem nome'} ({pendencia})"

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
            if not await self._should_send_waiting_notice(conversation):
                return None
            await self._conversations.append(
                conversation.id, MessageAuthor.ASSISTANT.value, self.ESPERA
            )
            await self._conversations.mark_handoff_notice(conversation.id)
            return self.ESPERA

        context = AgentContext(
            conversation_id=conversation.id,
            channel=inbound.channel,
            external_id=inbound.external_id,
            patient_id=conversation.patient_id,
            display_name=conversation.display_name,
            metadata={**inbound.metadata, "cadastro": await self._registration_summary(conversation.patient_id)},
        )
        try:
            answer = await self._agent.reply(context, inbound.text)
        except Exception as exc:  # noqa: BLE001 - nunca derruba o canal
            logger.exception("Falha do agente na conversa %s", conversation.id)
            answer = (
                "Tive um problema técnico agora. Pode tentar de novo em instantes? "
                "Se preferir, digito o contato da clínica para você."
            )
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
