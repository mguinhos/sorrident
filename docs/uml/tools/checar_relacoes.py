#!/usr/bin/env python3
"""Confere se as setas dos diagramas batem com o código.

Regras do PlantUML que a gente segue:
  <|--  extensão   (classe herda classe, interface estende interface)
  <|..  implementação (classe concreta realiza uma interface)
  -->   dependência

O script lê o código em backend/sorridente para saber quem é interface (ABC) e
quem herda de quem, e compara com o que está desenhado.
"""
from __future__ import annotations

import ast
import re
from pathlib import Path

UML = Path(__file__).resolve().parent.parent
SRC = UML / "src"
CODIGO = UML.parent.parent / "backend" / "sorridente"

RELACAO = re.compile(
    r"^\s*([A-Za-z_]\w*)\s+(<\|--|<\|\.\.|\*--|o--|-->|\.\.>)\s+([A-Za-z_]\w*)"
)
DECLARACAO_TIPO = re.compile(
    r'^\s*(abstract\s+class|abstract|interface|enum|class)\s+"?([A-Za-z_]\w*)"?'
)


def tipos_globais() -> dict[str, str]:
    """Tipo de cada elemento, visto em todos os fontes.

    Um diagrama pode citar uma interface sem declará-la (ela entra só como
    contexto); por isso o tipo é resolvido olhando o conjunto dos diagramas.
    """
    tipos: dict[str, str] = {}
    for fonte in list((SRC / "_base").glob("*.plantuml")) + list(SRC.glob("*.plantuml")):
        for nome, tipo in tipos_declarados(fonte.read_text()).items():
            # interface tem precedência: é a declaração mais específica
            if tipos.get(nome) != "interface":
                tipos[nome] = tipo
    return tipos


def tipos_declarados(texto: str) -> dict[str, str]:
    """Como cada elemento aparece no diagrama: interface, abstract ou class."""
    tipos: dict[str, str] = {}
    for linha in texto.splitlines():
        achado = DECLARACAO_TIPO.match(linha)
        if achado:
            palavra = achado.group(1).split()[0]
            tipos[achado.group(2)] = "interface" if palavra == "interface" else (
                "abstract" if palavra == "abstract" else "class"
            )
    return tipos


def nome_da_base(no: ast.expr) -> str | None:
    """Nome da classe base, mesmo quando genérica: IRepository[T] -> IRepository."""
    if isinstance(no, ast.Name):
        return no.id
    if isinstance(no, ast.Attribute):
        return no.attr
    if isinstance(no, ast.Subscript):  # genéricos
        return nome_da_base(no.value)
    return None


def inventario() -> tuple[set[str], dict[str, set[str]]]:
    """Devolve (interfaces puras, bases de cada classe) lidos do código.

    Interface pura = só tem métodos abstratos. Uma classe abstrata que já traz
    implementação (as Base*) conta como classe: herdar dela é extensão (<|--),
    não realização (<|..).
    """
    interfaces: set[str] = set()
    bases: dict[str, set[str]] = {}

    for arquivo in CODIGO.rglob("*.py"):
        try:
            arvore = ast.parse(arquivo.read_text())
        except SyntaxError:
            continue
        for no in ast.walk(arvore):
            if not isinstance(no, ast.ClassDef):
                continue
            nomes = {n for n in (nome_da_base(b) for b in no.bases) if n}
            bases[no.name] = nomes

            metodos = [
                c for c in no.body
                if isinstance(c, (ast.FunctionDef, ast.AsyncFunctionDef))
                and not c.name.startswith("_")
            ]
            def e_abstrato(metodo: ast.AST) -> bool:
                return any(
                    (getattr(d, "id", None) or getattr(d, "attr", None)) == "abstractmethod"
                    for d in metodo.decorator_list  # type: ignore[attr-defined]
                )
            if metodos and all(e_abstrato(m) for m in metodos) and "ABC" in nomes:
                interfaces.add(no.name)
    return interfaces, bases


def main(corrigir: bool = False) -> int:
    interfaces, bases = inventario()
    tipos = tipos_globais()
    problemas = 0

    # os fontes-base entram na conferência: é de lá que os diagramas são
    # recortados, então uma seta errada ali volta a cada regeração
    for fonte in sorted(SRC.glob("*.plantuml")) + sorted((SRC / "_base").glob("*.plantuml")):
        achados: list[str] = []
        texto = fonte.read_text()
        for numero, linha in enumerate(texto.splitlines(), 1):
            achado = RELACAO.match(linha)
            if not achado:
                continue
            pai, seta, filho = achado.group(1), achado.group(2), achado.group(3)
            if seta not in ("<|--", "<|.."):
                continue
            if filho not in bases:
                continue
            # o filho realmente herda do pai?
            if pai not in bases.get(filho, set()):
                achados.append(f"    linha {numero}: {pai} {seta} {filho} — {filho} não herda de {pai}")
                continue
            # realização (<|..) é de interface para classe; entre interfaces, ou
            # a partir de classe abstrata, a seta é de extensão (<|--)
            pai_tipo = tipos.get(pai, "class")
            filho_tipo = tipos.get(filho, "class")
            esperada = "<|.." if (pai_tipo == "interface" and filho_tipo != "interface") else "<|--"
            if seta != esperada:
                achados.append(
                    f"    linha {numero}: {pai} {seta} {filho} — use {esperada} "
                    f"({pai_tipo} -> {filho_tipo})"
                )

        if achados:
            problemas += len(achados)
            print(f"  {fonte.name}")
            print("\n".join(achados))
            if corrigir:
                linhas = texto.splitlines()
                for achado in achados:
                    numero = int(re.search(r"linha (\d+)", achado).group(1))
                    esperada = re.search(r"use (<\|--|<\|\.\.)", achado)
                    if esperada:
                        linhas[numero - 1] = re.sub(
                            r"(<\|--|<\|\.\.)", esperada.group(1), linhas[numero - 1], count=1
                        )
                fonte.write_text("\n".join(linhas) + "\n")

    print(f"\n{problemas} relação(ões) para corrigir." if problemas else "\nTodas as relações batem com o código.")
    return 0


if __name__ == "__main__":
    import sys

    raise SystemExit(main(corrigir="--corrigir" in sys.argv))
