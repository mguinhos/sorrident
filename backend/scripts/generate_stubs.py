#!/usr/bin/env python3
"""Regenera os stubs .pyi dos módulos de contrato.

Os stubs têm prioridade sobre o .py na checagem de tipos: se ficarem defasados,
o mypy passa a validar contra uma API que não existe mais. Rode este script
depois de mudar qualquer contrato:

    ../.venv/bin/python scripts/generate_stubs.py
"""
from __future__ import annotations

import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent
PACKAGE = BACKEND / "sorridente"

#: Módulos cujo contrato público é consumido por outras camadas.
CONTRACT_MODULES: tuple[str, ...] = (
    "core/interfaces.py",
    "core/models.py",
    "domain/services/interfaces.py",
    "integrations/base.py",
    "integrations/inference.py",
    "integrations/registry.py",
    "agent/base.py",
    "agent/models.py",
    "agent/task.py",
    "agent/context.py",
    "channels/base.py",
    "channels/manager.py",
    "rag/interfaces.py",
    "rag/documents.py",
    "rag/chunking.py",
    "rag/embedding.py",
    "rag/store.py",
    "rag/retriever.py",
    "export/interfaces.py",
    "export/exporters.py",
    "scheduler.py",
)

#: Ajustes que o stubgen não infere sozinho.
FIXES: tuple[tuple[str, str], ...] = (
    ("field(default_factory=Incomplete)", "..."),
    ("DEFAULT_SUPPORTS: Incomplete", "DEFAULT_SUPPORTS: Supports"),
    # `stream` é um async generator, não uma corrotina.
    (
        "    async def stream(self, messages: Sequence[dict[str, Any]], temperature: float = 0.3,"
        " max_tokens: int = 1024) -> AsyncIterator[str]: ...",
        "    def stream(self, messages: Sequence[dict[str, Any]], temperature: float = 0.3,"
        " max_tokens: int = 1024) -> AsyncIterator[str]: ...",
    ),
    ("class BaseRetriever(IRetriever, ABC):", "class BaseRetriever(IRetriever, ABC, metaclass=abc.ABCMeta):"),
    ("class BaseExporter(IConversationExporter, ABC):", "class BaseExporter(IConversationExporter, ABC, metaclass=abc.ABCMeta):"),
)

STR_ATTRIBUTES = (
    "conversation_id", "channel", "external_id", "patient_id", "display_name", "text",
)


def polish(text: str, module: str) -> str:
    for old, new in FIXES:
        text = text.replace(old, new)
    text = re.sub(rf"^(    (?:{'|'.join(STR_ATTRIBUTES)}): )Incomplete$", r"\1str", text, flags=re.M)
    if "metaclass=abc.ABCMeta" in text and "import abc" not in text:
        text = text.replace("from abc import ABC", "import abc\nfrom abc import ABC", 1)
    if "Incomplete" not in text.replace("from _typeshed import Incomplete", ""):
        text = text.replace("from _typeshed import Incomplete\n", "")
    return f'"""Stub de tipos: contrato público de sorridente.{module}."""\n' + text


def main() -> int:
    with tempfile.TemporaryDirectory() as tmp:
        stubgen = Path(sys.executable).with_name("stubgen")
        command = [
            str(stubgen) if stubgen.exists() else "stubgen",
            "-q", "--include-private", "-o", tmp,
            *[str(PACKAGE / module) for module in CONTRACT_MODULES],
        ]
        result = subprocess.run(command, capture_output=True, text=True)
        if result.returncode != 0:
            print(result.stdout or result.stderr, file=sys.stderr)
            return result.returncode

        generated = Path(tmp) / "sorridente"
        for stub in sorted(generated.rglob("*.pyi")):
            relative = stub.relative_to(generated)
            module = relative.as_posix().removesuffix(".pyi").replace("/", ".")
            (PACKAGE / relative).write_text(polish(stub.read_text(), module), encoding="utf-8")
            print("stub:", relative.as_posix())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
