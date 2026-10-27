"""Composition Root: monta o grafo de objetos da aplicação.

É o único lugar do sistema que conhece implementações concretas; todas as
demais camadas recebem abstrações por injeção de dependência.
"""
from __future__ import annotations

import logging
from typing import Any, Optional

from .agent.agent import SorriDenteAgent
from .agent.base import ToolRegistry
from .agent.context import CompositePolicy, SlidingWindowPolicy, TokenBudgetPolicy
from .agent.models import ModelCatalog
from .agent.prompt import ClinicPromptBuilder
from .agent.task import TaskTracker
from .agent.tools import (
    AgendarEncaixeUrgenciaTool,
    AtualizarInformacoesClienteTool,
    AvailableSlotsTool,
    CadastrarClienteTool,
    CancelAppointmentTool,
    ClinicInfoTool,
    ConsultarCadastroTool,
    ConsultarEncaixeUrgenciaTool,
    EncerrarAtendimentoTool,
    ExportarConversaTool,
    HumanHandoffTool,
    KnowledgeBaseTool,
    ListDentistsTool,
    ListProceduresTool,
    MarcarAgendamentoTool,
    MyAppointmentsTool,
    RescheduleAppointmentTool,
)
from .channels.base import MessageDispatcher, WebChannel
from .channels.manager import ChannelManager
from .channels.telegram import TelegramChannel
from .channels.whatsapp import WhatsAppChannel
from .config import AppConfig
from .domain.repositories import (
    AppointmentRepository,
    ConversationRepository,
    DentistRepository,
    FAQRepository,
    KnowledgeRepository,
    MessageRepository,
    NotificationRepository,
    PatientRepository,
    ProcedureRepository,
    SettingsRepository,
    UserRepository,
)
from .domain.services.clinic_services import (
    AnalyticsService,
    AppointmentService,
    AuthService,
    ConversationService,
    DentistService,
    FAQService,
    NotificationService,
    PatientService,
    ProcedureService,
    SchedulingService,
    SettingsService,
)
from .export import (
    ConversationExportService,
    HtmlExporter,
    MarkdownExporter,
    TextExporter,
)
from .infrastructure.credentials import JsonCredentialStore
from .infrastructure.database import TinyDBDatabase
from .infrastructure.event_bus import InMemoryEventBus
from .infrastructure.llm import GroqLLMProvider
from .integrations import (
    GroqInferenceIntegration,
    IntegrationRegistry,
    RoutingLLMProvider,
    TelegramIntegration,
    WhatsAppIntegration,
)
from .rag import (
    BM25Retriever,
    HybridRetriever,
    InMemoryVectorStore,
    KnowledgeBaseService,
    ParagraphChunker,
    TfIdfEmbedder,
    VectorRetriever,
)
from .scheduler import (
    AppointmentReminderJob,
    BackgroundScheduler,
    ConversationTimeoutJob,
    KnowledgeReindexJob,
)
from .seed import DataSeeder

logger = logging.getLogger(__name__)


class ApplicationContainer:
    """Container de injeção de dependência com ciclo de vida explícito."""

    def __init__(self, config: Optional[AppConfig] = None) -> None:
        self.config: AppConfig = config or AppConfig.from_env()

        # Infraestrutura
        self.database = TinyDBDatabase(self.config.database_path)
        self.credentials = JsonCredentialStore(self.config.credentials_path)
        self.event_bus = InMemoryEventBus()

        # Integrações: o agente fala com o provedor ativo através do proxy.
        self.integrations = IntegrationRegistry(self.credentials)
        self.llm = RoutingLLMProvider(self.integrations.inference)

        # Repositórios
        self.patient_repository = PatientRepository(self.database)
        self.dentist_repository = DentistRepository(self.database)
        self.procedure_repository = ProcedureRepository(self.database)
        self.appointment_repository = AppointmentRepository(self.database)
        self.conversation_repository = ConversationRepository(self.database)
        self.message_repository = MessageRepository(self.database)
        self.notification_repository = NotificationRepository(self.database)
        self.faq_repository = FAQRepository(self.database)
        self.user_repository = UserRepository(self.database)
        self.settings_repository = SettingsRepository(self.database)
        self.knowledge_repository = KnowledgeRepository(self.database)

        # Serviços
        self.notification_service = NotificationService(self.notification_repository, self.event_bus)
        self.patient_service = PatientService(self.patient_repository, self.notification_service)
        self.dentist_service = DentistService(self.dentist_repository)
        self.procedure_service = ProcedureService(self.procedure_repository)
        self.settings_service = SettingsService(self.settings_repository)
        self.scheduling_service = SchedulingService(
            self.appointment_repository, self.dentist_repository, self.settings_repository
        )
        self.appointment_service = AppointmentService(
            self.appointment_repository,
            self.patient_repository,
            self.dentist_repository,
            self.procedure_repository,
            self.scheduling_service,
            self.notification_service,
            self.settings_repository,
        )
        self.conversation_service = ConversationService(
            self.conversation_repository, self.message_repository, self.event_bus
        )
        self.faq_service = FAQService(self.faq_repository)
        self.auth_service = AuthService(self.user_repository)
        # RAG: recuperação híbrida (TF-IDF + BM25) sobre a base da clínica
        self.chunker = ParagraphChunker()
        self.embedder = TfIdfEmbedder()
        self.vector_store = InMemoryVectorStore()
        self.retriever = HybridRetriever(
            [
                VectorRetriever(self.chunker, self.embedder, self.vector_store),
                BM25Retriever(self.chunker),
            ]
        )
        self.knowledge_service = KnowledgeBaseService(
            self.knowledge_repository,
            self.faq_repository,
            self.procedure_repository,
            self.dentist_repository,
            self.settings_repository,
            self.retriever,
        )
        self.analytics_service = AnalyticsService(
            self.appointment_repository,
            self.patient_repository,
            self.conversation_repository,
            self.notification_repository,
        )

        # Agente
        self.tool_registry = self._build_tools()
        self.model_catalog = ModelCatalog()
        self.task_tracker = TaskTracker()
        self.context_policy = CompositePolicy(
            SlidingWindowPolicy(max_messages=24), TokenBudgetPolicy(usage_ratio=0.6)
        )
        self.agent = SorriDenteAgent(
            llm=self.llm,
            tools=self.tool_registry,
            prompt_builder=ClinicPromptBuilder(self.settings_service),
            conversations=self.conversation_service,
            catalog=self.model_catalog,
            policy=self.context_policy,
            tracker=self.task_tracker,
            max_iterations=self.config.agent_max_iterations,
        )

        # Canais
        self.dispatcher = MessageDispatcher(
            self.agent, self.conversation_service, self.patient_service, self.settings_service
        )
        self.web_channel = WebChannel(self.dispatcher)
        self.telegram_channel = TelegramChannel(self.dispatcher)
        self.whatsapp_channel = WhatsAppChannel(self.dispatcher)
        self.channels = (
            ChannelManager()
            .register(self.web_channel)
            .register(self.telegram_channel)
            .register(self.whatsapp_channel)
        )

        # Registro das integrações concretas (único ponto que as conhece).
        self.groq_integration = GroqInferenceIntegration(
            GroqLLMProvider(self.config.groq_api_key, self.config.groq_model),
            self.config.groq_model,
        )
        self.integrations.register(self.groq_integration, activate=True)
        self.integrations.register(TelegramIntegration(self.telegram_channel))
        self.integrations.register(WhatsAppIntegration(self.whatsapp_channel))

        # Exportação de conversas (formatos plugáveis). Depende dos canais, que só
        # existem depois do agente — por isso a ferramenta entra no registro agora,
        # e não em _build_tools.
        self.export_service = ConversationExportService(
            self.conversation_service,
            self.settings_service,
            self.channels,
            [TextExporter(), MarkdownExporter(), HtmlExporter()],
        )
        self.tool_registry.register(ExportarConversaTool(self.export_service))

        # Tarefas em segundo plano
        self.scheduler = (
            BackgroundScheduler()
            .register(
                AppointmentReminderJob(
                    self.appointment_service,
                    self.patient_repository,
                    self.channels,
                    self.notification_service,
                    self.config.reminder_interval_seconds,
                    self.config.reminder_window_hours,
                )
            )
            .register(
                ConversationTimeoutJob(
                    self.conversation_service,
                    self.channels,
                    self.settings_service,
                    self.config.inactivity_check_seconds,
                )
            )
            .register(KnowledgeReindexJob(self.knowledge_service, self.config.reindex_seconds))
        )

    def _build_tools(self) -> ToolRegistry:
        """Ferramentas do agente: cadastro, agenda, conhecimento e suporte."""
        return ToolRegistry(
            [
                # Cadastro do paciente
                ConsultarCadastroTool(self.patient_service, self.conversation_service),
                CadastrarClienteTool(
                    self.patient_service,
                    self.conversation_service,
                    self.notification_service,
                    self.patient_repository,
                ),
                AtualizarInformacoesClienteTool(self.patient_service, self.conversation_service),
                # Agenda
                ListProceduresTool(self.procedure_service),
                ListDentistsTool(self.dentist_service),
                AvailableSlotsTool(self.scheduling_service, self.procedure_service),
                ConsultarEncaixeUrgenciaTool(self.scheduling_service),
                AgendarEncaixeUrgenciaTool(
                    self.appointment_service, self.patient_service, self.conversation_service
                ),
                MarcarAgendamentoTool(
                    self.appointment_service,
                    self.patient_service,
                    self.procedure_service,
                    self.conversation_service,
                ),
                MyAppointmentsTool(
                    self.appointment_service, self.patient_service, self.conversation_service
                ),
                RescheduleAppointmentTool(self.appointment_service),
                CancelAppointmentTool(self.appointment_service),
                # Conhecimento (RAG) e suporte
                KnowledgeBaseTool(self.knowledge_service),
                ClinicInfoTool(self.settings_service),
                HumanHandoffTool(self.notification_service, self.conversation_service),
                EncerrarAtendimentoTool(self.conversation_service),
            ]
        )

    # ciclo de vida
    async def startup(self) -> None:
        await self.database.connect()
        await DataSeeder(
            self.settings_repository,
            self.user_repository,
            self.dentist_repository,
            self.procedure_repository,
            self.faq_repository,
            self.knowledge_repository,
            self.auth_service,
        ).run()
        await self.integrations.load_all()
        await self.knowledge_service.reindex()
        await self.web_channel.start()
        await self.scheduler.start()
        if self.config.autostart_telegram:
            await self.integrations.autostart()

    async def shutdown(self) -> None:
        await self.scheduler.stop()
        await self.integrations.shutdown()
        await self.channels.stop_all()
        await self.database.disconnect()
