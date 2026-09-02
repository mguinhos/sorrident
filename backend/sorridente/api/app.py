"""Fábrica da aplicação FastAPI (Composition Root da camada HTTP)."""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import Any, AsyncIterator, Optional

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from ..config import AppConfig
from ..container import ApplicationContainer
from ..core.exceptions import SorriDenteError
from .routers import (
    appointments,
    auth,
    catalog,
    chat,
    conversations,
    dashboard,
    integrations,
    knowledge,
    notifications,
)

logger = logging.getLogger(__name__)


class ApplicationFactory:
    """Constrói a aplicação HTTP com o container injetado."""

    def __init__(self, config: Optional[AppConfig] = None) -> None:
        self._config = config or AppConfig.from_env()

    def _lifespan(self):
        container = ApplicationContainer(self._config)

        @asynccontextmanager
        async def lifespan(app: FastAPI) -> AsyncIterator[None]:
            app.state.container = container
            await container.startup()
            logger.info("SorriDente iniciado — modelo LLM: %s", container.llm.model)
            try:
                yield
            finally:
                await container.shutdown()

        return lifespan

    def create(self) -> FastAPI:
        app = FastAPI(
            title="SorriDente API",
            description="Sistema de atendimento e agendamento da clínica ortodôntica SorriDente.",
            version="1.0.0",
            lifespan=self._lifespan(),
        )
        app.add_middleware(
            CORSMiddleware,
            allow_origins=list(self._config.cors_origins) + ["*"],
            allow_credentials=False,
            allow_methods=["*"],
            allow_headers=["*"],
        )

        @app.exception_handler(SorriDenteError)
        async def domain_error_handler(request: Request, exc: SorriDenteError) -> JSONResponse:
            return JSONResponse(status_code=exc.status_code, content={"detail": exc.message})

        for router in (
            auth.router,
            catalog.patients_router,
            catalog.dentists_router,
            catalog.procedures_router,
            appointments.router,
            conversations.router,
            notifications.router,
            knowledge.faq_router,
            knowledge.knowledge_router,
            knowledge.settings_router,
            chat.router,
            integrations.router,
            dashboard.router,
        ):
            app.include_router(router, prefix="/api")

        @app.get("/api/health", tags=["infra"])
        async def health(request: Request) -> dict[str, Any]:
            container: ApplicationContainer = request.app.state.container
            return {
                "status": "ok",
                "model": container.agent.model.to_dict(),
                "llm_configured": container.llm.configured,
                "tools": container.tool_registry.names(),
                "channels": container.channels.status(),
                "integrations": [i.key for i in container.integrations],
            }

        return app


def create_app() -> FastAPI:
    """Ponto de entrada usado pelo Uvicorn (`sorridente.api.app:create_app`)."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    )
    return ApplicationFactory().create()
