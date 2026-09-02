"""Barramento de eventos em memória para push em tempo real (SSE)."""
from __future__ import annotations

import asyncio
from typing import Any

from ..core.interfaces import IEventBus


class InMemoryEventBus(IEventBus):
    """Publish/subscribe simples baseado em asyncio.Queue."""

    def __init__(self, max_queue: int = 200) -> None:
        self._subscribers: set[asyncio.Queue] = set()
        self._max_queue = max_queue

    async def publish(self, event: str, payload: dict[str, Any]) -> None:
        message = {"event": event, "payload": payload}
        for queue in list(self._subscribers):
            try:
                queue.put_nowait(message)
            except asyncio.QueueFull:
                pass

    def subscribe(self) -> asyncio.Queue:
        queue: asyncio.Queue = asyncio.Queue(maxsize=self._max_queue)
        self._subscribers.add(queue)
        return queue

    def unsubscribe(self, queue: asyncio.Queue) -> None:
        self._subscribers.discard(queue)

    @property
    def subscriber_count(self) -> int:
        return len(self._subscribers)
