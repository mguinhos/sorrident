"""Bases compartilhadas pelas ferramentas do agente."""
from __future__ import annotations

from abc import ABC
from typing import Any, Optional

from ...core.interfaces import AgentContext
from ...core.models import Patient
from ...domain.services.interfaces import IConversationService, IPatientService
from ..base import BaseTool


class PatientAwareTool(BaseTool, ABC):
    """Ferramenta que opera sobre o paciente vinculado à conversa.

    Centraliza a resolução do paciente (busca por canal, por CPF ou criação) e
    o vínculo com a conversa, para que as ferramentas de cadastro e agenda não
    repitam essa regra.
    """

    def __init__(self, patients: IPatientService, conversations: IConversationService) -> None:
        self._patients = patients
        self._conversations = conversations

    async def current_patient(self, context: AgentContext) -> Optional[Patient]:
        """Paciente já vinculado a esta conversa, se houver."""
        if not context.patient_id:
            return None
        try:
            return await self._patients.get(context.patient_id)
        except Exception:  # noqa: BLE001 - cadastro removido: trata como inexistente
            return None

    async def bind(self, context: AgentContext, patient: Patient) -> Patient:
        context.patient_id = patient.id
        await self._conversations.link_patient(context.conversation_id, patient.id)
        return patient

    async def resolve_patient(
        self, context: AgentContext, name: str = "", phone: str = ""
    ) -> Patient:
        """Devolve o paciente da conversa, criando um cadastro mínimo se preciso."""
        patient = await self.current_patient(context)
        if patient is None:
            patient = await self._patients.get_or_create_by_channel(
                context.channel, context.external_id, name or context.display_name
            )
        updates: dict[str, Any] = {}
        if name and patient.name != name:
            updates["name"] = name
        if phone and patient.phone != phone:
            updates["phone"] = phone
        if updates:
            patient = await self._patients.update(patient.id, **updates)
        return await self.bind(context, patient)

    @staticmethod
    def summarize(patient: Patient) -> dict[str, Any]:
        """Resumo do cadastro com o que ainda falta preencher."""
        obrigatorios = {
            "nome_completo": patient.name,
            "cpf": patient.document,
            "telefone": patient.phone,
            "data_nascimento": patient.birth_date,
        }
        return {
            "paciente_id": patient.id,
            "nome_completo": patient.name,
            "cpf": patient.document,
            "telefone": patient.phone,
            "email": patient.email,
            "data_nascimento": patient.birth_date,
            "convenio": patient.insurance_provider,
            "carteirinha": patient.insurance_card,
            "responsavel": patient.responsible_name,
            "tratamento": patient.treatment,
            "campos_faltando": [campo for campo, valor in obrigatorios.items() if not valor],
        }
