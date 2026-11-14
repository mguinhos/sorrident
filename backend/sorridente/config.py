"""Configuração da aplicação (12-factor: ambiente com padrões sensatos)."""
from __future__ import annotations

import os
import time
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

# Fuso horário padrão: Recife (America/Recife)
if not os.environ.get("TZ"):
    os.environ["TZ"] = "America/Recife"
time.tzset()


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
    openrouter_api_key: str = field(default_factory=lambda: _env("OPENROUTER_API_KEY", ""))
    openrouter_model: str = field(default_factory=lambda: _env("OPENROUTER_MODEL", "openai/gpt-4o-mini"))
    openrouter_reasoning_effort: str = field(
        default_factory=lambda: _env("OPENROUTER_REASONING_EFFORT", "low")
    )
    openrouter_base_url: str = field(default_factory=lambda: _env("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"))
    # Google Gemini (API compatível com OpenAI)
    gemini_api_key: str = field(default_factory=lambda: _env("GEMINI_API_KEY", ""))
    gemini_model: str = field(default_factory=lambda: _env("GEMINI_MODEL", "gemini-2.0-flash"))
    gemini_reasoning_effort: str = field(default_factory=lambda: _env("GEMINI_REASONING_EFFORT", "off"))
    gemini_base_url: str = field(default_factory=lambda: _env("GEMINI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta/openai/"))
    host: str = field(default_factory=lambda: _env("SORRIDENTE_HOST", "0.0.0.0"))
    port: int = field(default_factory=lambda: _env_int("SORRIDENTE_PORT", 8000))
    cors_origins: tuple[str, ...] = ("http://localhost:3000", "http://127.0.0.1:3000")
    reminder_interval_seconds: int = field(default_factory=lambda: _env_int("SORRIDENTE_REMINDER_INTERVAL", 900))
    reminder_window_hours: int = field(default_factory=lambda: _env_int("SORRIDENTE_REMINDER_WINDOW", 24))
    agent_max_iterations: int = field(default_factory=lambda: _env_int("SORRIDENTE_AGENT_MAX_ITERATIONS", 5))
    inactivity_check_seconds: int = field(default_factory=lambda: _env_int("SORRIDENTE_INACTIVITY_CHECK", 120))
    reindex_seconds: int = field(default_factory=lambda: _env_int("SORRIDENTE_REINDEX_INTERVAL", 1800))
    autostart_telegram: bool = field(default_factory=lambda: _env("SORRIDENTE_AUTOSTART_TELEGRAM", "1") == "1")
    # SMTP para e-mails transacionais (confirmação de agendamento, etc.).
    smtp_host: str = field(default_factory=lambda: _env("SORRIDENTE_SMTP_HOST", ""))
    smtp_port: int = field(default_factory=lambda: _env_int("SORRIDENTE_SMTP_PORT", 587))
    smtp_user: str = field(default_factory=lambda: _env("SORRIDENTE_SMTP_USER", ""))
    smtp_password: str = field(default_factory=lambda: _env("SORRIDENTE_SMTP_PASSWORD", ""))
    smtp_from: str = field(default_factory=lambda: _env("SORRIDENTE_SMTP_FROM", ""))
    smtp_starttls: bool = field(default_factory=lambda: _env("SORRIDENTE_SMTP_STARTTLS", "1") == "1")
    smtp_use_ssl: bool = field(default_factory=lambda: _env("SORRIDENTE_SMTP_SSL", "0") == "1")
    # Google Calendar (bootstrap opcional via ambiente; o painel também configura).
    google_calendar_id: str = field(default_factory=lambda: _env("GOOGLE_CALENDAR_ID", ""))
    google_service_account_json: str = field(
        default_factory=lambda: _env("GOOGLE_SERVICE_ACCOUNT_JSON", "")
    )

    @classmethod
    def from_env(cls) -> "AppConfig":
        return cls()
