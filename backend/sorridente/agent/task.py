"""Tarefas do agente: cada turno é uma `Task` com `SubTask`s rastreáveis."""
from __future__ import annotations

import time
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Iterator, Optional


class TaskStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    DONE = "done"
    FAILED = "failed"
    CANCELLED = "cancelled"

    @property
    def finished(self) -> bool:
        return self in (TaskStatus.DONE, TaskStatus.FAILED, TaskStatus.CANCELLED)


class TaskKind(str, Enum):
    CONVERSATION_TURN = "conversation_turn"
    TOOL_CALL = "tool_call"
    INFERENCE = "inference"


@dataclass
class SubTask:
    """Unidade de trabalho dentro de uma tarefa (uma chamada de ferramenta, p.ex.)."""

    name: str
    kind: TaskKind = TaskKind.TOOL_CALL
    status: TaskStatus = TaskStatus.PENDING
    arguments: dict[str, Any] = field(default_factory=dict)
    result: Any = None
    error: str = ""
    id: str = field(default_factory=lambda: uuid.uuid4().hex[:8])
    started_at: float = field(default_factory=time.time)
    finished_at: Optional[float] = None

    def start(self) -> "SubTask":
        self.status = TaskStatus.RUNNING
        self.started_at = time.time()
        return self

    def complete(self, result: Any = None) -> "SubTask":
        self.status = TaskStatus.DONE
        self.result = result
        self.finished_at = time.time()
        return self

    def fail(self, error: str) -> "SubTask":
        self.status = TaskStatus.FAILED
        self.error = error
        self.finished_at = time.time()
        return self

    @property
    def duration_ms(self) -> int:
        end = self.finished_at or time.time()
        return int((end - self.started_at) * 1000)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "kind": self.kind.value,
            "status": self.status.value,
            "arguments": self.arguments,
            "result": self.result,
            "error": self.error,
            "duration_ms": self.duration_ms,
        }


@dataclass
class Task:
    """Um turno de conversa processado pelo agente."""

    conversation_id: str
    prompt: str
    kind: TaskKind = TaskKind.CONVERSATION_TURN
    status: TaskStatus = TaskStatus.PENDING
    subtasks: list[SubTask] = field(default_factory=list)
    answer: str = ""
    error: str = ""
    iterations: int = 0
    id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    started_at: float = field(default_factory=time.time)
    finished_at: Optional[float] = None

    def start(self) -> "Task":
        self.status = TaskStatus.RUNNING
        self.started_at = time.time()
        return self

    def add_subtask(self, name: str, kind: TaskKind = TaskKind.TOOL_CALL, **arguments: Any) -> SubTask:
        subtask = SubTask(name=name, kind=kind, arguments=arguments)
        self.subtasks.append(subtask)
        return subtask

    def complete(self, answer: str) -> "Task":
        self.status = TaskStatus.DONE
        self.answer = answer
        self.finished_at = time.time()
        return self

    def fail(self, error: str) -> "Task":
        self.status = TaskStatus.FAILED
        self.error = error
        self.finished_at = time.time()
        return self

    @property
    def pending_subtasks(self) -> list[SubTask]:
        return [s for s in self.subtasks if not s.status.finished]

    @property
    def failed_subtasks(self) -> list[SubTask]:
        return [s for s in self.subtasks if s.status is TaskStatus.FAILED]

    @property
    def duration_ms(self) -> int:
        end = self.finished_at or time.time()
        return int((end - self.started_at) * 1000)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "conversation_id": self.conversation_id,
            "kind": self.kind.value,
            "status": self.status.value,
            "prompt": self.prompt,
            "answer": self.answer,
            "error": self.error,
            "iterations": self.iterations,
            "duration_ms": self.duration_ms,
            "subtasks": [s.to_dict() for s in self.subtasks],
        }


class ITaskTracker(ABC):
    """Histórico dos turnos processados pelo agente."""

    @abstractmethod
    def track(self, task: "Task") -> "Task": ...

    @abstractmethod
    def recent(self, limit: int = 50) -> list["Task"]: ...

    @abstractmethod
    def by_conversation(self, conversation_id: str) -> list["Task"]: ...


class TaskTracker(ITaskTracker):
    """Histórico recente de tarefas, para observabilidade no dashboard."""

    def __init__(self, max_size: int = 200) -> None:
        self._tasks: list[Task] = []
        self._max_size = max_size

    def track(self, task: Task) -> Task:
        self._tasks.append(task)
        if len(self._tasks) > self._max_size:
            self._tasks = self._tasks[-self._max_size :]
        return task

    def recent(self, limit: int = 50) -> list[Task]:
        return list(reversed(self._tasks[-limit:]))

    def by_conversation(self, conversation_id: str) -> list[Task]:
        return [t for t in self._tasks if t.conversation_id == conversation_id]

    def __len__(self) -> int:
        return len(self._tasks)

    def __iter__(self) -> Iterator[Task]:
        return iter(self._tasks)
