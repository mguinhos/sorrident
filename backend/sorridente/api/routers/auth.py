"""Rotas de autenticação, cadastro e gestão de usuários."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends

from ...container import ApplicationContainer
from ...core.models import User
from ..dependencies import get_container, get_current_user, require_manager
from ..schemas.dto import LoginRequest, RegisterRequest, UserCreateRequest, UserUpdateRequest

router = APIRouter(prefix="/auth", tags=["auth"])


def _public(user: User) -> dict[str, Any]:
    return {k: v for k, v in user.to_dict().items() if k != "password_hash"}


@router.post("/login")
async def login(
    payload: LoginRequest, container: ApplicationContainer = Depends(get_container)
) -> dict[str, Any]:
    user, token = await container.auth_service.authenticate(payload.username, payload.password)
    return {"token": token, "user": _public(user)}


@router.post("/register")
async def register(
    payload: RegisterRequest, container: ApplicationContainer = Depends(get_container)
) -> dict[str, Any]:
    """Cadastro público do paciente — necessário apenas para acompanhar consultas."""
    user = await container.auth_service.register(
        payload.username,
        payload.password,
        payload.role,
        payload.display_name,
        email=payload.email,
        phone=payload.phone,
        document=payload.document,
    )
    return _public(user)


@router.get("/me")
async def me(user: User = Depends(get_current_user)) -> dict[str, Any]:
    return _public(user)


@router.post("/logout")
async def logout(
    user: User = Depends(get_current_user), container: ApplicationContainer = Depends(get_container)
) -> dict[str, Any]:
    return {"status": "ok"}


# ---------------- Gestão de usuários (Administrador) ----------------


@router.get("/users", dependencies=[Depends(require_manager)])
async def list_users(container: ApplicationContainer = Depends(get_container)) -> list[dict[str, Any]]:
    return [_public(u) for u in await container.auth_service.list_users()]


@router.get("/users/{user_id}", dependencies=[Depends(require_manager)])
async def get_user(
    user_id: str, container: ApplicationContainer = Depends(get_container)
) -> dict[str, Any]:
    return _public(await container.auth_service.get_user(user_id))


@router.post("/users", dependencies=[Depends(require_manager)])
async def create_user(
    payload: UserCreateRequest, container: ApplicationContainer = Depends(get_container)
) -> dict[str, Any]:
    """Cria um usuário do sistema (cliente, médico ou gestor)."""
    user = await container.auth_service.register(
        payload.username,
        payload.password,
        payload.role,
        payload.display_name,
    )
    if payload.linked_id:
        user = await container.auth_service.update_user(user.id, linked_id=payload.linked_id)
    if payload.active is False:
        user = await container.auth_service.update_user(user.id, active=False)
    return _public(user)


@router.put("/users/{user_id}", dependencies=[Depends(require_manager)])
async def update_user(
    user_id: str,
    payload: UserUpdateRequest,
    container: ApplicationContainer = Depends(get_container),
) -> dict[str, Any]:
    """Edita um usuário; preencha `password` apenas para trocar a senha."""
    user = await container.auth_service.update_user(
        user_id, **payload.model_dump(exclude_none=True)
    )
    return _public(user)


@router.delete("/users/{user_id}", dependencies=[Depends(require_manager)])
async def delete_user(
    user_id: str, container: ApplicationContainer = Depends(get_container)
) -> dict[str, Any]:
    deleted = await container.auth_service.delete_user(user_id)
    return {"deleted": deleted}
