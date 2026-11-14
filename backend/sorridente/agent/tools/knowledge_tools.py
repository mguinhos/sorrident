"""Ferramentas de consulta à base de conhecimento da clínica (RAG)."""
from __future__ import annotations

from typing import Any

from ...core.interfaces import AgentContext
from ...domain.services.interfaces import ISettingsService
from ...rag.interfaces import IKnowledgeService
from ..base import BaseTool


class KnowledgeBaseTool(BaseTool):
    """Recupera trechos relevantes da base da clínica para fundamentar a resposta."""

    def __init__(self, knowledge: IKnowledgeService) -> None:
        self._knowledge = knowledge

    @property
    def name(self) -> str:
        return "consultar_base_de_conhecimento"

    @property
    def description(self) -> str:
        return "Busca na base da clínica (FAQ, procedimentos, valores, convênios, cuidados). Use antes de responder sobre a clínica/tratamento."

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "pergunta": {"type": "string", "description": "Pergunta do paciente."},
                "limite": {"type": "integer", "description": "Trechos (padrão 4, máx 5)."},
            },
            "required": ["pergunta"],
        }

    async def run(
        self, context: AgentContext, pergunta: str = "", limite: int = 4, **kwargs: Any
    ) -> Any:
        return await self._knowledge.answer_context(pergunta, max(1, min(int(limite or 4), 5)))


class ClinicInfoTool(BaseTool):
    """Informações institucionais da clínica."""

    def __init__(self, settings: ISettingsService) -> None:
        self._settings = settings

    @property
    def name(self) -> str:
        return "informacoes_da_clinica"

    @property
    def description(self) -> str:
        return "Retorna endereço, telefone, e-mail e horário de funcionamento da clínica."

    async def run(self, context: AgentContext, **kwargs: Any) -> Any:
        settings = await self._settings.get()
        dias = ["segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"]
        return {
            "nome": settings.clinic_name,
            "endereco": settings.address,
            "telefone": settings.phone,
            "email": settings.email,
            "horario": f"{settings.opening_hour} às {settings.closing_hour}",
            "almoco": f"{settings.lunch_start} às {settings.lunch_end}",
            "dias_de_funcionamento": [dias[d] for d in settings.working_days if 0 <= d < 7],
        }
