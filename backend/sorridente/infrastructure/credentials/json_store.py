"""Armazenamento de credenciais em credentials.json."""
from __future__ import annotations

import asyncio
import json
from pathlib import Path
from typing import Any

from ...core.interfaces import ICredentialStore


class JsonCredentialStore(ICredentialStore):
    """Persiste credenciais (token do bot Telegram, chave Groq, etc.) em JSON."""

    def __init__(self, path: str | Path = "credentials.json") -> None:
        self._path = Path(path)
        self._lock = asyncio.Lock()
        self._cache: dict[str, Any] | None = None

    def _read_sync(self) -> dict[str, Any]:
        if not self._path.exists():
            return {}
        try:
            return json.loads(self._path.read_text(encoding="utf-8")) or {}
        except json.JSONDecodeError:
            return {}

    def _write_sync(self, data: dict[str, Any]) -> None:
        self._path.parent.mkdir(parents=True, exist_ok=True)
        tmp = self._path.with_suffix(".json.tmp")
        tmp.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
        tmp.replace(self._path)

    async def _load(self) -> dict[str, Any]:
        if self._cache is None:
            self._cache = await asyncio.to_thread(self._read_sync)
        return self._cache

    async def all(self) -> dict[str, Any]:
        async with self._lock:
            return dict(await self._load())

    async def get(self, key: str, default: Any = None) -> Any:
        async with self._lock:
            return (await self._load()).get(key, default)

    async def set(self, key: str, value: Any) -> None:
        async with self._lock:
            data = await self._load()
            data[key] = value
            await asyncio.to_thread(self._write_sync, data)

    async def update(self, values: dict[str, Any]) -> dict[str, Any]:
        async with self._lock:
            data = await self._load()
            data.update(values)
            await asyncio.to_thread(self._write_sync, data)
            return dict(data)

    async def delete(self, key: str) -> None:
        async with self._lock:
            data = await self._load()
            data.pop(key, None)
            await asyncio.to_thread(self._write_sync, data)
