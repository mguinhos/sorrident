"""Carga inicial de dados (idempotente) para a clínica funcionar de imediato."""
from __future__ import annotations

import logging
from abc import ABC, abstractmethod

from .core.models import Dentist, FAQ, KnowledgeDocument, Procedure, Role
from .domain.repositories import (
    DentistRepository,
    FAQRepository,
    KnowledgeRepository,
    ProcedureRepository,
    SettingsRepository,
    UserRepository,
)
from .domain.services.clinic_services import AuthService

logger = logging.getLogger(__name__)

COMERCIAL = {str(d): [["08:00", "12:00"], ["13:00", "18:00"]] for d in range(5)}

PROCEDURES: list[dict[str, object]] = [
    {"name": "Avaliação ortodôntica", "description": "Primeira consulta com diagnóstico e plano de tratamento.", "duration_minutes": 40, "price": 0.0},
    {"name": "Manutenção de aparelho fixo", "description": "Ajuste mensal do aparelho e troca de borrachinhas.", "duration_minutes": 30, "price": 180.0},
    {"name": "Instalação de aparelho fixo", "description": "Colagem de braquetes e montagem do arco.", "duration_minutes": 90, "price": 900.0},
    {"name": "Alinhadores invisíveis", "description": "Planejamento digital e entrega de alinhadores.", "duration_minutes": 60, "price": 1200.0},
    {"name": "Remoção de aparelho e contenção", "description": "Retirada dos braquetes, profilaxia e moldagem da contenção.", "duration_minutes": 60, "price": 600.0},
    {"name": "Urgência ortodôntica", "description": "Fio solto, braquete descolado ou machucado.", "duration_minutes": 30, "price": 120.0},
]

FAQS: list[dict[str, object]] = [
    {"question": "Quanto custa a primeira avaliação?", "answer": "A avaliação ortodôntica inicial é gratuita e dura cerca de 40 minutos. Nela fazemos o diagnóstico e apresentamos o plano de tratamento com valores.", "tags": ["preço", "avaliação", "primeira consulta"]},
    {"question": "Quais convênios são aceitos?", "answer": "Atendemos Amil Dental, Bradesco Dental, SulAmérica Odonto e Odontoprev. Também trabalhamos com particular parcelado em até 12x no cartão.", "tags": ["convênio", "plano", "pagamento"]},
    {"question": "De quanto em quanto tempo é a manutenção?", "answer": "A manutenção do aparelho fixo é mensal, a cada 30 dias, e dura em média 30 minutos.", "tags": ["manutenção", "aparelho", "retorno"]},
    {"question": "Quanto tempo dura o tratamento ortodôntico?", "answer": "Depende do caso: em média de 18 a 24 meses com aparelho fixo, e de 8 a 18 meses com alinhadores. O prazo exato é definido na avaliação.", "tags": ["tempo", "duração", "tratamento"]},
    {"question": "Meu braquete descolou, o que faço?", "answer": "Não tente recolar em casa. Se o fio estiver machucando, proteja com cera ortodôntica e agende uma urgência ortodôntica — atendemos no mesmo dia sempre que possível.", "tags": ["urgência", "braquete", "quebrou", "soltou"]},
    {"question": "Posso remarcar minha consulta?", "answer": "Sim! Remarcamos sem custo com pelo menos 24 horas de antecedência. É só me dizer a nova data que eu verifico os horários livres.", "tags": ["remarcar", "cancelar", "desmarcar"]},
    {"question": "Quais são as formas de pagamento?", "answer": "Aceitamos PIX, dinheiro, cartão de débito e crédito em até 12x, além de boleto mensal para as manutenções.", "tags": ["pagamento", "parcelamento", "pix"]},
    {"question": "Atendem crianças?", "answer": "Sim. Fazemos ortodontia preventiva e interceptativa a partir dos 6 anos, além do acompanhamento do crescimento.", "tags": ["criança", "infantil", "idade"]},
    {"question": "Onde fica a clínica e qual o horário?", "answer": "Atendemos de segunda a sexta, das 8h às 18h, com intervalo de almoço das 12h às 13h. O endereço completo está na aba de contato.", "tags": ["endereço", "horário", "funcionamento"]},
    {"question": "Preciso levar exames na primeira consulta?", "answer": "Não é obrigatório. Se já tiver radiografia panorâmica recente, traga; caso contrário, indicamos o exame após a avaliação.", "tags": ["exame", "raio-x", "documentação"]},
]

KNOWLEDGE: list[dict[str, object]] = [
    {
        "title": "Como funciona a primeira consulta",
        "tags": ["primeira consulta", "avaliação", "documentação"],
        "content": (
            "A primeira consulta na SorriDente é uma avaliação ortodôntica gratuita, com cerca de "
            "40 minutos. O ortodontista examina a mordida, o alinhamento e a saúde gengival, "
            "conversa sobre a queixa do paciente e apresenta as opções de tratamento.\n\n"
            "Traga um documento com foto, a carteirinha do convênio (se tiver) e radiografias "
            "recentes, caso já possua. Chegue 10 minutos antes para o cadastro na recepção. "
            "Pacientes menores de 18 anos precisam estar acompanhados de um responsável."
        ),
    },
    {
        "title": "Documentação ortodôntica",
        "tags": ["documentação", "exames", "raio-x", "radiografia"],
        "content": (
            "Depois da avaliação, o ortodontista pode solicitar a documentação ortodôntica: "
            "radiografia panorâmica, telerradiografia de perfil, fotografias intra e extrabucais "
            "e modelos digitais das arcadas.\n\n"
            "A documentação é feita em clínica de radiologia parceira e fica pronta em cerca de "
            "3 dias úteis. Ela é necessária para montar o plano de tratamento e definir o prazo "
            "e o valor exatos."
        ),
    },
    {
        "title": "Cuidados com o aparelho fixo",
        "tags": ["cuidados", "higiene", "alimentação", "aparelho fixo"],
        "content": (
            "Escove os dentes após todas as refeições, usando escova ortodôntica, escova "
            "interdental e fio dental com passa-fio. A higiene malfeita causa manchas brancas e "
            "inflamação na gengiva.\n\n"
            "Evite alimentos duros (gelo, castanhas, torresmo), pegajosos (bala de caramelo, "
            "chiclete) e morder alimentos com os dentes da frente: corte maçã, pão e sanduíche em "
            "pedaços. Se sentir o fio machucando, proteja a região com cera ortodôntica e entre em "
            "contato com a clínica."
        ),
    },
    {
        "title": "Depois da instalação do aparelho",
        "tags": ["pós-instalação", "dor", "desconforto", "adaptação"],
        "content": (
            "É normal sentir sensibilidade e desconforto nos primeiros 3 a 5 dias após a "
            "instalação ou a manutenção do aparelho, porque os dentes começam a se movimentar. "
            "Alimentos macios e gelados ajudam nesse período.\n\n"
            "Se a dor for intensa, persistir por mais de uma semana, ou se houver inchaço, "
            "sangramento contínuo ou febre, entre em contato com a clínica: esse quadro precisa de "
            "avaliação do profissional."
        ),
    },
    {
        "title": "Contenção após o tratamento",
        "tags": ["contenção", "final do tratamento", "recidiva"],
        "content": (
            "Ao retirar o aparelho, é instalada a contenção — fixa (fio colado atrás dos dentes) "
            "ou removível (placa transparente). Sem contenção, os dentes tendem a voltar à posição "
            "original, o que chamamos de recidiva.\n\n"
            "A contenção removível costuma ser usada em tempo integral nos primeiros meses e "
            "depois só para dormir. O acompanhamento é semestral no primeiro ano."
        ),
    },
    {
        "title": "Política de faltas e remarcações",
        "tags": ["falta", "remarcar", "cancelar", "atraso"],
        "content": (
            "Remarcações são gratuitas com no mínimo 24 horas de antecedência. Faltas sem aviso "
            "podem ser cobradas conforme o contrato de tratamento.\n\n"
            "Atrasos de mais de 15 minutos podem exigir reagendamento, para não comprometer os "
            "horários dos próximos pacientes. Avise pelo WhatsApp ou pelo bot se estiver a caminho."
        ),
    },
]

DENTISTS: list[dict[str, object]] = [
    {"name": "Dra. Helena Martins", "cro": "CRO-SP 48211", "specialty": "Ortodontia", "color": "#1677ff", "availability": COMERCIAL},
    {"name": "Dr. Rafael Nogueira", "cro": "CRO-SP 51907", "specialty": "Ortodontia e Odontopediatria", "color": "#52c41a", "availability": COMERCIAL},
]

USERS: list[tuple[str, str, str, str]] = [
    ("gestor", "gestor123", Role.GESTOR.value, "Gestão SorriDente"),
    ("medico", "medico123", Role.MEDICO.value, "Dra. Helena Martins"),
    ("cliente", "cliente123", Role.CLIENTE.value, "Paciente Demonstração"),
]


class ISeeder(ABC):
    """Carga inicial de dados da aplicação."""

    @abstractmethod
    async def run(self) -> None: ...


class DataSeeder(ISeeder):
    """Popula o banco apenas na primeira execução (idempotente)."""

    def __init__(
        self,
        settings: SettingsRepository,
        users: UserRepository,
        dentists: DentistRepository,
        procedures: ProcedureRepository,
        faqs: FAQRepository,
        knowledge: KnowledgeRepository,
        auth: AuthService,
    ) -> None:
        self._settings = settings
        self._users = users
        self._dentists = dentists
        self._procedures = procedures
        self._faqs = faqs
        self._knowledge = knowledge
        self._auth = auth

    async def run(self) -> None:
        settings = await self._settings.current()
        if not settings.address:
            settings.address = "Av. das Orquídeas, 1200 — Sala 304, Centro"
            settings.phone = "(11) 4002-8922"
            settings.email = "contato@sorridente.com.br"
            await self._settings.update(settings)

        if not await self._dentists.list():
            for data in DENTISTS:
                await self._dentists.add(Dentist(**data))  # type: ignore[arg-type]
            logger.info("Profissionais iniciais criados.")

        if not await self._procedures.list():
            for data in PROCEDURES:
                await self._procedures.add(Procedure(**data))  # type: ignore[arg-type]
            logger.info("Procedimentos iniciais criados.")

        if not await self._faqs.list():
            for data in FAQS:
                await self._faqs.add(FAQ(**data))  # type: ignore[arg-type]
            logger.info("Base de dúvidas frequentes criada.")

        if not await self._knowledge.list():
            for data in KNOWLEDGE:
                await self._knowledge.add(KnowledgeDocument(source="manual", **data))  # type: ignore[arg-type]
            logger.info("Base de conhecimento inicial criada.")

        for username, password, role, display_name in USERS:
            if await self._users.find_by_username(username) is None:
                await self._auth.register(username, password, role, display_name)
                logger.info("Usuário '%s' (%s) criado.", username, role)

        # Vincula o usuário médico ao primeiro profissional cadastrado.
        medico = await self._users.find_by_username("medico")
        dentists = await self._dentists.list()
        if medico is not None and dentists and not medico.linked_id:
            medico.linked_id = dentists[0].id
            await self._users.update(medico)
