"""Ferramentas de cadastro e atualização do paciente."""
from __future__ import annotations

from typing import Any

from ...core.interfaces import AgentContext
from ...core.models import NotificationLevel
from ...domain.repositories import PatientRepository
from ...domain.services.interfaces import (
    IConversationService,
    INotificationService,
    IPatientService,
)
from .base_tools import PatientAwareTool

CAMPOS_CADASTRO: dict[str, Any] = {
    "nome_completo": {"type": "string", "description": "Nome completo do paciente."},
    "cpf": {"type": "string", "description": "CPF, apenas números ou formatado."},
    "telefone": {"type": "string", "description": "Telefone com DDD."},
    "data_nascimento": {"type": "string", "description": "Data de nascimento (AAAA-MM-DD ou DD/MM/AAAA)."},
    "email": {"type": "string", "description": "E-mail para contato."},
    "convenio": {"type": "string", "description": "Convênio odontológico, ou 'particular'."},
    "carteirinha": {"type": "string", "description": "Número da carteirinha do convênio."},
    "responsavel": {"type": "string", "description": "Nome do responsável, se o paciente for menor de idade."},
    "observacoes": {"type": "string", "description": "Queixa principal ou observações relevantes."},
}


def _to_entity_fields(values: dict[str, Any]) -> dict[str, Any]:
    """Traduz os nomes usados pelo agente para os campos da entidade."""
    mapa = {
        "nome_completo": "name",
        "cpf": "document",
        "telefone": "phone",
        "data_nascimento": "birth_date",
        "email": "email",
        "convenio": "insurance_provider",
        "carteirinha": "insurance_card",
        "responsavel": "responsible_name",
        "observacoes": "notes",
        "tratamento": "treatment",
    }
    return {mapa[k]: v for k, v in values.items() if k in mapa and v}


class CadastrarClienteTool(PatientAwareTool):
    """Cria (ou completa) a ficha do paciente com os dados coletados."""

    def __init__(
        self,
        patients: IPatientService,
        conversations: IConversationService,
        notifications: INotificationService,
        repository: PatientRepository,
    ) -> None:
        super().__init__(patients, conversations)
        self._notifications = notifications
        self._repository = repository

    @property
    def name(self) -> str:
        return "cadastrar_cliente"

    @property
    def description(self) -> str:
        return (
            "Cadastra o paciente na clínica com nome completo, CPF, telefone e demais dados. "
            "Use assim que tiver ao menos nome completo e CPF; se o CPF já existir, o "
            "cadastro é reaproveitado e atualizado."
        )

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": dict(CAMPOS_CADASTRO),
            "required": ["nome_completo"],
        }

    async def run(self, context: AgentContext, **kwargs: Any) -> Any:
        values = {k: v for k, v in kwargs.items() if k in CAMPOS_CADASTRO and v}
        if not values.get("nome_completo"):
            return {"erro": "Peça o nome completo do paciente antes de cadastrar."}

        fields = _to_entity_fields(values)
        existente = await self.current_patient(context)
        if existente is None and values.get("cpf"):
            existente = await self._repository.find_by_document(values["cpf"])

        if existente is not None:
            patient = await self._patients.update(existente.id, **fields)
            criado = False
        else:
            canal_field = {"telegram": "telegram_id", "whatsapp": "whatsapp_id"}.get(context.channel)
            if canal_field and context.external_id:
                fields[canal_field] = context.external_id
            patient = await self._patients.create(**fields)
            criado = True

        await self.bind(context, patient)
        if criado:
            await self._notifications.notify(
                "Cadastro realizado pelo agente",
                f"{patient.name} — CPF {patient.document or 'não informado'} ({context.channel}).",
                NotificationLevel.SUCESSO.value,
                patient_id=patient.id,
            )
        return {
            "status": "cadastrado" if criado else "cadastro_atualizado",
            **self.summarize(patient),
        }


class AtualizarInformacoesClienteTool(PatientAwareTool):
    """Atualiza dados de um paciente já vinculado à conversa."""

    @property
    def name(self) -> str:
        return "atualizar_informacoes_cliente"

    @property
    def description(self) -> str:
        return (
            "Atualiza dados do paciente já cadastrado: telefone, e-mail, convênio, "
            "carteirinha, responsável ou observações clínicas."
        )

    @property
    def parameters(self) -> dict[str, Any]:
        return {"type": "object", "properties": dict(CAMPOS_CADASTRO), "required": []}

    async def run(self, context: AgentContext, **kwargs: Any) -> Any:
        values = {k: v for k, v in kwargs.items() if k in CAMPOS_CADASTRO and v}
        if not values:
            return {"erro": "Informe ao menos um campo para atualizar."}
        patient = await self.resolve_patient(context, values.get("nome_completo", ""))
        patient = await self._patients.update(patient.id, **_to_entity_fields(values))
        return {"status": "atualizado", **self.summarize(patient)}


class ConsultarCadastroTool(PatientAwareTool):
    """Mostra o cadastro atual e o que ainda falta pedir ao paciente."""

    @property
    def name(self) -> str:
        return "consultar_cadastro"

    @property
    def description(self) -> str:
        return (
            "Consulta o cadastro do paciente desta conversa e indica quais dados "
            "ainda faltam. Use antes de pedir informações, para não repetir perguntas."
        )

    async def run(self, context: AgentContext, **kwargs: Any) -> Any:
        patient = await self.current_patient(context)
        if patient is None:
            return {
                "cadastrado": False,
                "campos_faltando": ["nome_completo", "cpf", "telefone", "data_nascimento"],
                "orientacao": "Paciente ainda não cadastrado. Colete os dados e chame cadastrar_cliente.",
            }
        return {"cadastrado": True, **self.summarize(patient)}
