"""Normalização e tokenização de texto em português."""
from __future__ import annotations

import re
import unicodedata
from typing import Iterable

STOPWORDS: frozenset[str] = frozenset(
    """
    a as o os um uma uns umas de do da dos das em no na nos nas por para com sem sob
    sobre entre ate até e ou mas que quem qual quais quando onde como porque pois se
    ja já nao não sim eu tu ele ela nos nós vos eles elas meu minha meus minhas seu
    sua seus suas dele dela isso isto aquilo esse essa este esta aquele aquela ser
    estar tem ter há ha foi era sao são vai vou pode posso quero queria gostaria
    fazer faz muito mais menos tudo todo toda todos todas la lá aqui ai aí bem
    """.split()
)

_TOKEN_RE = re.compile(r"[a-z0-9]+")

# Sufixos removidos na radicalização, do mais longo para o mais curto.
_SUFFIXES: tuple[str, ...] = (
    "zinhos", "zinhas", "issimo", "issima", "amento", "imento", "amentos", "imentos",
    "acoes", "icoes", "encia", "ancia", "eiros", "eiras", "aria", "acao", "icao",
    "ista", "ismo", "agem", "avel", "ivel", "mente", "inho", "inha", "inhos", "inhas",
    "eiro", "eira", "ando", "endo", "indo", "aram", "eram", "iram", "aria", "eria",
    "iria", "amos", "emos", "imos", "ados", "adas", "idos", "idas", "ado", "ada",
    "ido", "ida", "ava", "iam", "ar", "er", "ir", "es", "as", "os", "s",
)

_MIN_STEM = 4


def stem(token: str) -> str:
    """Radicalização leve para português (heurística no espírito do RSLP).

    Aproxima formas da mesma família — "remarcar"/"remarcações",
    "estacionar"/"estacionamento" — sem depender de biblioteca externa.
    """
    for suffix in _SUFFIXES:
        if token.endswith(suffix) and len(token) - len(suffix) >= _MIN_STEM:
            token = token[: -len(suffix)]
            break
    # Vogal temática final: aproxima "estaciona" de "estacion".
    if len(token) > _MIN_STEM and token[-1] in "aeo":
        token = token[:-1]
    return token


def strip_accents(text: str) -> str:
    """Remove acentos preservando as letras (São → sao)."""
    normalized = unicodedata.normalize("NFKD", text)
    return "".join(ch for ch in normalized if not unicodedata.combining(ch))


def normalize(text: str) -> str:
    return strip_accents((text or "").lower())


def tokenize(
    text: str,
    remove_stopwords: bool = True,
    min_length: int = 2,
    apply_stemming: bool = True,
) -> list[str]:
    """Quebra o texto em termos comparáveis: sem acento, sem palavra vazia e radicalizados."""
    tokens = _TOKEN_RE.findall(normalize(text))
    if remove_stopwords:
        tokens = [t for t in tokens if t not in STOPWORDS]
    tokens = [t for t in tokens if len(t) >= min_length]
    return [stem(t) for t in tokens] if apply_stemming else tokens


def split_paragraphs(text: str) -> list[str]:
    return [block.strip() for block in re.split(r"\n\s*\n", text or "") if block.strip()]


def split_sentences(text: str) -> list[str]:
    return [s.strip() for s in re.split(r"(?<=[.!?])\s+", text or "") if s.strip()]


def join_non_empty(parts: Iterable[str], separator: str = " ") -> str:
    return separator.join(p for p in parts if p)
