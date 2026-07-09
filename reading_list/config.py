import os
from dataclasses import dataclass
from pathlib import Path


@dataclass
class Config:
    db_path: str
    port: int
    host: str = "127.0.0.1"


def get_config() -> Config:
    db_path = os.environ.get("READING_LIST_DB_PATH", str(Path.home() / ".reading-list" / "db.sqlite"))
    port = int(os.environ.get("READING_LIST_PORT", "3000"))
    host = os.environ.get("READING_LIST_HOST", "127.0.0.1")
    return Config(db_path=db_path, port=port, host=host)
