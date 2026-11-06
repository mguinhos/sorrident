"""Testes do cadastro de pacientes, chat público e gestão de usuários."""
from __future__ import annotations

from datetime import datetime, timedelta
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
        opencode_go_api_key="",
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


async def test_visitante_usa_chat_sem_cadastro(client: httpx.AsyncClient) -> None:
    """O chatbot é livre: nenhuma credencial é exigida para conversar."""
    response = await client.post(
        "/api/chat",
        json={"session_id": "visitante-1", "message": "Olá"},
    )
    assert response.status_code == 200
    assert response.json()["conversation_id"]


async def test_visitante_sem_agendamentos(client: httpx.AsyncClient) -> None:
    response = await client.get("/api/chat/my-appointments")
    assert response.status_code == 200
    assert response.json() == []


async def test_cadastro_cria_entidade_propria_do_usuario(client: httpx.AsyncClient) -> None:
    """Cada conta cadastrada ganha sua própria entidade de paciente — mesmo que
    já exista um paciente com o mesmo e-mail na base (ex.: criado pelo chat)."""
    headers = await _login(client, "gestor", "gestor123")
    existente = (
        await client.post(
            "/api/patients",
            json={"name": "Dra. Mônica Cristiane", "email": "bia@email.com", "phone": "11999998888"},
            headers=headers,
        )
    ).json()

    cadastro = await client.post(
        "/api/auth/register",
        json={
            "username": "bia@email.com",
            "password": "senha123",
            "display_name": "Bia Souza",
            "email": "bia@email.com",
            "phone": "11999998888",
        },
    )
    assert cadastro.status_code == 200
    user = cadastro.json()
    assert user["role"] == "cliente"
    # entidade nova e separada — nunca a entidade pré-existente
    assert user["linked_id"] != existente["id"]
    assert user["display_name"] == "Bia Souza"

    propria = (
        await client.get(f"/api/patients/{user['linked_id']}", headers=headers)
    ).json()
    assert propria["name"] == "Bia Souza"
    assert propria["email"] == "bia@email.com"


async def test_gestor_gerencia_usuarios_crud(client: httpx.AsyncClient) -> None:
    """Administrador cria, lê, edita e exclui usuários."""
    headers = await _login(client, "gestor", "gestor123")

    # criar
    criado = await client.post(
        "/api/auth/users",
        json={"username": "recepcao", "password": "senha123", "role": "medico", "display_name": "Recepção"},
        headers=headers,
    )
    assert criado.status_code == 200
    novo = criado.json()
    assert novo["username"] == "recepcao"
    assert "password_hash" not in novo

    # ler
    lista = (await client.get("/api/auth/users", headers=headers)).json()
    assert any(u["id"] == novo["id"] for u in lista)
    um = (await client.get(f"/api/auth/users/{novo['id']}", headers=headers)).json()
    assert um["display_name"] == "Recepção"

    # editar
    editado = await client.put(
        f"/api/auth/users/{novo['id']}",
        json={"display_name": "Recepção Central", "password": "nova-senha", "active": False},
        headers=headers,
    )
    assert editado.status_code == 200
    assert editado.json()["display_name"] == "Recepção Central"
    assert editado.json()["active"] is False

    # usuário desativado não autentica
    bloqueado = await client.post("/api/auth/login", json={"username": "recepcao", "password": "nova-senha"})
    assert bloqueado.status_code == 401

    # excluir
    removido = await client.delete(f"/api/auth/users/{novo['id']}", headers=headers)
    assert removido.status_code == 200
    assert removido.json()["deleted"] is True
    assert (await client.get(f"/api/auth/users/{novo['id']}", headers=headers)).status_code == 404


async def test_nao_gestor_nao_gerencia_usuarios(client: httpx.AsyncClient) -> None:
    headers = await _login(client, "medico", "medico123")
    assert (await client.get("/api/auth/users", headers=headers)).status_code == 401
    assert (
        await client.post(
            "/api/auth/users",
            json={"username": "x", "password": "senha123", "role": "cliente"},
            headers=headers,
        )
    ).status_code == 401


async def test_nao_pode_excluir_ultimo_gestor(client: httpx.AsyncClient) -> None:
    headers = await _login(client, "gestor", "gestor123")
    gestores = [
        u
        for u in (await client.get("/api/auth/users", headers=headers)).json()
        if u["role"] == "gestor"
    ]
    assert len(gestores) == 1
    resposta = await client.delete(f"/api/auth/users/{gestores[0]['id']}", headers=headers)
    assert resposta.status_code == 409


async def test_my_appointments_do_paciente_logado(client: httpx.AsyncClient) -> None:
    """O painel do chatbot mostra apenas as consultas da entidade da conta."""
    headers = await _login(client, "gestor", "gestor123")

    cadastro = await client.post(
        "/api/auth/register",
        json={"username": "caio@email.com", "password": "senha123", "display_name": "Caio Lima", "email": "caio@email.com"},
    )
    assert cadastro.status_code == 200
    patient_id = cadastro.json()["linked_id"]

    inicio = (datetime.now() + timedelta(days=3)).replace(hour=10, minute=0, second=0, microsecond=0)
    await client.post(
        "/api/appointments",
        json={"patient_id": patient_id, "start": inicio.isoformat()},
        headers=headers,
    )

    meu = await _login(client, "caio@email.com", "senha123")
    consultas = (await client.get("/api/chat/my-appointments", headers=meu)).json()
    assert len(consultas) == 1
    assert consultas[0]["patient_id"] == patient_id
