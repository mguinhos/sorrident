"""Exceções de domínio do SorriDente."""
from __future__ import annotations


class SorriDenteError(Exception):
    """Erro base da aplicação."""

    status_code: int = 400

    def __init__(self, message: str = "Erro na aplicação SorriDente") -> None:
        super().__init__(message)
        self.message = message


class NotFoundError(SorriDenteError):
    status_code = 404


class ValidationError(SorriDenteError):
    status_code = 422


class ConflictError(SorriDenteError):
    """Conflito de horário/estado (ex.: dois agendamentos no mesmo slot)."""

    status_code = 409


class AuthenticationError(SorriDenteError):
    status_code = 401


class CredentialsNotConfiguredError(SorriDenteError):
    status_code = 424


class LLMError(SorriDenteError):
    status_code = 502
