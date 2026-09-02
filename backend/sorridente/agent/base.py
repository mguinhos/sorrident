"""Infraestrutura base do agente: ferramenta abstrata e registro."""
from __future__ import annotations

import json
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any, Iterable, Iterator, Optional

from ..core.interfaces import AgentContext, ITool


class BaseTool(ITool, ABC):
    """Implementação parcial de ITool com serialização e validação comuns.

    Subclasses declaram `name`, `description`, `parameters` e implementam
    `run`. `execute` cuida do tratamento de erro para que uma falha de
    ferramenta nunca derrube a conversa (Fail-Safe).
    """

    @property
    @abstractmethod
    def name(self) -> str: ...

    @property
    @abstractmethod
    def description(self) -> str: ...

    @property
    def parameters(self) -> dict[str, Any]:
        return {"type": "object", "properties": {}, "required": []}

    @abstractmethod
    async def run(self, context: AgentContext, **kwargs: Any) -> Any:
        """Lógica concreta da ferramenta."""

    async def execute(self, context: AgentContext, **kwargs: Any) -> Any:
        try:
            return await self.run(context, **kwargs)
        except Exception as exc:  # noqa: BLE001 - devolve erro legível ao modelo
            return {"erro": str(exc)}

    @staticmethod
    def parse_datetime(value: str) -> datetime:
        """Aceita ISO completo, 'YYYY-MM-DD HH:MM' e 'DD/MM/YYYY HH:MM'."""
        value = (value or "").strip().replace("Z", "")
        formats = (
            "%Y-%m-%dT%H:%M:%S",
            "%Y-%m-%dT%H:%M",
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%d %H:%M",
            "%d/%m/%Y %H:%M",
            "%d/%m/%Y",
            "%Y-%m-%d",
        )
        for fmt in formats:
            try:
                return datetime.strptime(value, fmt)
            except ValueError:
                continue
        raise ValueError(f"Data/hora inválida: '{value}'. Use o formato YYYY-MM-DDTHH:MM.")

    @staticmethod
    def dump(value: Any) -> str:
        return json.dumps(value, ensure_ascii=False, default=str)


class IToolRegistry(ABC):
    """Coleção de ferramentas oferecidas ao agente."""

    @abstractmethod
    def register(self, tool: ITool) -> "IToolRegistry": ...

    @abstractmethod
    def unregister(self, name: str) -> None: ...

    @abstractmethod
    def get(self, name: str) -> Optional[ITool]: ...

    @abstractmethod
    def schemas(self) -> list[dict[str, Any]]: ...

    @abstractmethod
    def names(self) -> list[str]: ...


class ToolRegistry(IToolRegistry):
    """Registro de ferramentas disponíveis ao agente (Open/Closed).

    Novas capacidades são adicionadas registrando novas `BaseTool`, sem
    modificar o agente.
    """

    def __init__(self, tools: Optional[Iterable[ITool]] = None) -> None:
        self._tools: dict[str, ITool] = {}
        for tool in tools if tools is not None else ():
            self.register(tool)

    def register(self, tool: ITool) -> "ToolRegistry":
        self._tools[tool.name] = tool
        return self

    def unregister(self, name: str) -> None:
        self._tools.pop(name, None)

    def get(self, name: str) -> Optional[ITool]:
        return self._tools.get(name)

    def schemas(self) -> list[dict[str, Any]]:
        return [tool.to_schema() for tool in self._tools.values()]

    def names(self) -> list[str]:
        return list(self._tools)

    def __len__(self) -> int:
        return len(self._tools)

    def __iter__(self) -> Iterator[ITool]:
        return iter(self._tools.values())

    def __contains__(self, name: object) -> bool:
        return name in self._tools
