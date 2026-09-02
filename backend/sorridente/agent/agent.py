"""Agente conversacional SorriDente."""
from __future__ import annotations

import asyncio
import json
import logging
from typing import Any, Optional

from ..core.interfaces import AgentContext, IAgent, ILLMProvider
from ..core.models import MessageAuthor
from ..domain.services.interfaces import IConversationService
from .base import ToolRegistry
from .context import ConversationContext, IContextPolicy, MessageRole, PromptMessage
from .models import Model, ModelCatalog, Supports
from .prompt import IPromptBuilder
from .task import SubTask, Task, TaskKind, TaskStatus, TaskTracker

logger = logging.getLogger(__name__)


class SorriDenteAgent(IAgent):
    """Orquestra inferência, ferramentas e contexto para responder um turno.

    Depende apenas de abstrações — `ILLMProvider`, `IPromptBuilder`,
    `IConversationService`, `IContextPolicy` e `ToolRegistry` — e registra cada
    turno como uma `Task` com uma `SubTask` por chamada de ferramenta.
    """

    def __init__(
        self,
        llm: ILLMProvider,
        tools: ToolRegistry,
        prompt_builder: IPromptBuilder,
        conversations: IConversationService,
        catalog: Optional[ModelCatalog] = None,
        policy: Optional[IContextPolicy] = None,
        tracker: Optional[TaskTracker] = None,
        max_iterations: int = 5,
        history_limit: int = 20,
        temperature: float = 0.3,
    ) -> None:
        self._llm = llm
        self._tools = tools
        self._prompt_builder = prompt_builder
        self._conversations = conversations
        self._catalog = catalog if catalog is not None else ModelCatalog()
        self._policy = policy
        self._tracker = tracker if tracker is not None else TaskTracker()
        self._max_iterations = max_iterations
        self._history_limit = history_limit
        self._temperature = temperature

    @property
    def tools(self) -> ToolRegistry:
        return self._tools

    @property
    def tracker(self) -> TaskTracker:
        return self._tracker

    @property
    def model(self) -> Model:
        """Descrição do modelo atualmente servido pelo provedor ativo."""
        return self._catalog.get(self._llm.model)

    async def reply(self, context: AgentContext, user_message: str) -> str:
        task = self._tracker.track(
            Task(conversation_id=context.conversation_id, prompt=user_message)
        ).start()
        try:
            answer = await self._run(context, user_message, task)
            task.complete(answer)
            return answer
        except Exception as exc:  # noqa: BLE001 - a falha vira resposta e fica registrada
            task.fail(str(exc))
            logger.exception("Falha ao processar o turno %s", task.id)
            raise

    async def _run(self, context: AgentContext, user_message: str, task: Task) -> str:
        model = self.model
        window = ConversationContext(
            system_prompt=await self._prompt_builder.build(context), policy=self._policy
        )
        window.extend(await self._load_history(context.conversation_id))
        window.user(user_message)

        schemas = self._tools.schemas() if model.capable_of(Supports.TOOLS) else None

        for iteration in range(self._max_iterations):
            task.iterations = iteration + 1
            inference = task.add_subtask(model.id, TaskKind.INFERENCE, iteration=iteration).start()
            answer = await self._llm.complete(
                window.render(model), tools=schemas, temperature=self._temperature
            )
            inference.complete({"tool_calls": len(answer.get("tool_calls") or [])})

            tool_calls: list[dict[str, Any]] = answer.get("tool_calls") or []
            if not tool_calls:
                return answer.get("content") or "Desculpe, não consegui entender. Pode repetir?"

            window.assistant(answer.get("content") or "", tool_calls=tool_calls)
            results = await asyncio.gather(
                *(self._call_tool(context, task, call) for call in tool_calls)
            )
            for call, output in zip(tool_calls, results):
                window.tool_result(
                    call["id"],
                    call["function"]["name"],
                    json.dumps(output, ensure_ascii=False, default=str),
                )

        return (
            "Não consegui concluir esse pedido agora. Posso chamar alguém da equipe "
            "da clínica para te ajudar?"
        )

    async def _load_history(self, conversation_id: str) -> list[PromptMessage]:
        history = await self._conversations.history(conversation_id, self._history_limit)
        messages: list[PromptMessage] = []
        for message in history:
            if message.author == MessageAuthor.USER.value:
                messages.append(PromptMessage(MessageRole.USER, message.content))
            elif message.author in (
                MessageAuthor.ASSISTANT.value,
                MessageAuthor.HUMAN_AGENT.value,
            ) and message.content:
                messages.append(PromptMessage(MessageRole.ASSISTANT, message.content))
        return messages

    async def _call_tool(self, context: AgentContext, task: Task, call: dict[str, Any]) -> Any:
        name: str = call["function"]["name"]
        arguments = self._parse_arguments(call["function"].get("arguments"))
        subtask: SubTask = task.add_subtask(name, TaskKind.TOOL_CALL, **arguments).start()

        tool = self._tools.get(name)
        if tool is None:
            subtask.fail(f"Ferramenta '{name}' não existe.")
            return {"erro": subtask.error}

        logger.info("tool=%s args=%s conversa=%s", name, arguments, context.conversation_id)
        output = await tool.execute(context, **arguments)
        if isinstance(output, dict) and "erro" in output:
            subtask.fail(str(output["erro"]))
        else:
            subtask.complete(output)

        await self._conversations.append(
            context.conversation_id,
            MessageAuthor.TOOL.value,
            f"{name}({json.dumps(arguments, ensure_ascii=False)})",
            tool_name=name,
            tool_payload={
                "arguments": arguments,
                "result": output,
                "status": subtask.status.value,
                "duration_ms": subtask.duration_ms,
            },
        )
        return output

    @staticmethod
    def _parse_arguments(raw: Any) -> dict[str, Any]:
        if isinstance(raw, dict):
            return dict(raw)
        try:
            parsed = json.loads(raw or "{}")
            return parsed if isinstance(parsed, dict) else {}
        except json.JSONDecodeError:
            return {}


class EchoAgent(IAgent):
    """Agente de contingência usado quando não há provedor de inferência ativo."""

    def __init__(self, message: Optional[str] = None) -> None:
        self._message = message or (
            "O assistente ainda não está configurado. Um atendente da SorriDente "
            "responderá em instantes."
        )

    async def reply(self, context: AgentContext, user_message: str) -> str:
        return self._message
