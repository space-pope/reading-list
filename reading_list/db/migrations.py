import sqlite3
from pathlib import Path
from reading_list.db.database import get_connection


MIGRATIONS_DIR = Path(__file__).parent / "migrations"


def run_migrations(conn: sqlite3.Connection) -> None:
    cursor = conn.cursor()
    try:
        cursor.execute("CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY)")
        conn.commit()
    except sqlite3.OperationalError:
        pass

    cursor.execute("SELECT COALESCE(MAX(version), 0) FROM schema_version")
    current_version = cursor.fetchone()[0]

    migration_files = sorted(MIGRATIONS_DIR.glob("*.sql"))
    for f in migration_files:
        version = int(f.stem.split("_")[0].lstrip("V"))
        if version > current_version:
            sql = f.read_text()
            try:
                conn.executescript(sql)
                cursor.execute("INSERT INTO schema_version (version) VALUES (?)", (version,))
                conn.commit()
            except sqlite3.OperationalError:
                pass
