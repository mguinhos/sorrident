"""Testes da API HTTP: autenticação, perfis de acesso e integrações."""
from __future__ import annotations

from datetime import date, timedelta
from typing import AsyncIterator

import httpx
import pytest
import pytest_asyncio

from sorridente.api.app import ApplicationFactory
from sorridente.config import AppConfig

pytestmark = pytest.mark.asyncio


@pytest_asyncio.fixture
async def client(tmp_path) -> AsyncIterator[httpx.AsyncClient]:
    config = AppConfig(
        database_path=tmp_path / "db.json",
        credentials_path=tmp_path / "credentials.json",
        groq_api_key="",
        autostart_telegram=False,
    )
    app = ApplicationFactory(config).create()
    transport = httpx.ASGITransport(app=app)
    async with app.router.lifespan_context(app):
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as http:
            yield http


async def _login(client: httpx.AsyncClient, username: str, password: str) -> dict[str, str]:
    response = await client.post("/api/auth/login", json={"username": username, "password": password})
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['token']}"}


async def test_health_lista_ferramentas_e_canais(client: httpx.AsyncClient) -> None:
    data = (await client.get("/api/health")).json()
    assert data["status"] == "ok"
    assert "marcar_agendamento" in data["tools"]
    assert {c["channel"] for c in data["channels"]} == {"web", "telegram", "whatsapp"}


async def test_login_invalido(client: httpx.AsyncClient) -> None:
    response = await client.post("/api/auth/login", json={"username": "gestor", "password": "errada"})
    assert response.status_code == 401


async def test_rota_protegida_exige_token(client: httpx.AsyncClient) -> None:
    assert (await client.get("/api/patients")).status_code == 401


async def test_cliente_nao_acessa_dashboard(client: httpx.AsyncClient) -> None:
    headers = await _login(client, "cliente", "cliente123")
    assert (await client.get("/api/dashboard", headers=headers)).status_code == 401


async def test_gestor_cria_paciente_e_agenda(client: httpx.AsyncClient) -> None:
    headers = await _login(client, "gestor", "gestor123")

    paciente = (
        await client.post("/api/patients", json={"name": "Luísa Prado", "phone": "11955554444"}, headers=headers)
    ).json()

    day = date.today() + timedelta(days=1)
    while day.weekday() > 4:
        day += timedelta(days=1)
    slots = (await client.get(f"/api/appointments/slots?day={day.isoformat()}", headers=headers)).json()
    assert slots

    criado = await client.post(
        "/api/appointments",
        json={"patient_id": paciente["id"], "start": slots[0]["start"], "dentist_id": slots[0]["dentist_id"]},
        headers=headers,
    )
    assert criado.status_code == 200

    conflito = await client.post(
        "/api/appointments",
        json={"patient_id": paciente["id"], "start": slots[0]["start"], "dentist_id": slots[0]["dentist_id"]},
        headers=headers,
    )
    assert conflito.status_code == 409

    dashboard = (await client.get("/api/dashboard", headers=headers)).json()
    assert dashboard["appointments_total"] == 1
    assert dashboard["patients_total"] == 1


async def test_integracoes_expoem_campos_e_tipos(client: httpx.AsyncClient) -> None:
    headers = await _login(client, "gestor", "gestor123")
    data = (await client.get("/api/integrations", headers=headers)).json()
    por_chave = {i["key"]: i for i in data["integrations"]}

    assert por_chave["groq"]["kind"] == "inference_provider"
    assert por_chave["telegram"]["kind"] == "messaging_channel"
    assert [f["key"] for f in por_chave["groq"]["fields"]] == ["api_key", "model"]
    assert por_chave["groq"]["active_inference"] is True


async def test_salvar_credencial_do_telegram_mascara_segredo(client: httpx.AsyncClient) -> None:
    headers = await _login(client, "gestor", "gestor123")
    response = await client.put(
        "/api/integrations/telegram",
        json={"values": {"bot_token": "123456:token-de-teste-bem-longo", "autostart": False}, "enable": False},
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json()["configured"] is True

    data = (await client.get("/api/integrations/telegram", headers=headers)).json()
    assert "…" in data["values"]["bot_token"]
    assert "token-de-teste" not in data["values"]["bot_token"]


async def test_medico_nao_altera_configuracoes(client: httpx.AsyncClient) -> None:
    headers = await _login(client, "medico", "medico123")
    assert (await client.put("/api/settings", json={"clinic_name": "X"}, headers=headers)).status_code == 401
    assert (await client.get("/api/appointments", headers=headers)).status_code == 200
