"""Repositório genérico assíncrono sobre IDatabase."""
from __future__ import annotations

from typing import Any, Generic, Optional, Type, TypeVar

from ...core.interfaces import IDatabase, IRepository
from ...core.models import Entity

T = TypeVar("T", bound=Entity)


class TinyDBRepository(IRepository[T], Generic[T]):
    """Implementação concreta de IRepository usando um IDatabase documental."""

    def __init__(self, database: IDatabase, entity_type: Type[T], table_name: str) -> None:
        self._db = database
        self._entity_type = entity_type
        self._table_name = table_name

    @property
    def table_name(self) -> str:
        return self._table_name

    @property
    def entity_type(self) -> Type[T]:
        return self._entity_type

    def _to_entity(self, row: dict[str, Any]) -> T:
        return self._entity_type.from_dict(row)

    async def add(self, entity: T) -> T:
        await self._db.insert(self._table_name, entity.to_dict())
        return entity

    async def update(self, entity: T) -> T:
        entity.touch()
        await self._db.update(self._table_name, entity.id, entity.to_dict())
        return entity

    async def remove(self, entity_id: str) -> bool:
        return await self._db.delete(self._table_name, entity_id)

    async def get(self, entity_id: str) -> Optional[T]:
        row = await self._db.get(self._table_name, entity_id)
        return self._to_entity(row) if row else None

    async def list(self, filters: Optional[dict[str, Any]] = None) -> list[T]:
        rows = await self._db.find(self._table_name, filters)
        return [self._to_entity(row) for row in rows]

    async def find_one(self, filters: dict[str, Any]) -> Optional[T]:
        rows = await self.list(filters)
        return rows[0] if rows else None

    async def count(self, filters: Optional[dict[str, Any]] = None) -> int:
        return await self._db.count(self._table_name, filters)
