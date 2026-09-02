"""Rotas de notificações do dashboard."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query

from ...container import ApplicationContainer
from ..dependencies import get_container, require_staff

router = APIRouter(prefix="/notifications", tags=["notificações"], dependencies=[Depends(require_staff)])


@router.get("")
async def list_notifications(
    only_unread: bool = Query(default=False),
    limit: int = Query(default=50, ge=1, le=200),
    container: ApplicationContainer = Depends(get_container),
) -> list[dict[str, Any]]:
    return [n.to_dict() for n in await container.notification_service.list_all(only_unread, limit)]


@router.post("/{notification_id}/read")
async def mark_read(
    notification_id: str, container: ApplicationContainer = Depends(get_container)
) -> dict[str, Any]:
    return (await container.notification_service.mark_read(notification_id)).to_dict()


@router.post("/read-all")
async def mark_all_read(container: ApplicationContainer = Depends(get_container)) -> dict[str, Any]:
    return {"updated": await container.notification_service.mark_all_read()}
