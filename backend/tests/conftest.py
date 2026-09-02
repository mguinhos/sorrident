"""Fixtures da suíte de testes: container isolado por teste."""
from __future__ import annotations

import sys
from pathlib import Path
from typing import AsyncIterator

import pytest
import pytest_asyncio

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sorridente.config import AppConfig  # noqa: E402
from sorridente.container import ApplicationContainer  # noqa: E402


@pytest_asyncio.fixture
async def container(tmp_path: Path) -> AsyncIterator[ApplicationContainer]:
    config = AppConfig(
        database_path=tmp_path / "db.json",
        credentials_path=tmp_path / "credentials.json",
        groq_api_key="",
        autostart_telegram=False,
    )
    app_container = ApplicationContainer(config)
    await app_container.startup()
    try:
        yield app_container
    finally:
        await app_container.shutdown()
