"""Integrações externas do SorriDente (inferência, mensageria, …)."""
from .base import (
    BaseIntegration,
    CredentialField,
    IIntegration,
    IntegrationKind,
    IntegrationStatus,
)
from .calendar import BaseCalendarIntegration, GoogleCalendarIntegration
from .inference import (
    BaseInferenceIntegration,
    GeminiInferenceIntegration,
    OpenRouterInferenceIntegration,
    InferenceResolver,
    RoutingLLMProvider,
)
from .messaging import BaseChannelIntegration, TelegramIntegration, WhatsAppIntegration
from .registry import (
    BaseIntegrationRegistry,
    InferenceRegistry,
    IntegrationRegistry,
    MessagingRegistry,
)

__all__ = [
    "IIntegration",
    "BaseIntegration",
    "CredentialField",
    "IntegrationKind",
    "IntegrationStatus",
    "BaseCalendarIntegration",
    "GoogleCalendarIntegration",
    "BaseInferenceIntegration",
    "GeminiInferenceIntegration",
    "OpenRouterInferenceIntegration",
    "InferenceResolver",
    "RoutingLLMProvider",
    "BaseChannelIntegration",
    "TelegramIntegration",
    "WhatsAppIntegration",
    "IntegrationRegistry",
    "BaseIntegrationRegistry",
    "InferenceRegistry",
    "MessagingRegistry",
]
