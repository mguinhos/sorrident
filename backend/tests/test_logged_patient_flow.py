"""Testes do fluxo com paciente logado: o agente deve usar o cadastro existente."""
from __future__ import annotations

from typing import Any, AsyncIterator

import httpx
import pytest
import pytest_asyncio

from sorridente.api.app import ApplicationFactory
from sorridente.config import AppConfig
from sorridente.core.models import ChannelType

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


async def test_resumo_de_cadastro_completo_orienta_o_agente(tmp_path) -> None:
    config = AppConfig(
        database_path=tmp_path / "db.json",
        credentials_path=tmp_path / "credentials.json",
        opencode_go_api_key="",
        autostart_telegram=False,
    )
    from sorridente.container import ApplicationContainer

    container = ApplicationContainer(config)
    await container.startup()
    try:
        paciente = await container.patient_service.create(
            name="Marina Costa", age="29", insurance_provider="Amil Dental", email="marina@email.com"
        )
        resumo = await container.dispatcher._registration_summary(paciente.id)
        assert resumo == "Marina Costa — cadastro completo"

        prompt = await container.agent._prompt_builder.build(
            __import__("sorridente.core.interfaces", fromlist=["AgentContext"]).AgentContext(
                conversation_id="c1",
                channel=ChannelType.WEB.value,
                external_id="user:u1",
                patient_id=paciente.id,
                display_name="Marina Costa",
                metadata={"cadastro": resumo},
            )
        )
        assert "USE os dados que já estão no cadastro" in prompt
        assert "PULE este passo" in prompt
    finally:
        await container.shutdown()


async def test_chat_de_usuario_logado_vincula_o_paciente_do_cadastro(client: httpx.AsyncClient) -> None:
    """Ao conversar logado, a conversa fica vinculada ao paciente do cadastro."""
    gestor = await _login(client, "gestor", "gestor123")
    paciente = (
        await client.post(
            "/api/patients",
            json={"name": "João Pedro", "email": "joao@email.com", "phone": "11988887777"},
            headers=gestor,
        )
    ).json()
    cadastro = await client.post(
        "/api/auth/register",
        json={
            "username": "joao@email.com",
            "password": "senha123",
            "display_name": "João Pedro",
            "email": "joao@email.com",
        },
    )
    assert cadastro.status_code == 200
    # cada conta ganha a própria entidade — não herda a criada pelo gestor
    assert cadastro.json()["linked_id"] != paciente["id"]

    meu = await _login(client, "joao@email.com", "senha123")

    # o agente real responde via LLM; aqui verificamos o vínculo criado pelo chat
    resposta = await client.post(
        "/api/chat",
        json={"session_id": "qualquer", "message": "Quero marcar consulta"},
        headers=meu,
    )
    assert resposta.status_code == 200
    conversas = (await client.get("/api/conversations", headers=gestor)).json()
    minha = next(
        (c for c in conversas if c["external_id"] == f"user:{cadastro.json()['id']}"), None
    )
    assert minha is not None
    assert minha["patient_id"] == cadastro.json()["linked_id"]


async def test_marcar_agendamento_usa_paciente_ja_vinculado(tmp_path) -> None:
    """A ferramenta de marcação não exige dados quando o paciente já está vinculado."""
    from sorridente.container import ApplicationContainer
    from sorridente.core.interfaces import AgentContext

    config = AppConfig(
        database_path=tmp_path / "db.json",
        credentials_path=tmp_path / "credentials.json",
        opencode_go_api_key="",
        autostart_telegram=False,
    )
    container = ApplicationContainer(config)
    await container.startup()
    try:
        paciente = await container.patient_service.create(name="Marina Costa", age="29")
        context = AgentContext(
            conversation_id="c1",
            channel=ChannelType.WEB.value,
            external_id="user:u1",
            patient_id=paciente.id,
            display_name="Marina Costa",
        )
        marcar = container.tool_registry.get("marcar_agendamento")
        from datetime import datetime, timedelta

        inicio = (datetime.now() + timedelta(days=2)).replace(hour=9, minute=0, second=0, microsecond=0)
        resultado = await marcar.execute(
            context, data_hora=inicio.isoformat(), procedimento="Avaliação ortodôntica"
        )
        assert resultado["status"] == "confirmado"
        assert resultado["paciente"] == "Marina Costa"
    finally:
        await container.shutdown()


async def test_chat_envia_confirmacao_por_email_sem_duplicar(
    client: httpx.AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Ao abrir o chat logado, a confirmação das consultas vai por e-mail uma única vez."""
    from datetime import datetime, timedelta

    gestor = await _login(client, "gestor", "gestor123")
    cadastro = await client.post(
        "/api/auth/register",
        json={
            "username": "paula@email.com",
            "password": "senha123",
            "display_name": "Paula Reis",
            "email": "paula@email.com",
        },
    )
    patient_id = cadastro.json()["linked_id"]
    inicio = (datetime.now() + timedelta(days=2)).replace(hour=10, minute=0, second=0, microsecond=0)
    await client.post(
        "/api/appointments",
        json={"patient_id": patient_id, "start": inicio.isoformat()},
        headers=gestor,
    )
    meu = await _login(client, "paula@email.com", "senha123")

    app = client._transport.app  # type: ignore[attr-defined]
    container = app.state.container
    enviados: list[str] = []

    async def fake_send_confirmation(appointment: Any, patient: Any) -> bool:
        enviados.append(appointment.id)
        return True

    monkeypatch.setattr(container.email_sender, "send_appointment_confirmation", fake_send_confirmation)

    primeira = await client.post("/api/chat/enviar-confirmacao-email", headers=meu)
    assert primeira.status_code == 200
    assert primeira.json()["enviados"] == 1
    assert len(enviados) == 1

    # segunda chamada não reenvia
    segunda = await client.post("/api/chat/enviar-confirmacao-email", headers=meu)
    assert segunda.json()["enviados"] == 0
    assert len(enviados) == 1

    # visitante: nada é enviado
    visita = await client.post("/api/chat/enviar-confirmacao-email")
    assert visita.json()["enviados"] == 0
