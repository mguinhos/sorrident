"""Integrações externas do SorriDente (inferência, mensageria, …)."""
from .base import (
    BaseIntegration,
    CredentialField,
    IIntegration,
    IntegrationKind,
    IntegrationStatus,
)
from .inference import (
    BaseInferenceIntegration,
    GroqInferenceIntegration,
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
    "BaseInferenceIntegration",
    "GroqInferenceIntegration",
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
