"""Dependências da API: acesso ao container e controle de acesso por perfil."""
from __future__ import annotations

from typing import Optional

from fastapi import Depends, Header, Request

from ..container import ApplicationContainer
from ..core.exceptions import AuthenticationError
from ..core.models import Role, User


def get_container(request: Request) -> ApplicationContainer:
    container: ApplicationContainer = request.app.state.container
    return container


async def get_current_user(
    authorization: Optional[str] = Header(default=None),
    container: ApplicationContainer = Depends(get_container),
) -> User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise AuthenticationError("Credenciais ausentes.")
    token = authorization.split(" ", 1)[1].strip()
    return await container.auth_service.resolve_token(token)


class RoleChecker:
    """Dependência que autoriza apenas determinados perfis (RBAC)."""

    def __init__(self, *roles: Role) -> None:
        self._roles = {role.value for role in roles}

    async def __call__(self, user: User = Depends(get_current_user)) -> User:
        if user.role not in self._roles:
            raise AuthenticationError("Seu perfil não tem acesso a este recurso.")
        return user


require_manager = RoleChecker(Role.GESTOR)
require_staff = RoleChecker(Role.GESTOR, Role.MEDICO)
require_any = RoleChecker(Role.GESTOR, Role.MEDICO, Role.CLIENTE)
