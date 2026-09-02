"""Ferramentas de agenda: consulta de horários, marcação e alterações."""
from __future__ import annotations

from typing import Any

from ...core.interfaces import AgentContext
from ...domain.services.interfaces import (
    IAppointmentService,
    IConversationService,
    IDentistService,
    IPatientService,
    IProcedureService,
    ISchedulingService,
)
from ..base import BaseTool
from .base_tools import PatientAwareTool


class ListProceduresTool(BaseTool):
    """Lista os procedimentos e valores da clínica."""

    def __init__(self, procedures: IProcedureService) -> None:
        self._procedures = procedures

    @property
    def name(self) -> str:
        return "listar_procedimentos"

    @property
    def description(self) -> str:
        return "Lista os procedimentos ortodônticos oferecidos, com duração e preço."

    async def run(self, context: AgentContext, **kwargs: Any) -> Any:
        return [
            {
                "id": p.id,
                "nome": p.name,
                "descricao": p.description,
                "duracao_minutos": p.duration_minutes,
                "preco": p.price,
            }
            for p in await self._procedures.list_all(only_active=True)
        ]


class ListDentistsTool(BaseTool):
    """Lista os profissionais ativos."""

    def __init__(self, dentists: IDentistService) -> None:
        self._dentists = dentists

    @property
    def name(self) -> str:
        return "listar_profissionais"

    @property
    def description(self) -> str:
        return "Lista os ortodontistas disponíveis na clínica."

    async def run(self, context: AgentContext, **kwargs: Any) -> Any:
        return [
            {"id": d.id, "nome": d.name, "cro": d.cro, "especialidade": d.specialty}
            for d in await self._dentists.list_all(only_active=True)
        ]


class AvailableSlotsTool(BaseTool):
    """Consulta horários livres em uma data."""

    def __init__(self, scheduling: ISchedulingService, procedures: IProcedureService) -> None:
        self._scheduling = scheduling
        self._procedures = procedures

    @property
    def name(self) -> str:
        return "consultar_horarios_disponiveis"

    @property
    def description(self) -> str:
        return (
            "Consulta os horários realmente livres para uma data. Use sempre antes de "
            "marcar, para oferecer apenas opções válidas ao paciente."
        )

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "data": {"type": "string", "description": "Data no formato AAAA-MM-DD."},
                "profissional_id": {"type": "string", "description": "Opcional: id do ortodontista."},
                "procedimento_id": {"type": "string", "description": "Opcional: id do procedimento desejado."},
                "periodo": {
                    "type": "string",
                    "enum": ["manha", "tarde", "qualquer"],
                    "description": "Preferência de período do paciente.",
                },
            },
            "required": ["data"],
        }

    async def run(
        self,
        context: AgentContext,
        data: str = "",
        profissional_id: str = "",
        procedimento_id: str = "",
        periodo: str = "qualquer",
        **kwargs: Any,
    ) -> Any:
        day = self.parse_datetime(data).date()
        duration = 0
        if procedimento_id:
            for procedure in await self._procedures.list_all():
                if procedure.id == procedimento_id:
                    duration = procedure.duration_minutes
                    break

        slots = await self._scheduling.available_slots(day, profissional_id, duration)
        if periodo == "manha":
            slots = [s for s in slots if int(s["start"][11:13]) < 12]
        elif periodo == "tarde":
            slots = [s for s in slots if int(s["start"][11:13]) >= 12]

        if not slots:
            return {
                "data": day.isoformat(),
                "horarios": [],
                "aviso": "Não há horários livres nesta data/período. Ofereça outra data ao paciente.",
            }
        return {"data": day.isoformat(), "horarios": slots[:20]}


class MarcarAgendamentoTool(PatientAwareTool):
    """Marca a consulta para o paciente da conversa."""

    def __init__(
        self,
        appointments: IAppointmentService,
        patients: IPatientService,
        procedures: IProcedureService,
        conversations: IConversationService,
    ) -> None:
        super().__init__(patients, conversations)
        self._appointments = appointments
        self._procedures = procedures

    @property
    def name(self) -> str:
        return "marcar_agendamento"

    @property
    def description(self) -> str:
        return (
            "Marca a consulta em um horário confirmado como livre. O paciente já deve "
            "estar cadastrado (use cadastrar_cliente antes) e ter confirmado o horário."
        )

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "data_hora": {"type": "string", "description": "Início da consulta em AAAA-MM-DDTHH:MM."},
                "procedimento_id": {"type": "string", "description": "Id do procedimento (listar_procedimentos)."},
                "procedimento": {"type": "string", "description": "Alternativa ao id: nome do procedimento."},
                "profissional_id": {"type": "string", "description": "Opcional: id do ortodontista escolhido."},
                "nome_paciente": {"type": "string", "description": "Nome completo, se ainda não cadastrado."},
                "telefone": {"type": "string", "description": "Telefone, se ainda não cadastrado."},
                "observacoes": {"type": "string", "description": "Queixa ou observação para a equipe."},
            },
            "required": ["data_hora"],
        }

    async def _resolve_procedure(self, name: str) -> str:
        """Aceita o nome do procedimento além do id, com correspondência parcial."""
        term = (name or "").strip().lower()
        if not term:
            return ""
        procedures = await self._procedures.list_all(only_active=True)
        for procedure in procedures:
            if procedure.name.lower() == term:
                return procedure.id
        for procedure in procedures:
            if term in procedure.name.lower() or procedure.name.lower() in term:
                return procedure.id
        return ""

    async def run(
        self,
        context: AgentContext,
        data_hora: str = "",
        procedimento_id: str = "",
        procedimento: str = "",
        profissional_id: str = "",
        nome_paciente: str = "",
        telefone: str = "",
        observacoes: str = "",
        **kwargs: Any,
    ) -> Any:
        patient = await self.current_patient(context)
        if patient is None:
            if not nome_paciente:
                return {
                    "erro": "Paciente não cadastrado. Colete nome completo e CPF e chame "
                    "cadastrar_cliente antes de marcar."
                }
            patient = await self.resolve_patient(context, nome_paciente, telefone)

        appointment = await self._appointments.schedule(
            patient_id=patient.id,
            start=self.parse_datetime(data_hora),
            dentist_id=profissional_id,
            procedure_id=procedimento_id or await self._resolve_procedure(procedimento),
            notes=observacoes,
            origin=context.channel,
        )
        return {
            "status": "confirmado",
            "agendamento_id": appointment.id,
            "paciente": appointment.patient_name,
            "inicio": appointment.start,
            "fim": appointment.end,
            "profissional": appointment.dentist_name,
            "procedimento": appointment.procedure_name,
        }


class MyAppointmentsTool(PatientAwareTool):
    """Lista os agendamentos do paciente da conversa."""

    def __init__(
        self,
        appointments: IAppointmentService,
        patients: IPatientService,
        conversations: IConversationService,
    ) -> None:
        super().__init__(patients, conversations)
        self._appointments = appointments

    @property
    def name(self) -> str:
        return "consultar_meus_agendamentos"

    @property
    def description(self) -> str:
        return "Lista as consultas do paciente que está conversando agora."

    async def run(self, context: AgentContext, **kwargs: Any) -> Any:
        patient = await self.current_patient(context)
        if patient is None:
            return {"aviso": "Paciente ainda não cadastrado, portanto não há agendamentos."}
        items = await self._appointments.list_all(patient_id=patient.id)
        return [
            {
                "agendamento_id": a.id,
                "inicio": a.start,
                "profissional": a.dentist_name,
                "procedimento": a.procedure_name,
                "status": a.status,
            }
            for a in items
        ] or {"aviso": "O paciente não possui agendamentos."}


class CancelAppointmentTool(BaseTool):
    """Cancela um agendamento existente."""

    def __init__(self, appointments: IAppointmentService) -> None:
        self._appointments = appointments

    @property
    def name(self) -> str:
        return "cancelar_agendamento"

    @property
    def description(self) -> str:
        return "Cancela uma consulta. Obtenha o id com consultar_meus_agendamentos."

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "agendamento_id": {"type": "string"},
                "motivo": {"type": "string", "description": "Motivo informado pelo paciente."},
            },
            "required": ["agendamento_id"],
        }

    async def run(
        self, context: AgentContext, agendamento_id: str = "", motivo: str = "", **kwargs: Any
    ) -> Any:
        appointment = await self._appointments.cancel(agendamento_id, motivo)
        return {"status": appointment.status, "agendamento_id": appointment.id}


class RescheduleAppointmentTool(BaseTool):
    """Remarca um agendamento."""

    def __init__(self, appointments: IAppointmentService) -> None:
        self._appointments = appointments

    @property
    def name(self) -> str:
        return "remarcar_agendamento"

    @property
    def description(self) -> str:
        return "Remarca uma consulta para um horário previamente confirmado como livre."

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "agendamento_id": {"type": "string"},
                "nova_data_hora": {"type": "string", "description": "AAAA-MM-DDTHH:MM"},
            },
            "required": ["agendamento_id", "nova_data_hora"],
        }

    async def run(
        self, context: AgentContext, agendamento_id: str = "", nova_data_hora: str = "", **kwargs: Any
    ) -> Any:
        appointment = await self._appointments.reschedule(
            agendamento_id, self.parse_datetime(nova_data_hora)
        )
        return {"status": "remarcado", "agendamento_id": appointment.id, "inicio": appointment.start}


class ConsultarEncaixeUrgenciaTool(BaseTool):
    """Verifica qual é o próximo horário possível para uma urgência."""

    def __init__(self, scheduling: ISchedulingService) -> None:
        self._scheduling = scheduling

    @property
    def name(self) -> str:
        return "consultar_encaixe_urgencia"

    @property
    def description(self) -> str:
        return (
            "Descobre o próximo horário viável para atender uma urgência hoje, mesmo com a "
            "agenda cheia. Use antes de oferecer o encaixe ao paciente."
        )

    async def run(self, context: AgentContext, **kwargs: Any) -> Any:
        slot = await self._scheduling.next_emergency_slot()
        return {
            "inicio": slot["start"],
            "profissional": slot["dentist_name"],
            "profissional_id": slot["dentist_id"],
            "e_encaixe": slot["encaixe"],
            "observacao": (
                "A agenda está cheia; este horário é um encaixe autorizado para urgências."
                if slot["encaixe"]
                else "Horário livre na grade."
            ),
        }


class AgendarEncaixeUrgenciaTool(PatientAwareTool):
    """Cria um encaixe de urgência, sobrepondo a grade quando necessário."""

    def __init__(
        self,
        appointments: IAppointmentService,
        patients: IPatientService,
        conversations: IConversationService,
    ) -> None:
        super().__init__(patients, conversations)
        self._appointments = appointments

    @property
    def name(self) -> str:
        return "agendar_encaixe_urgencia"

    @property
    def description(self) -> str:
        return (
            "Agenda um ENCAIXE DE URGÊNCIA para o paciente (dor forte, sangramento, aparelho "
            "machucando, dente quebrado). Funciona mesmo com a agenda cheia. Sempre confirme "
            "o horário com o paciente antes de chamar."
        )

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "motivo": {"type": "string", "description": "Descrição da urgência, nas palavras do paciente."},
                "data_hora": {
                    "type": "string",
                    "description": "Opcional: AAAA-MM-DDTHH:MM. Sem isso, usa o horário sugerido por consultar_encaixe_urgencia.",
                },
                "nome_paciente": {"type": "string", "description": "Nome completo, se ainda não cadastrado."},
                "telefone": {"type": "string", "description": "Telefone, se ainda não cadastrado."},
            },
            "required": ["motivo"],
        }

    async def run(
        self,
        context: AgentContext,
        motivo: str = "",
        data_hora: str = "",
        nome_paciente: str = "",
        telefone: str = "",
        **kwargs: Any,
    ) -> Any:
        patient = await self.current_patient(context)
        if patient is None:
            # Em urgência o cadastro mínimo é criado na hora: não se barra um paciente
            # com dor por falta de ficha completa.
            patient = await self.resolve_patient(context, nome_paciente, telefone)

        appointment = await self._appointments.schedule_emergency(
            patient_id=patient.id,
            reason=motivo,
            origin=context.channel,
            start=self.parse_datetime(data_hora) if data_hora else None,
        )
        return {
            "status": "encaixe_confirmado",
            "agendamento_id": appointment.id,
            "inicio": appointment.start,
            "profissional": appointment.dentist_name,
            "e_encaixe": appointment.is_encaixe,
            "orientacao_ao_paciente": (
                "Confirme o horário, oriente a chegar 10 minutos antes e avise que, por ser "
                "encaixe, pode haver uma pequena espera na recepção."
            ),
        }
