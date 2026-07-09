from __future__ import annotations

from reading_list.config import get_config
from reading_list.db.database import get_connection, check_and_create_db
from reading_list.db.migrations import run_migrations
from reading_list.web.app import create_app


def main():
    config = get_config()
    check_and_create_db()

    conn = get_connection()
    try:
        run_migrations(conn)
    finally:
        conn.close()

    app = create_app()
    app.run(host=config.host, port=config.port, debug=False)


if __name__ == "__main__":
    main()
