"""Rotas de autenticação e perfis de acesso."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends

from ...container import ApplicationContainer
from ...core.models import User
from ..dependencies import get_container, get_current_user, require_manager
from ..schemas.dto import LoginRequest, RegisterRequest

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
async def login(
    payload: LoginRequest, container: ApplicationContainer = Depends(get_container)
) -> dict[str, Any]:
    user, token = await container.auth_service.authenticate(payload.username, payload.password)
    return {"token": token, "user": user.to_dict()}


@router.post("/register")
async def register(
    payload: RegisterRequest, container: ApplicationContainer = Depends(get_container)
) -> dict[str, Any]:
    user = await container.auth_service.register(
        payload.username, payload.password, payload.role, payload.display_name
    )
    return user.to_dict()


@router.get("/me")
async def me(user: User = Depends(get_current_user)) -> dict[str, Any]:
    return user.to_dict()


@router.post("/logout")
async def logout(
    user: User = Depends(get_current_user), container: ApplicationContainer = Depends(get_container)
) -> dict[str, Any]:
    return {"status": "ok"}


@router.get("/users", dependencies=[Depends(require_manager)])
async def list_users(container: ApplicationContainer = Depends(get_container)) -> list[dict[str, Any]]:
    return [
        {k: v for k, v in u.to_dict().items() if k != "password_hash"}
        for u in await container.auth_service.list_users()
    ]
