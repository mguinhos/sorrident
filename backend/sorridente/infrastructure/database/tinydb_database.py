"""Implementação de IDatabase sobre TinyDB.

TinyDB é síncrono; todas as operações são executadas em thread separada
(`asyncio.to_thread`) e serializadas por um `asyncio.Lock` para manter a
API assíncrona e segura sob concorrência.
"""
from __future__ import annotations

import asyncio
from pathlib import Path
from typing import Any, Optional

from tinydb import Query, TinyDB
from tinydb.storages import JSONStorage
from tinydb.middlewares import CachingMiddleware

from ...core.interfaces import IDatabase


class TinyDBDatabase(IDatabase):
    """Banco de dados documental baseado em arquivo JSON."""

    def __init__(self, path: str | Path = "data/sorridente.json") -> None:
        self._path = Path(path)
        self._db: Optional[TinyDB] = None
        self._lock = asyncio.Lock()

    # ciclo de vida
    async def connect(self) -> None:
        if self._db is not None:
            return
        self._path.parent.mkdir(parents=True, exist_ok=True)
        self._db = await asyncio.to_thread(
            lambda: TinyDB(self._path, storage=CachingMiddleware(JSONStorage), indent=2, ensure_ascii=False)
        )

    async def disconnect(self) -> None:
        if self._db is None:
            return
        db, self._db = self._db, None
        await asyncio.to_thread(db.close)

    def _table(self, table: str):
        if self._db is None:
            raise RuntimeError("Banco de dados não conectado. Chame connect() primeiro.")
        return self._db.table(table)

    @staticmethod
    def _matches(document: dict[str, Any], filters: dict[str, Any]) -> bool:
        for key, expected in filters.items():
            value = document.get(key)
            if isinstance(expected, (list, tuple, set)):
                if value not in expected:
                    return False
            elif value != expected:
                return False
        return True

    # operações
    async def insert(self, table: str, document: dict[str, Any]) -> dict[str, Any]:
        async with self._lock:
            await asyncio.to_thread(self._table(table).insert, document)
        return document

    async def update(self, table: str, doc_id: str, document: dict[str, Any]) -> dict[str, Any]:
        async with self._lock:
            q = Query()
            await asyncio.to_thread(self._table(table).update, document, q.id == doc_id)
        return document

    async def delete(self, table: str, doc_id: str) -> bool:
        async with self._lock:
            q = Query()
            removed = await asyncio.to_thread(self._table(table).remove, q.id == doc_id)
        return bool(removed)

    async def get(self, table: str, doc_id: str) -> Optional[dict[str, Any]]:
        async with self._lock:
            q = Query()
            found = await asyncio.to_thread(self._table(table).get, q.id == doc_id)
        return dict(found) if found else None

    async def find(self, table: str, filters: Optional[dict[str, Any]] = None) -> list[dict[str, Any]]:
        rows = await self.all(table)
        if not filters:
            return rows
        return [row for row in rows if self._matches(row, filters)]

    async def all(self, table: str) -> list[dict[str, Any]]:
        async with self._lock:
            rows = await asyncio.to_thread(self._table(table).all)
        return [dict(row) for row in rows]

    async def count(self, table: str, filters: Optional[dict[str, Any]] = None) -> int:
        return len(await self.find(table, filters))
