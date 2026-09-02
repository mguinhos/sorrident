"""Gestão de contexto do agente: mensagens, janela e política de truncamento."""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Iterator, Optional, Sequence

from .models import Model


class MessageRole(str, Enum):
    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"
    TOOL = "tool"


@dataclass
class PromptMessage:
    """Uma mensagem no formato aceito pelos provedores de inferência."""

    role: MessageRole
    content: str = ""
    tool_calls: list[dict[str, Any]] = field(default_factory=list)
    tool_call_id: str = ""
    name: str = ""

    def to_payload(self) -> dict[str, Any]:
        payload: dict[str, Any] = {"role": self.role.value, "content": self.content}
        if self.tool_calls:
            payload["tool_calls"] = self.tool_calls
        if self.tool_call_id:
            payload["tool_call_id"] = self.tool_call_id
        if self.name:
            payload["name"] = self.name
        return payload

    @property
    def estimated_tokens(self) -> int:
        """Estimativa barata (~4 caracteres por token), suficiente para orçamento."""
        size = len(self.content)
        for call in self.tool_calls:
            size += len(str(call))
        return max(1, size // 4)


class IContextPolicy(ABC):
    """Estratégia que decide o que cabe na janela de contexto."""

    @abstractmethod
    def apply(self, messages: Sequence[PromptMessage], model: Model) -> list[PromptMessage]:
        """Recebe as mensagens em ordem cronológica e devolve as que serão enviadas."""


class SlidingWindowPolicy(IContextPolicy):
    """Mantém a mensagem de sistema e as N últimas trocas."""

    def __init__(self, max_messages: int = 24) -> None:
        self._max_messages = max_messages

    def apply(self, messages: Sequence[PromptMessage], model: Model) -> list[PromptMessage]:
        system = [m for m in messages if m.role is MessageRole.SYSTEM]
        rest = [m for m in messages if m.role is not MessageRole.SYSTEM]
        return system + rest[-self._max_messages :]


class TokenBudgetPolicy(IContextPolicy):
    """Descarta as mensagens mais antigas até caber no orçamento do modelo."""

    def __init__(self, usage_ratio: float = 0.6, min_messages: int = 4) -> None:
        self._usage_ratio = usage_ratio
        self._min_messages = min_messages

    def apply(self, messages: Sequence[PromptMessage], model: Model) -> list[PromptMessage]:
        budget = int(model.context_window * self._usage_ratio) - model.max_output_tokens
        system = [m for m in messages if m.role is MessageRole.SYSTEM]
        rest = [m for m in messages if m.role is not MessageRole.SYSTEM]
        total = sum(m.estimated_tokens for m in system)
        kept: list[PromptMessage] = []
        for message in reversed(rest):
            if total + message.estimated_tokens > budget and len(kept) >= self._min_messages:
                break
            kept.append(message)
            total += message.estimated_tokens
        return system + list(reversed(kept))


class CompositePolicy(IContextPolicy):
    """Aplica várias políticas em sequência (janela e depois orçamento)."""

    def __init__(self, *policies: IContextPolicy) -> None:
        self._policies = policies

    def apply(self, messages: Sequence[PromptMessage], model: Model) -> list[PromptMessage]:
        current = list(messages)
        for policy in self._policies:
            current = policy.apply(current, model)
        return current


class ConversationContext:
    """Janela de contexto de um turno: instruções, histórico e trocas do turno.

    O agente monta o contexto aqui e chama `render(model)` para obter o payload
    já ajustado à política vigente.
    """

    def __init__(
        self,
        system_prompt: str = "",
        policy: Optional[IContextPolicy] = None,
    ) -> None:
        self._policy = (
            policy
            if policy is not None
            else CompositePolicy(SlidingWindowPolicy(), TokenBudgetPolicy())
        )
        self._messages: list[PromptMessage] = []
        if system_prompt:
            self.system(system_prompt)

    def system(self, content: str) -> "ConversationContext":
        self._messages.insert(0, PromptMessage(MessageRole.SYSTEM, content))
        return self

    def user(self, content: str) -> "ConversationContext":
        self._messages.append(PromptMessage(MessageRole.USER, content))
        return self

    def assistant(self, content: str, tool_calls: Optional[list[dict[str, Any]]] = None) -> "ConversationContext":
        self._messages.append(
            PromptMessage(MessageRole.ASSISTANT, content, tool_calls=tool_calls or [])
        )
        return self

    def tool_result(self, tool_call_id: str, name: str, content: str) -> "ConversationContext":
        self._messages.append(
            PromptMessage(MessageRole.TOOL, content, tool_call_id=tool_call_id, name=name)
        )
        return self

    def extend(self, messages: Sequence[PromptMessage]) -> "ConversationContext":
        self._messages.extend(messages)
        return self

    def render(self, model: Model) -> list[dict[str, Any]]:
        return [m.to_payload() for m in self._policy.apply(self._messages, model)]

    @property
    def messages(self) -> list[PromptMessage]:
        return list(self._messages)

    @property
    def estimated_tokens(self) -> int:
        return sum(m.estimated_tokens for m in self._messages)

    def __len__(self) -> int:
        return len(self._messages)

    def __iter__(self) -> Iterator[PromptMessage]:
        return iter(self._messages)
