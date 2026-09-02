"""Ferramentas de suporte ao atendimento: escalonamento e encerramento."""
from __future__ import annotations

from typing import Any

from ...core.interfaces import AgentContext
from ...core.models import NotificationLevel
from ...domain.services.interfaces import IConversationService, INotificationService
from ...export.interfaces import IExportService
from ..base import BaseTool


class HumanHandoffTool(BaseTool):
    """Encaminha o atendimento para a equipe humana."""

    def __init__(self, notifications: INotificationService, conversations: IConversationService) -> None:
        self._notifications = notifications
        self._conversations = conversations

    @property
    def name(self) -> str:
        return "chamar_atendente_humano"

    @property
    def description(self) -> str:
        return (
            "Aciona a equipe da clínica quando o paciente pede atendimento humano, "
            "relata urgência (dor forte, sangramento, trauma) ou faz um pedido fora do seu alcance."
        )

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "motivo": {"type": "string", "description": "Resumo objetivo do pedido do paciente."},
                "urgente": {"type": "boolean", "description": "Marque true em caso de urgência clínica."},
                "assumir_conversa": {
                    "type": "boolean",
                    "description": (
                        "Marque true APENAS quando o paciente pedir explicitamente para falar "
                        "com uma pessoa. Isso silencia você até a equipe responder."
                    ),
                },
            },
            "required": ["motivo"],
        }

    async def run(
        self,
        context: AgentContext,
        motivo: str = "",
        urgente: bool = False,
        assumir_conversa: bool = False,
        **kwargs: Any,
    ) -> Any:
        # Em urgência clínica o agente continua no atendimento para oferecer o
        # encaixe: silenciar aqui deixaria o paciente sem resposta.
        if assumir_conversa:
            await self._conversations.set_handoff(context.conversation_id, True)

        await self._notifications.notify(
            "Urgência clínica" if urgente else "Atendimento humano solicitado",
            f"{context.display_name} ({context.channel}): {motivo}",
            NotificationLevel.ERRO.value if urgente else NotificationLevel.ALERTA.value,
            conversation_id=context.conversation_id,
            urgente=urgente,
        )
        if assumir_conversa:
            return {
                "status": "equipe_assumiu",
                "mensagem": "A equipe foi notificada e vai responder por aqui.",
                "instrucao_de_resposta": "Avise que a equipe foi acionada e que você aguarda com ele.",
            }
        return {
            "status": "equipe_avisada",
            "mensagem": "A equipe da clínica foi notificada.",
            "instrucao_de_resposta": (
                "Continue o atendimento normalmente. Se for urgência clínica, ofereça o "
                "encaixe com agendar_encaixe_urgencia e confirme o horário com o paciente."
            ),
        }


class EncerrarAtendimentoTool(BaseTool):
    """Encerra o atendimento quando o assunto se conclui."""

    def __init__(self, conversations: IConversationService) -> None:
        self._conversations = conversations

    @property
    def name(self) -> str:
        return "encerrar_atendimento"

    @property
    def description(self) -> str:
        return (
            "Encerra o atendimento quando o paciente se despede ou o assunto termina "
            "(consulta marcada, dúvida respondida e nada mais pendente). "
            "Envie a mensagem de despedida antes de chamar."
        )

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "resumo": {"type": "string", "description": "O que foi resolvido no atendimento."}
            },
            "required": [],
        }

    async def run(self, context: AgentContext, resumo: str = "", **kwargs: Any) -> Any:
        await self._conversations.close(
            context.conversation_id, resumo or "Atendimento concluído pelo agente."
        )
        return {
            "status": "encerrado",
            "instrucao_de_resposta": (
                "Escreva agora a mensagem final ao paciente: agradeça o contato, "
                "reforce em uma linha o que ficou combinado e diga que ele pode chamar "
                "de novo quando precisar. Não mencione encerramento de sistema."
            ),
        }


class ExportarConversaTool(BaseTool):
    """Envia ao paciente uma cópia da conversa em arquivo."""

    def __init__(self, exports: IExportService) -> None:
        self._exports = exports

    @property
    def name(self) -> str:
        return "exportar_conversa"

    @property
    def description(self) -> str:
        return (
            "Gera uma cópia do histórico desta conversa e envia como arquivo no próprio chat. "
            "Use quando o paciente pedir 'me manda uma cópia da conversa', 'exporta o chat' "
            "ou algo equivalente."
        )

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "formato": {
                    "type": "string",
                    "enum": ["txt", "md", "html"],
                    "description": "txt para leitura simples, html para imprimir ou salvar em PDF.",
                }
            },
            "required": [],
        }

    async def run(self, context: AgentContext, formato: str = "txt", **kwargs: Any) -> Any:
        resultado = await self._exports.export_and_send(context.conversation_id, formato or "txt")
        if resultado["entregue_no_chat"]:
            resultado["instrucao_de_resposta"] = (
                "Avise que o arquivo com a conversa acabou de ser enviado aqui no chat."
            )
        else:
            resultado["instrucao_de_resposta"] = (
                "Explique que neste canal o arquivo não pode ser anexado, mas que a cópia "
                "está disponível na área do paciente do site da clínica."
            )
        return resultado
