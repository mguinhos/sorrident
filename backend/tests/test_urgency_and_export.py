"""Encaixe de urgência, resposta durante handoff e exportação da conversa."""
from __future__ import annotations

from datetime import date, datetime, timedelta

import pytest

from sorridente.channels.base import InboundMessage
from sorridente.container import ApplicationContainer
from sorridente.core.exceptions import ConflictError
from sorridente.core.interfaces import AgentContext
from sorridente.core.models import ChannelType, Priority, SlotType

pytestmark = pytest.mark.asyncio


def _dia_util(days_ahead: int = 1) -> date:
    day = date.today() + timedelta(days=days_ahead)
    while day.weekday() > 4:
        day += timedelta(days=1)
    return day


async def _contexto(container: ApplicationContainer, external_id: str = "urg-1") -> AgentContext:
    conversa = await container.conversation_service.get_or_create(
        ChannelType.TELEGRAM.value, external_id, "Paciente com dor"
    )
    return AgentContext(
        conversation_id=conversa.id,
        channel=ChannelType.TELEGRAM.value,
        external_id=external_id,
        display_name="Paciente com dor",
    )


async def test_encaixe_manual_sobre_horario_ocupado(container: ApplicationContainer) -> None:
    paciente_a = await container.patient_service.create(name="Primeiro Paciente")
    paciente_b = await container.patient_service.create(name="Segundo Paciente")
    slot = (await container.scheduling_service.available_slots(_dia_util()))[0]
    inicio = datetime.fromisoformat(slot["start"])

    primeiro = await container.appointment_service.schedule(
        patient_id=paciente_a.id, start=inicio, dentist_id=slot["dentist_id"]
    )
    assert primeiro.slot_type == SlotType.REGULAR.value

    # sem autorização, o mesmo horário é recusado
    with pytest.raises(ConflictError):
        await container.appointment_service.schedule(
            patient_id=paciente_b.id, start=inicio, dentist_id=slot["dentist_id"]
        )

    encaixe = await container.appointment_service.schedule(
        patient_id=paciente_b.id,
        start=inicio,
        dentist_id=slot["dentist_id"],
        allow_overbook=True,
    )
    assert encaixe.is_encaixe is True
    assert encaixe.slot_type == SlotType.ENCAIXE.value


async def test_encaixe_de_urgencia_com_agenda_cheia(container: ApplicationContainer) -> None:
    """Mesmo com todos os horários do dia tomados, a urgência encontra lugar."""
    paciente = await container.patient_service.create(name="Paciente Urgente")
    hoje = _dia_util(0)
    for slot in await container.scheduling_service.available_slots(hoje):
        try:
            await container.appointment_service.schedule(
                patient_id=paciente.id,
                start=datetime.fromisoformat(slot["start"]),
                dentist_id=slot["dentist_id"],
            )
        except ConflictError:
            continue

    urgencia = await container.appointment_service.schedule_emergency(
        patient_id=paciente.id, reason="dente quebrado com sangramento"
    )
    assert urgencia.priority == Priority.URGENTE.value
    assert "[URGÊNCIA]" in urgencia.notes
    assert urgencia.procedure_name == "Urgência ortodôntica"


async def test_limite_de_encaixes_de_urgencia_por_dia(container: ApplicationContainer) -> None:
    paciente = await container.patient_service.create(name="Paciente Recorrente")
    settings = await container.settings_service.get()
    inicio = datetime.combine(_dia_util(), datetime.min.time()) + timedelta(hours=9)

    for _ in range(settings.max_emergency_per_day):
        await container.appointment_service.schedule_emergency(
            patient_id=paciente.id, reason="dor", start=inicio
        )
    with pytest.raises(ConflictError, match="limite de encaixes"):
        await container.appointment_service.schedule_emergency(
            patient_id=paciente.id, reason="dor", start=inicio
        )


async def test_ferramentas_de_urgencia_do_agente(container: ApplicationContainer) -> None:
    context = await _contexto(container)
    consultar = container.tool_registry.get("consultar_encaixe_urgencia")
    agendar = container.tool_registry.get("agendar_encaixe_urgencia")
    assert consultar and agendar

    sugestao = await consultar.execute(context)
    assert "inicio" in sugestao

    # paciente sem cadastro prévio: a urgência não pode travar por falta de ficha
    resultado = await agendar.execute(
        context, motivo="aparelho machucando e sangrando", nome_paciente="Paciente com dor"
    )
    assert resultado["status"] == "encaixe_confirmado"

    paciente = await container.patient_repository.find_by_telegram("urg-1")
    assert paciente is not None
    agendamentos = await container.appointment_service.list_all(patient_id=paciente.id)
    assert agendamentos and agendamentos[0].is_urgent


async def test_paciente_recebe_aviso_durante_handoff(container: ApplicationContainer) -> None:
    """O bug reportado: com a conversa assumida, o paciente ficava sem resposta."""
    conversa = await container.conversation_service.get_or_create(
        ChannelType.WEB.value, "handoff-1", "Aguardando"
    )
    await container.conversation_service.set_handoff(conversa.id, True)

    resposta = await container.web_channel.process(
        InboundMessage(ChannelType.WEB.value, "handoff-1", "Está agendado?", "Aguardando")
    )
    assert resposta is not None
    assert "equipe" in resposta.lower()

    # o aviso não se repete a cada mensagem
    repetida = await container.web_channel.process(
        InboundMessage(ChannelType.WEB.value, "handoff-1", "Alô?", "Aguardando")
    )
    assert repetida is None


async def test_exportacao_em_todos_os_formatos(container: ApplicationContainer) -> None:
    conversa = await container.conversation_service.get_or_create(
        ChannelType.WEB.value, "export-1", "Marcel"
    )
    await container.conversation_service.append(conversa.id, "user", "Quero marcar uma consulta")
    await container.conversation_service.append(conversa.id, "assistant", "Claro! Qual dia?")
    await container.conversation_service.append(
        conversa.id, "tool", "listar_procedimentos({})", tool_name="listar_procedimentos"
    )

    assert set(container.export_service.formats()) == {"txt", "md", "html"}

    for formato, esperado in (("txt", ".txt"), ("md", ".md"), ("html", ".html")):
        arquivo = await container.export_service.export(conversa.id, formato)
        conteudo = arquivo.data.decode("utf-8")
        assert arquivo.filename.endswith(esperado)
        assert "Quero marcar uma consulta" in conteudo
        assert "Claro! Qual dia?" in conteudo
        # chamadas de ferramenta não vão para o paciente
        assert "listar_procedimentos" not in conteudo


async def test_ferramenta_de_exportacao_do_agente(container: ApplicationContainer) -> None:
    context = await _contexto(container, external_id="export-2")
    await container.conversation_service.append(context.conversation_id, "user", "Olá")
    tool = container.tool_registry.get("exportar_conversa")
    assert tool is not None

    resultado = await tool.execute(context, formato="txt")
    assert resultado["arquivo"].endswith(".txt")
    # canal do Telegram desligado nos testes: a entrega falha, sem quebrar o atendimento
    assert resultado["entregue_no_chat"] is False
    assert "instrucao_de_resposta" in resultado


async def test_formato_invalido_e_recusado(container: ApplicationContainer) -> None:
    from sorridente.core.exceptions import ValidationError

    conversa = await container.conversation_service.get_or_create(
        ChannelType.WEB.value, "export-3", "Teste"
    )
    await container.conversation_service.append(conversa.id, "user", "oi")
    with pytest.raises(ValidationError):
        await container.export_service.export(conversa.id, "pdf")
