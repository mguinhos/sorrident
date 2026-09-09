#!/usr/bin/env python3
"""Deixa os diagramas UML legíveis.

Antes, os diagramas saíam como faixas de até 32000px de largura, com setas
cruzando tudo. Três causas:

1. sem `linetype ortho` as ligações viram diagonais que se cruzam;
2. um pai com muitos filhos espalha os filhos lado a lado e a largura explode;
3. cada diagrama repetia as classes dos outros pacotes com todos os métodos,
   e assinaturas longas esticam as caixas.

O que este script faz em cada fonte:

- inclui o estilo comum (`_estilo.puml`);
- remove os construtores (`__init__`), que são a linha mais longa de quase todo
  diagrama e não dizem nada numa visão de arquitetura;
- colapsa as classes que só aparecem como contexto (ficam só com o nome),
  mantendo os detalhes apenas no pacote que o diagrama documenta;
- marca o pacote do Groq como `<<Cloud>>` e o do TinyDB como `<<Database>>`;
- testa as duas orientações e fica com a de melhor proporção.
"""
from __future__ import annotations

import re
import shutil
import subprocess
from pathlib import Path

UML = Path(__file__).resolve().parent.parent
SRC = UML / "src"
TMP = UML / "_tmp"
IMAGEM_DOCKER = "plantuml/plantuml:latest"

#: proporção largura/altura desejada
ALVO = 1.4

#: nesses diagramas, as classes que casam com o padrão mostram só o que é
#: próprio delas; os métodos que toda irmã repete (o contrato herdado) saem,
#: senão a mesma lista aparece dezenas de vezes e o desenho estica à toa
REPETIDOS: dict[str, tuple[str, tuple[str, ...]]] = {
    "agent_ferramentas": (r"\w+Tool$", ("name()", "description()", "parameters()")),
}

#: pacote que cada diagrama documenta em detalhe; o resto vira contexto
FOCO: dict[str, tuple[str, ...]] = {
    "agent": ("agent",),
    "agent_contexto": ("agent.context", "agent.task", "agent.models"),
    "agent_ferramentas": ("agent.tools", "agent.base"),
    "api": ("api", "composition root"),
    "channels": ("channels",),
    "core_interfaces": ("core.interfaces",),
    "domain_models": ("core.models",),
    "infraestrutura": ("infrastructure", "db", "scheduler", "seed"),
    "integracoes": ("integrations", "export"),
    "rag": ("rag",),
    "repositorios": ("domain.repositories",),
    "servicos": ("domain.services",),
}

#: pacotes que ganham forma própria no desenho
ESTEREOTIPOS: tuple[tuple[str, str], ...] = (
    ("Groq", "Cloud"),
    ("groq", "Cloud"),
    ("TinyDB", "Database"),
    ("tinydb", "Database"),
)

DECLARACAO = re.compile(
    r'^\s*(?:abstract\s+)?(?:class|interface|enum|abstract)\s+"?([A-Za-z_][\w]*)"?'
)
PACOTE = re.compile(r'^(\s*)package\s+"([^"]+)"(\s*<<\w+>>)?\s*\{')


def _e_foco(nome_pacote: str, focos: tuple[str, ...]) -> bool:
    return any(foco in nome_pacote for foco in focos)


def classes_de_contexto(texto: str, focos: tuple[str, ...]) -> list[str]:
    """Classes que aparecem só para dar contexto (ficam sem membros)."""
    contexto: list[str] = []
    pilha: list[tuple[int, bool]] = []  # (indentação, é foco)

    for linha in texto.splitlines():
        pacote = PACOTE.match(linha)
        if pacote:
            indent = len(pacote.group(1))
            while pilha and pilha[-1][0] >= indent:
                pilha.pop()
            herdado = any(foco for _, foco in pilha)
            pilha.append((indent, herdado or _e_foco(pacote.group(2), focos)))
            continue
        if linha.strip() == "}" and pilha:
            pilha.pop()
            continue
        declaracao = DECLARACAO.match(linha)
        if declaracao and pilha and not any(foco for _, foco in pilha):
            contexto.append(declaracao.group(1))
    return sorted(set(contexto))


def aplicar_estereotipos(linha: str) -> str:
    """Dá forma de nuvem ao Groq e de cilindro ao TinyDB."""
    pacote = PACOTE.match(linha)
    if not pacote or pacote.group(3):
        return linha
    nome = pacote.group(2)
    for chave, estereotipo in ESTEREOTIPOS:
        if chave in nome:
            return f'{pacote.group(1)}package "{nome}" <<{estereotipo}>> {{'
    return linha


def reescrever(
    texto: str,
    orientacao: str,
    focos: tuple[str, ...],
    repetidos: tuple[str, tuple[str, ...]] | None = None,
) -> str:
    """Aplica o estilo, tira os construtores e colapsa as classes de contexto."""
    contexto = set(classes_de_contexto(texto, focos))
    saida: list[str] = []
    pulando_corpo = False
    dentro_de_repetida = False
    padrao = re.compile(repetidos[0]) if repetidos else None

    for linha in texto.splitlines():
        # dentro do corpo de uma classe de contexto: descarta até o fecha-chaves
        if pulando_corpo:
            if linha.strip() == "}":
                pulando_corpo = False
            continue

        if re.match(r"^\s*skinparam ", linha) or linha.strip() == "hide empty members":
            continue
        if linha.strip() == "!include _estilo.puml":
            continue
        if re.match(r"^\s*(left to right|top to bottom) direction", linha):
            continue
        if re.search(r"\b__init__\b", linha):
            continue

        declaracao = DECLARACAO.match(linha)
        if declaracao and declaracao.group(1) in contexto and linha.rstrip().endswith("{"):
            # classe de contexto: mantém só o cabeçalho, sem os membros
            saida.append(linha.rstrip()[:-1].rstrip())
            pulando_corpo = True
            continue

        if declaracao and padrao is not None:
            # BaseTool e PatientAwareTool definem o contrato: nelas os métodos ficam
            dentro_de_repetida = bool(
                padrao.search(declaracao.group(1))
                and not declaracao.group(1).startswith(("Base", "PatientAware"))
            )
        elif dentro_de_repetida and linha.strip() == "}":
            dentro_de_repetida = False
        elif dentro_de_repetida and repetidos:
            if any(metodo in linha for metodo in repetidos[1]):
                continue

        saida.append(aplicar_estereotipos(linha))
        if linha.startswith("@startuml"):
            saida.append("!include _estilo.puml")
            if orientacao:
                saida.append(orientacao)
    return "\n".join(saida) + "\n"


def medir(fonte: Path) -> tuple[int, int]:
    TMP.mkdir(exist_ok=True)
    for antigo in TMP.glob("*.svg"):
        antigo.unlink()
    resultado = subprocess.run(
        ["docker", "run", "--rm", "-v", f"{UML}:/uml", IMAGEM_DOCKER,
         "-tsvg", "-o", "/uml/_tmp", f"/uml/src/{fonte.name}"],
        capture_output=True, text=True,
    )
    if resultado.returncode != 0:
        raise RuntimeError(resultado.stderr or resultado.stdout)
    svgs = list(TMP.glob("*.svg"))
    if not svgs:
        raise RuntimeError(f"nada gerado para {fonte.name}")
    achado = re.search(
        r'viewBox="[\d.]+ [\d.]+ ([\d.]+) ([\d.]+)"', svgs[0].read_text()[:3000]
    )
    if not achado:
        raise RuntimeError(f"sem viewBox em {svgs[0].name}")
    return int(float(achado.group(1))), int(float(achado.group(2)))


def distancia(largura: int, altura: int) -> float:
    proporcao = largura / max(altura, 1)
    return abs(proporcao - ALVO) / ALVO


def main() -> int:
    print(f"{'diagrama':<24} {'antes':>13}  {'depois':>13}  layout")
    print("-" * 70)
    for fonte in sorted(f for f in SRC.glob("*.plantuml") if not f.name.startswith("_")):
        original = fonte.read_text()

        focos = FOCO.get(fonte.stem, (fonte.stem,))
        antes = medir(fonte)

        melhor: tuple[float, str, tuple[int, int]] | None = None
        repetidos = REPETIDOS.get(fonte.stem)
        for orientacao in ("", "left to right direction"):
            fonte.write_text(reescrever(original, orientacao, focos, repetidos))
            try:
                dimensao = medir(fonte)
            except RuntimeError as erro:
                print(f"  ! {fonte.name}: {str(erro)[:120]}")
                continue
            nota = distancia(*dimensao)
            if melhor is None or nota < melhor[0]:
                melhor = (nota, orientacao, dimensao)

        if melhor is None:
            fonte.write_text(original)
            continue
        _, orientacao, dimensao = melhor
        fonte.write_text(reescrever(original, orientacao, focos, repetidos))
        rotulo = "left→right" if orientacao else "padrão"
        print(f"{fonte.stem:<24} {antes[0]:>5}x{antes[1]:<7} {dimensao[0]:>5}x{dimensao[1]:<7}  {rotulo}")

    shutil.rmtree(TMP, ignore_errors=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
