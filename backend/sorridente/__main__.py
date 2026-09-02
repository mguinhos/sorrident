"""Execução do servidor: `python -m sorridente`."""
from __future__ import annotations

import uvicorn

from .config import AppConfig


def main() -> None:
    config = AppConfig.from_env()
    uvicorn.run(
        "sorridente.api.app:create_app",
        factory=True,
        host=config.host,
        port=config.port,
        reload=False,
    )


if __name__ == "__main__":
    main()
