"""Ferramentas do agente executadas sem LLM, contra os serviços reais."""
from __future__ import annotations

from datetime import date, timedelta

import pytest

from sorridente.container import ApplicationContainer
from sorridente.core.interfaces import AgentContext
from sorridente.core.models import ChannelType

pytestmark = pytest.mark.asyncio


def _dia_util(days_ahead: int = 1) -> date:
    day = date.today() + timedelta(days=days_ahead)
    while day.weekday() > 4:
        day += timedelta(days=1)
    return day


async def _contexto(container: ApplicationContainer, external_id: str = "555000") -> AgentContext:
    conversation = await container.conversation_service.get_or_create(
        ChannelType.TELEGRAM.value, external_id, "Paciente Teste"
    )
    return AgentContext(
        conversation_id=conversation.id,
        channel=ChannelType.TELEGRAM.value,
        external_id=external_id,
        display_name="Paciente Teste",
    )


async def test_registro_de_ferramentas(container: ApplicationContainer) -> None:
    registry = container.tool_registry
    esperadas = {
        "consultar_cadastro",
        "cadastrar_cliente",
        "atualizar_informacoes_cliente",
        "marcar_agendamento",
        "consultar_base_de_conhecimento",
        "chamar_atendente_humano",
        "encerrar_atendimento",
    }
    assert esperadas <= set(registry.names())
    for schema in registry.schemas():
        assert schema["type"] == "function"
        assert schema["function"]["description"]


async def test_cadastro_do_cliente_pelo_agente(container: ApplicationContainer) -> None:
    context = await _contexto(container)
    consultar = container.tool_registry.get("consultar_cadastro")
    cadastrar = container.tool_registry.get("cadastrar_cliente")
    atualizar = container.tool_registry.get("atualizar_informacoes_cliente")
    assert consultar and cadastrar and atualizar

    inicial = await consultar.execute(context)
    assert inicial["cadastrado"] is False
    assert "cpf" in inicial["campos_faltando"]

    criado = await cadastrar.execute(
        context,
        nome_completo="Marcos Vinícius Guinho",
        cpf="123.456.789-00",
        telefone="11987654321",
    )
    assert criado["status"] == "cadastrado"
    assert criado["campos_faltando"] == ["data_nascimento"]

    atualizado = await atualizar.execute(
        context,
        data_nascimento="1994-03-12",
        convenio="Amil Dental",
        carteirinha="AMD-99887766",
    )
    assert atualizado["campos_faltando"] == []
    assert atualizado["carteirinha"] == "AMD-99887766"

    paciente = await container.patient_repository.find_by_telegram("555000")
    assert paciente is not None
    assert paciente.insurance_provider == "Amil Dental"
    assert paciente.document == "123.456.789-00"


async def test_cpf_existente_reaproveita_cadastro(container: ApplicationContainer) -> None:
    existente = await container.patient_service.create(
        name="Ana Antiga", document="98765432100", phone="1130004000"
    )
    context = await _contexto(container, external_id="999111")
    cadastrar = container.tool_registry.get("cadastrar_cliente")
    assert cadastrar is not None

    resultado = await cadastrar.execute(
        context, nome_completo="Ana Maria Antiga", cpf="987.654.321-00"
    )
    assert resultado["status"] == "cadastro_atualizado"
    assert resultado["paciente_id"] == existente.id
    assert len(await container.patient_service.list_all()) == 1


async def test_fluxo_completo_pelas_ferramentas(container: ApplicationContainer) -> None:
    context = await _contexto(container)
    slots_tool = container.tool_registry.get("consultar_horarios_disponiveis")
    cadastrar = container.tool_registry.get("cadastrar_cliente")
    marcar = container.tool_registry.get("marcar_agendamento")
    listar = container.tool_registry.get("consultar_meus_agendamentos")
    cancelar = container.tool_registry.get("cancelar_agendamento")
    assert slots_tool and cadastrar and marcar and listar and cancelar

    resultado = await slots_tool.execute(context, data=_dia_util().isoformat(), periodo="manha")
    assert resultado["horarios"]
    assert all(int(s["start"][11:13]) < 12 for s in resultado["horarios"])

    await cadastrar.execute(context, nome_completo="Pedro Braga", cpf="11122233344", telefone="11912345678")
    criado = await marcar.execute(
        context,
        data_hora=resultado["horarios"][0]["start"],
        procedimento="Avaliação ortodôntica",
    )
    assert criado["status"] == "confirmado"
    assert criado["procedimento"] == "Avaliação ortodôntica"

    meus = await listar.execute(context)
    assert len(meus) == 1 and meus[0]["agendamento_id"] == criado["agendamento_id"]

    cancelado = await cancelar.execute(context, agendamento_id=criado["agendamento_id"], motivo="teste")
    assert cancelado["status"] == "cancelado"


async def test_marcar_sem_cadastro_orienta_o_agente(container: ApplicationContainer) -> None:
    context = await _contexto(container)
    marcar = container.tool_registry.get("marcar_agendamento")
    slots = await container.scheduling_service.available_slots(_dia_util())
    assert marcar is not None and slots

    resultado = await marcar.execute(context, data_hora=slots[0]["start"])
    assert "cadastrar_cliente" in resultado["erro"]


async def test_urgencia_avisa_equipe_sem_silenciar_o_agente(container: ApplicationContainer) -> None:
    """Em urgência o agente continua atendendo para oferecer o encaixe."""
    context = await _contexto(container)
    tool = container.tool_registry.get("chamar_atendente_humano")
    assert tool is not None

    resultado = await tool.execute(context, motivo="dente quebrado e sangrando", urgente=True)
    assert resultado["status"] == "equipe_avisada"

    conversa = await container.conversation_service.get(context.conversation_id)
    assert conversa.handoff is False  # o paciente não fica sem resposta

    notificacoes = await container.notification_service.list_all(only_unread=True)
    assert any("urgência" in n.title.lower() for n in notificacoes)


async def test_pedido_explicito_de_humano_assume_a_conversa(container: ApplicationContainer) -> None:
    context = await _contexto(container)
    tool = container.tool_registry.get("chamar_atendente_humano")
    assert tool is not None

    resultado = await tool.execute(
        context, motivo="quer falar com a recepção", assumir_conversa=True
    )
    assert resultado["status"] == "equipe_assumiu"
    conversa = await container.conversation_service.get(context.conversation_id)
    assert conversa.handoff is True


async def test_base_de_conhecimento_responde(container: ApplicationContainer) -> None:
    context = await _contexto(container)
    tool = container.tool_registry.get("consultar_base_de_conhecimento")
    assert tool is not None
    resposta = await tool.execute(context, pergunta="Vocês aceitam convênio odontológico?")
    assert resposta["encontrado"] is True
    assert resposta["trechos"]


async def test_encerrar_atendimento_fecha_a_conversa(container: ApplicationContainer) -> None:
    context = await _contexto(container)
    tool = container.tool_registry.get("encerrar_atendimento")
    assert tool is not None

    await tool.execute(context, resumo="consulta marcada")
    conversa = await container.conversation_service.get(context.conversation_id)
    assert conversa.open is False
    assert conversa.closed_reason == "consulta marcada"

    # nova mensagem do paciente reabre o atendimento
    await container.conversation_service.append(context.conversation_id, "user", "oi de novo")
    conversa = await container.conversation_service.get(context.conversation_id)
    assert conversa.open is True


async def test_ferramenta_com_erro_nao_derruba_conversa(container: ApplicationContainer) -> None:
    context = await _contexto(container)
    tool = container.tool_registry.get("cancelar_agendamento")
    assert tool is not None
    resultado = await tool.execute(context, agendamento_id="inexistente")
    assert "erro" in resultado
