"""Ferramentas disponíveis ao agente, agrupadas por responsabilidade."""
from .base_tools import PatientAwareTool
from .knowledge_tools import ClinicInfoTool, KnowledgeBaseTool
from .patient_tools import (
    AtualizarInformacoesClienteTool,
    CadastrarClienteTool,
    ConsultarCadastroTool,
)
from .scheduling_tools import (
    AgendarEncaixeUrgenciaTool,
    AvailableSlotsTool,
    ConfirmarPresencaTool,
    CancelAppointmentTool,
    ConsultarEncaixeUrgenciaTool,
    ListDentistsTool,
    ListProceduresTool,
    MarcarAgendamentoTool,
    MyAppointmentsTool,
    RescheduleAppointmentTool,
)
from .support_tools import (
    EncerrarAtendimentoTool,
    ExportarConversaTool,
    HumanHandoffTool,
)

__all__ = [
    "PatientAwareTool",
    "CadastrarClienteTool",
    "AtualizarInformacoesClienteTool",
    "ConsultarCadastroTool",
    "ListProceduresTool",
    "ListDentistsTool",
    "AvailableSlotsTool",
    "MarcarAgendamentoTool",
    "ConsultarEncaixeUrgenciaTool",
    "AgendarEncaixeUrgenciaTool",
    "MyAppointmentsTool",
    "CancelAppointmentTool",
    "ConfirmarPresencaTool",
    "RescheduleAppointmentTool",
    "KnowledgeBaseTool",
    "ClinicInfoTool",
    "HumanHandoffTool",
    "EncerrarAtendimentoTool",
    "ExportarConversaTool",
]
