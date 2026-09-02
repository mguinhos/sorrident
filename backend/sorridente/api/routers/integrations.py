"""Rotas de integrações: descoberta, credenciais e ciclo de vida.

O endpoint é genérico: qualquer `IIntegration` registrada aparece aqui e a
interface web monta o formulário a partir dos campos declarados por ela.
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Request
from fastapi.responses import PlainTextResponse

from ...container import ApplicationContainer
from ...core.exceptions import AuthenticationError
from ...integrations import IntegrationKind
from ..dependencies import get_container, require_manager
from ..schemas.dto import IntegrationCredentialsRequest

router = APIRouter(prefix="/integrations", tags=["integrações"])


@router.get("", dependencies=[Depends(require_manager)])
async def list_integrations(
    container: ApplicationContainer = Depends(get_container),
) -> dict[str, Any]:
    return {
        "integrations": container.integrations.describe_all(),
        "kinds": [kind.value for kind in IntegrationKind],
        "channels": container.channels.status(),
    }


@router.get("/{key}", dependencies=[Depends(require_manager)])
async def get_integration(
    key: str, container: ApplicationContainer = Depends(get_container)
) -> dict[str, Any]:
    integration = container.integrations.get(key)
    return {
        **integration.describe(),
        "status": integration.status().to_dict(),
        "values": integration.masked_credentials(),  # type: ignore[attr-defined]
    }


@router.put("/{key}", dependencies=[Depends(require_manager)])
async def save_integration(
    key: str,
    payload: IntegrationCredentialsRequest,
    container: ApplicationContainer = Depends(get_container),
) -> dict[str, Any]:
    """Salva credenciais em credentials.json e reaplica a integração."""
    integration = await container.integrations.save(key, payload.values)
    if payload.enable is True:
        await container.integrations.disable(key)
        await container.integrations.enable(key)
    elif payload.enable is False:
        await container.integrations.disable(key)
    return integration.status().to_dict()


@router.post("/{key}/enable", dependencies=[Depends(require_manager)])
async def enable_integration(
    key: str, container: ApplicationContainer = Depends(get_container)
) -> dict[str, Any]:
    return (await container.integrations.enable(key)).status().to_dict()


@router.post("/{key}/disable", dependencies=[Depends(require_manager)])
async def disable_integration(
    key: str, container: ApplicationContainer = Depends(get_container)
) -> dict[str, Any]:
    return (await container.integrations.disable(key)).status().to_dict()


@router.post("/{key}/test", dependencies=[Depends(require_manager)])
async def test_integration(
    key: str, container: ApplicationContainer = Depends(get_container)
) -> dict[str, Any]:
    return await container.integrations.get(key).test()


@router.post("/{key}/activate-inference", dependencies=[Depends(require_manager)])
async def activate_inference(
    key: str, container: ApplicationContainer = Depends(get_container)
) -> dict[str, Any]:
    """Define qual provedor de inferência o agente deve usar."""
    await container.integrations.set_active_inference(key)
    return {"active_inference_provider": key, "model": container.llm.model}


@router.get("/webhooks/whatsapp")
async def verify_whatsapp_webhook(
    request: Request, container: ApplicationContainer = Depends(get_container)
) -> PlainTextResponse:
    params = request.query_params
    if params.get("hub.verify_token") != container.whatsapp_channel.verify_token:
        raise AuthenticationError("Token de verificação inválido.")
    return PlainTextResponse(params.get("hub.challenge", ""))


@router.post("/webhooks/whatsapp")
async def whatsapp_webhook(
    request: Request, container: ApplicationContainer = Depends(get_container)
) -> dict[str, Any]:
    await container.whatsapp_channel.handle_webhook(await request.json())
    return {"status": "ok"}
