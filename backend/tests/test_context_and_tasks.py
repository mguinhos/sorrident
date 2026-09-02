"""Gestão de contexto (janela/política) e rastreamento de tarefas."""
from __future__ import annotations

import pytest

from sorridente.agent.context import (
    CompositePolicy,
    ConversationContext,
    MessageRole,
    PromptMessage,
    SlidingWindowPolicy,
    TokenBudgetPolicy,
)
from sorridente.agent.models import Model, ModelCatalog, Supports
from sorridente.agent.task import SubTask, Task, TaskKind, TaskStatus, TaskTracker


def test_capacidades_do_modelo() -> None:
    model = ModelCatalog().get("qwen/qwen3.8-27b")
    assert model.capable_of(Supports.TOOLS)
    assert model.capable_of(Supports.REASONING)
    assert not model.capable_of(Supports.IMAGE)
    assert "tools" in model.supports.describe()


def test_modelo_desconhecido_recebe_perfil_padrao() -> None:
    model = ModelCatalog().get("ollama/llama-novo", provider="ollama")
    assert model.provider == "ollama"
    assert model.capable_of(Supports.TOOLS)


def test_janela_deslizante_preserva_sistema() -> None:
    model = Model(id="teste", context_window=8_000, max_output_tokens=1_000)
    mensagens = [PromptMessage(MessageRole.SYSTEM, "regras")] + [
        PromptMessage(MessageRole.USER, f"mensagem {i}") for i in range(40)
    ]
    resultado = SlidingWindowPolicy(max_messages=10).apply(mensagens, model)
    assert resultado[0].role is MessageRole.SYSTEM
    assert len(resultado) == 11
    assert resultado[-1].content == "mensagem 39"


def test_orcamento_de_tokens_limita_o_historico() -> None:
    model = Model(id="pequeno", context_window=1_000, max_output_tokens=200)
    mensagens = [PromptMessage(MessageRole.SYSTEM, "regras")] + [
        PromptMessage(MessageRole.USER, "x" * 4_000) for _ in range(10)
    ]
    resultado = TokenBudgetPolicy(usage_ratio=0.5, min_messages=2).apply(mensagens, model)
    assert len(resultado) < len(mensagens)
    assert resultado[0].role is MessageRole.SYSTEM


def test_contexto_renderiza_payload_do_provedor() -> None:
    contexto = ConversationContext("instruções", policy=CompositePolicy(SlidingWindowPolicy(50)))
    contexto.user("oi").assistant("", tool_calls=[{"id": "1", "function": {"name": "f", "arguments": "{}"}}])
    contexto.tool_result("1", "f", '{"ok": true}')
    payload = contexto.render(Model(id="teste"))
    assert [m["role"] for m in payload] == ["system", "user", "assistant", "tool"]
    assert payload[2]["tool_calls"][0]["id"] == "1"
    assert payload[3]["tool_call_id"] == "1"


def test_ciclo_de_vida_da_tarefa() -> None:
    task = Task(conversation_id="c1", prompt="quero agendar").start()
    assert task.status is TaskStatus.RUNNING

    subtask = task.add_subtask("agendar_consulta", TaskKind.TOOL_CALL, data="2026-01-01").start()
    subtask.complete({"ok": True})
    falha = task.add_subtask("cancelar", TaskKind.TOOL_CALL).start().fail("não encontrado")

    assert task.pending_subtasks == []
    assert task.failed_subtasks == [falha]
    task.complete("pronto")
    assert task.status.finished and task.to_dict()["answer"] == "pronto"


def test_tracker_mantem_historico_limitado() -> None:
    tracker = TaskTracker(max_size=3)
    for i in range(5):
        tracker.track(Task(conversation_id="c", prompt=f"p{i}"))
    assert len(tracker) == 3
    assert tracker.recent()[0].prompt == "p4"
    assert len(tracker.by_conversation("c")) == 3


@pytest.mark.asyncio
async def test_encerramento_por_inatividade(container) -> None:
    """O job fecha conversas paradas, avisando o paciente antes."""
    from datetime import datetime, timedelta

    from sorridente.scheduler import ConversationTimeoutJob

    conversa = await container.conversation_service.get_or_create("web", "inativo-1", "Silencioso")
    await container.conversation_service.append(conversa.id, "user", "oi")

    # simula silêncio maior que o limite configurado
    conversa = await container.conversation_service.get(conversa.id)
    conversa.last_message_at = (datetime.now() - timedelta(minutes=45)).isoformat(timespec="seconds")
    await container.conversation_repository.update(conversa)

    job = ConversationTimeoutJob(
        container.conversation_service, container.channels, container.settings_service
    )
    await job.run_once()

    fechada = await container.conversation_service.get(conversa.id)
    assert fechada.open is False
    assert "sem interação" in fechada.closed_reason

    mensagens = await container.conversation_service.history(conversa.id)
    assert "encerrar nosso atendimento" in mensagens[-1].content


@pytest.mark.asyncio
async def test_handoff_impede_encerramento_automatico(container) -> None:
    """Conversa assumida por um humano não é encerrada pelo job."""
    from datetime import datetime, timedelta

    from sorridente.scheduler import ConversationTimeoutJob

    conversa = await container.conversation_service.get_or_create("web", "inativo-2", "Em atendimento")
    await container.conversation_service.set_handoff(conversa.id, True)
    conversa = await container.conversation_service.get(conversa.id)
    conversa.last_message_at = (datetime.now() - timedelta(hours=3)).isoformat(timespec="seconds")
    await container.conversation_repository.update(conversa)

    await ConversationTimeoutJob(
        container.conversation_service, container.channels, container.settings_service
    ).run_once()

    assert (await container.conversation_service.get(conversa.id)).open is True
