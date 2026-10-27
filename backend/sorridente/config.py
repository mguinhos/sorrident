"""Configuração da aplicação (12-factor: ambiente com padrões sensatos)."""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent


def _load_dotenv(path: Path | None = None) -> None:
    """Carrega variáveis de um arquivo `.env` sem sobrescrever o ambiente.

    Variáveis já definidas no processo têm prioridade (12-factor). O parser
    suporta comentários, o prefixo `export` e valores entre aspas.
    """
    env_file = path or (BASE_DIR / ".env")
    if not env_file.is_file():
        return
    for raw_line in env_file.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[7:].lstrip()
        key, sep, value = line.partition("=")
        if not sep:
            continue
        key = key.strip()
        value = value.strip()
        if not key:
            continue
        if len(value) >= 2 and value[0] == value[-1] and value[0] in ("'", '"'):
            value = value[1:-1]
        os.environ.setdefault(key, value)


_load_dotenv()


def _env(name: str, default: str) -> str:
    return os.environ.get(name, default)


def _env_int(name: str, default: int) -> int:
    try:
        return int(os.environ.get(name, default))
    except ValueError:
        return default


@dataclass(frozen=True)
class AppConfig:
    """Configuração imutável carregada uma única vez no bootstrap."""

    database_path: Path = field(default_factory=lambda: Path(_env("SORRIDENTE_DB", str(BASE_DIR / "data" / "sorridente.json"))))
    credentials_path: Path = field(default_factory=lambda: Path(_env("SORRIDENTE_CREDENTIALS", str(BASE_DIR / "credentials.json"))))
    opencode_go_api_key: str = field(default_factory=lambda: _env("OPENCODE_GO_API_KEY", ""))
    opencode_go_model: str = field(default_factory=lambda: _env("OPENCODE_GO_MODEL", "kimi-k2.5"))
    host: str = field(default_factory=lambda: _env("SORRIDENTE_HOST", "0.0.0.0"))
    port: int = field(default_factory=lambda: _env_int("SORRIDENTE_PORT", 8000))
    cors_origins: tuple[str, ...] = ("http://localhost:3000", "http://127.0.0.1:3000")
    reminder_interval_seconds: int = field(default_factory=lambda: _env_int("SORRIDENTE_REMINDER_INTERVAL", 900))
    reminder_window_hours: int = field(default_factory=lambda: _env_int("SORRIDENTE_REMINDER_WINDOW", 24))
    agent_max_iterations: int = field(default_factory=lambda: _env_int("SORRIDENTE_AGENT_MAX_ITERATIONS", 6))
    inactivity_check_seconds: int = field(default_factory=lambda: _env_int("SORRIDENTE_INACTIVITY_CHECK", 120))
    reindex_seconds: int = field(default_factory=lambda: _env_int("SORRIDENTE_REINDEX_INTERVAL", 1800))
    autostart_telegram: bool = field(default_factory=lambda: _env("SORRIDENTE_AUTOSTART_TELEGRAM", "1") == "1")

    @classmethod
    def from_env(cls) -> "AppConfig":
        return cls()
