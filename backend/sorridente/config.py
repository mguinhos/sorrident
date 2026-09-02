"""Configuração da aplicação (12-factor: ambiente com padrões sensatos)."""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent


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
    groq_api_key: str = field(default_factory=lambda: _env("GROQ_CLOUD_API_KEY", ""))
    groq_model: str = field(default_factory=lambda: _env("GROQ_MODEL", "qwen/qwen3.8-27b"))
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
