#!/usr/bin/env python3
"""Divide um diagrama grande em diagramas menores.

Diagramas com 50 classes viram espaguete em qualquer orientação. Aqui a gente
recorta um fonte por pacote: o novo diagrama fica com os pacotes escolhidos e
com as relações cujas duas pontas continuam presentes. As classes citadas nas
relações que ficaram de fora entram só com o nome, como contexto.
"""
from __future__ import annotations

import re
from pathlib import Path

UML = Path(__file__).resolve().parent.parent
SRC = UML / "src"

PACOTE = re.compile(r'^(\s*)package\s+"([^"]+)"(\s*<<\w+>>)?\s*\{')
DECLARACAO = re.compile(
    r'^\s*(?:abstract\s+)?(?:class|interface|enum|abstract)\s+"?([A-Za-z_][\w]*)"?'
)
RELACAO = re.compile(
    r'^\s*([A-Za-z_][\w]*)\s+("[^"]*"\s+)?(<\|--|<\|\.\.|\*--|o--|-->|\.\.>|--|\.\.|\|>|\.\.\|>)'
    r'\s*("[^"]*"\s+)?([A-Za-z_][\w]*)'
)


class Bloco:
    """Um pacote do fonte, com o texto das classes que ele contém."""

    def __init__(self, nome: str, cabecalho: str, indentacao: int) -> None:
        self.nome = nome
        self.cabecalho = cabecalho
        self.indentacao = indentacao
        self.linhas: list[str] = []
        self.classes: set[str] = set()


def separar(texto: str) -> tuple[list[Bloco], list[str]]:
    """Devolve os pacotes do fonte e as relações declaradas fora deles."""
    blocos: list[Bloco] = []
    relacoes: list[str] = []
    pilha: list[Bloco] = []

    dentro_de_classe = False

    for linha in texto.splitlines():
        # o corpo de uma classe também usa chaves: sem isso, o "}" de uma classe
        # fecharia o pacote por engano
        if dentro_de_classe:
            if pilha:
                pilha[-1].linhas.append(linha)
            if linha.strip() == "}":
                dentro_de_classe = False
            continue

        pacote = PACOTE.match(linha)
        if pacote:
            bloco = Bloco(pacote.group(2), linha, len(pacote.group(1)))
            blocos.append(bloco)
            pilha.append(bloco)
            continue
        if linha.strip() == "}" and pilha:
            pilha.pop()
            continue

        relacao = RELACAO.match(linha)
        declaracao = DECLARACAO.match(linha)
        if declaracao and linha.rstrip().endswith("{"):
            dentro_de_classe = True
        if pilha:
            atual = pilha[-1]
            atual.linhas.append(linha)
            if declaracao:
                atual.classes.add(declaracao.group(1))
        elif relacao:
            relacoes.append(linha.strip())
        elif linha.strip() and not linha.lstrip().startswith(("@", "!", "'", "skinparam", "hide", "left to", "top to")):
            relacoes.append(linha.strip())

    # relações escritas dentro dos pacotes também valem
    for bloco in blocos:
        for linha in list(bloco.linhas):
            if RELACAO.match(linha) and not DECLARACAO.match(linha):
                relacoes.append(linha.strip())
                bloco.linhas.remove(linha)
    return blocos, relacoes


def recortar(origem: str, destino: str, pacotes: tuple[str, ...]) -> tuple[int, int]:
    """Gera `destino` com os `pacotes` pedidos, vindos de `origem`."""
    texto = (SRC / "_base" / f"{origem}.plantuml").read_text()
    blocos, relacoes = separar(texto)

    escolhidos = [b for b in blocos if any(p in b.nome for p in pacotes)]
    presentes = {c for b in escolhidos for c in b.classes}

    mantidas: list[str] = []
    contexto: set[str] = set()
    for relacao in relacoes:
        achado = RELACAO.match(relacao)
        if not achado:
            continue
        esquerda, direita = achado.group(1), achado.group(5)
        if esquerda in presentes or direita in presentes:
            mantidas.append(relacao)
            for lado in (esquerda, direita):
                if lado not in presentes:
                    contexto.add(lado)

    linhas = [f"@startuml {destino}", "!include _estilo.puml", ""]
    for bloco in escolhidos:
        linhas.append(bloco.cabecalho.strip())
        linhas.extend("  " + l.strip() if l.strip() else "" for l in bloco.linhas)
        linhas.append("}")
        linhas.append("")
    if contexto:
        linhas.append('package "contexto" <<Frame>> {')
        linhas.extend(f"  class {nome}" for nome in sorted(contexto))
        linhas.append("}")
        linhas.append("")
    linhas.extend(sorted(set(mantidas)))
    linhas.append("@enduml")

    (SRC / f"{destino}.plantuml").write_text("\n".join(linhas) + "\n")
    return len(presentes), len(mantidas)


#: (fonte, novo diagrama, pacotes que entram)
DIVISOES: tuple[tuple[str, str, tuple[str, ...]], ...] = (
    # o agente tem 56 classes: núcleo de um lado, ferramentas do outro
    ("agent", "agent", ("agent (núcleo)", "agent.base", "agent.prompt")),
    ("agent", "agent_contexto", ("agent.context", "agent.task", "agent.models")),
    ("agent", "agent_ferramentas", ("agent.tools",)),
    # infraestrutura: persistência de um lado, integrações externas do outro
    ("infrastructure", "infraestrutura", ("infrastructure", "db", "scheduler", "seed")),
    ("infrastructure", "integracoes", ("integrations", "export")),
    # domínio: regras de negócio separadas do acesso a dados
    ("services_repositories", "servicos", ("domain.services (implementações)",
                                           "domain.services.interfaces")),
    ("services_repositories", "repositorios", ("domain.repositories", "core.models")),
    # a API não precisa repetir as interfaces de serviço: elas têm diagrama próprio
    ("api", "api", ("api (FastAPI)", "api.schemas.dto (Pydantic)", "api routers",
                    "composition root")),
    # o núcleo fica só com os contratos de infraestrutura
    ("core_interfaces", "core_interfaces", ("core.interfaces (contratos ABC)",)),
)


def main() -> int:
    for origem, destino, pacotes in DIVISOES:
        classes, relacoes = recortar(origem, destino, pacotes)
        print(f"  {destino:<22} {classes:>3} classes, {relacoes:>3} relações")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
