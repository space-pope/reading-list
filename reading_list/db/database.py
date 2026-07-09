from __future__ import annotations

import sqlite3
import os
from contextlib import contextmanager
from pathlib import Path

from reading_list.config import get_config


def get_connection(db_path: str | None = None) -> sqlite3.Connection:
    path = db_path or get_config().db_path
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(path))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


@contextmanager
def get_db():
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def check_and_create_db():
    path = Path(get_config().db_path)
    if not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
