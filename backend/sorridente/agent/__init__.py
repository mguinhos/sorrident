"""Agente SorriDente: modelo, contexto, tarefas e ferramentas."""
from .agent import EchoAgent, SorriDenteAgent
from .base import BaseTool, IToolRegistry, ToolRegistry
from .context import (
    CompositePolicy,
    ConversationContext,
    IContextPolicy,
    MessageRole,
    PromptMessage,
    SlidingWindowPolicy,
    TokenBudgetPolicy,
)
from .models import IModelCatalog, Model, ModelCatalog, Supports
from .prompt import ClinicPromptBuilder, IPromptBuilder
from .task import ITaskTracker, SubTask, Task, TaskKind, TaskStatus, TaskTracker

__all__ = [
    "SorriDenteAgent",
    "EchoAgent",
    "BaseTool",
    "ToolRegistry",
    "IToolRegistry",
    "IModelCatalog",
    "ITaskTracker",
    "ConversationContext",
    "IContextPolicy",
    "CompositePolicy",
    "SlidingWindowPolicy",
    "TokenBudgetPolicy",
    "MessageRole",
    "PromptMessage",
    "Model",
    "ModelCatalog",
    "Supports",
    "Task",
    "SubTask",
    "TaskKind",
    "TaskStatus",
    "TaskTracker",
    "IPromptBuilder",
    "ClinicPromptBuilder",
]
