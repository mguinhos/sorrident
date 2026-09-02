"""Rotas de indicadores e stream de eventos em tempo real."""
from __future__ import annotations

import asyncio
import json
from typing import Any, AsyncIterator

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse

from ...container import ApplicationContainer
from ...core.exceptions import AuthenticationError
from ..dependencies import get_container, require_staff

router = APIRouter(tags=["dashboard"])


@router.get("/dashboard", dependencies=[Depends(require_staff)])
async def dashboard(container: ApplicationContainer = Depends(get_container)) -> dict[str, Any]:
    return await container.analytics_service.dashboard()


@router.get("/events")
async def events(
    token: str = Query(default=""), container: ApplicationContainer = Depends(get_container)
) -> StreamingResponse:
    """Server-Sent Events com notificações e mensagens novas.

    O token vem por query string porque `EventSource` não envia cabeçalhos.
    """
    user = await container.auth_service.resolve_token(token)
    if user.role == "cliente":
        raise AuthenticationError("Stream disponível apenas para a equipe.")

    queue = container.event_bus.subscribe()

    async def stream() -> AsyncIterator[str]:
        try:
            yield 'event: ready\ndata: {"ok": true}\n\n'
            while True:
                try:
                    message = await asyncio.wait_for(queue.get(), timeout=20.0)
                except asyncio.TimeoutError:
                    yield ": keep-alive\n\n"
                    continue
                payload = json.dumps(message["payload"], ensure_ascii=False, default=str)
                yield f"event: {message['event']}\ndata: {payload}\n\n"
        finally:
            container.event_bus.unsubscribe(queue)

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/agent/tasks", dependencies=[Depends(require_staff)])
async def agent_tasks(
    limit: int = Query(default=30, ge=1, le=200),
    container: ApplicationContainer = Depends(get_container),
) -> dict[str, Any]:
    """Últimos turnos processados pelo agente, com suas subtarefas."""
    return {
        "model": container.agent.model.to_dict(),
        "tasks": [task.to_dict() for task in container.task_tracker.recent(limit)],
    }
