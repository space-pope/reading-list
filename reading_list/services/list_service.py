from __future__ import annotations

import sqlite3
from reading_list.db.database import get_connection
from reading_list.models.entry import Entry, entry_from_row, entry_to_dict, now_iso


class EntryService:
    def get_entries(self, page: int = 1, per_page: int = 50, tag: str | None = None, search: str | None = None) -> tuple[list[Entry], int]:
        conn = get_connection()
        try:
            if tag:
                query = """
                    SELECT e.* FROM entries e
                    INNER JOIN entry_tags et ON e.id = et.entry_id
                    INNER JOIN tags t ON et.tag_id = t.id
                    WHERE t.name = ?
                    ORDER BY e.created_at DESC
                    LIMIT ? OFFSET ?
                """
                count_query = """
                    SELECT COUNT(DISTINCT e.id) FROM entries e
                    INNER JOIN entry_tags et ON e.id = et.entry_id
                    INNER JOIN tags t ON et.tag_id = t.id
                    WHERE t.name = ?
                """
                count_cursor = conn.execute(count_query, (tag,))
                total = count_cursor.fetchone()[0]
                cursor = conn.execute(query, (tag, per_page, (page - 1) * per_page))
            elif search:
                query = """
                    SELECT e.* FROM entries e
                    INNER JOIN entries_fts fts ON e.id = fts.rowid
                    WHERE entries_fts MATCH ?
                    ORDER BY rank
                    LIMIT ? OFFSET ?
                """
                count_query = """
                    SELECT COUNT(*) FROM entries_fts WHERE entries_fts MATCH ?
                """
                total_cursor = conn.execute(count_query, (search,))
                total = total_cursor.fetchone()[0]
                cursor = conn.execute(query, (search, per_page, (page - 1) * per_page))
            else:
                query = "SELECT * FROM entries ORDER BY created_at DESC LIMIT ? OFFSET ?"
                count_query = "SELECT COUNT(*) FROM entries"
                count_cursor = conn.execute(count_query)
                total = count_cursor.fetchone()[0]
                cursor = conn.execute(query, (per_page, (page - 1) * per_page))

            rows = cursor.fetchall()
            entries = []
            for row in rows:
                entry = entry_from_row(row)
                entry.tags = self._get_tags(entry.id)
                entries.append(entry)
            return entries, total
        finally:
            conn.close()

    def get_entry(self, entry_id: int) -> Entry | None:
        conn = get_connection()
        try:
            conn.execute("SELECT * FROM entries WHERE id = ?", (entry_id,))
            row = conn.fetchone()
            if row:
                entry = entry_from_row(row)
                entry.tags = self._get_tags(entry.id)
                return entry
            return None
        finally:
            conn.close()

    def create_entry(self, entry: Entry) -> Entry:
        conn = get_connection()
        try:
            conn.execute(
                """INSERT INTO entries (url, title, excerpt, read, source_type, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (
                    entry.url,
                    entry.title,
                    entry.excerpt,
                    int(entry.read),
                    entry.source_type,
                    now_iso(),
                    now_iso(),
                ),
            )
            conn.commit()
            entry.id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
            return entry
        except sqlite3.IntegrityError:
            raise ValueError("Entry with this URL already exists")
        finally:
            conn.close()

    def update_entry(self, entry_id: int, **kwargs) -> Entry:
        conn = get_connection()
        try:
            fields = []
            values = []
            if "title" in kwargs:
                fields.append("title = ?")
                values.append(kwargs["title"])
            if "excerpt" in kwargs:
                fields.append("excerpt = ?")
                values.append(kwargs["excerpt"])
            if "read" in kwargs:
                fields.append("read = ?")
                values.append(int(kwargs["read"]))
            fields.append("updated_at = ?")
            values.append(now_iso())
            values.append(entry_id)

            query = f"UPDATE entries SET {', '.join(fields)} WHERE id = ?"
            conn.execute(query, values)
            conn.commit()
            return self.get_entry(entry_id)
        finally:
            conn.close()

    def delete_entry(self, entry_id: int) -> bool:
        conn = get_connection()
        try:
            cursor = conn.execute("DELETE FROM entries WHERE id = ?", (entry_id,))
            conn.commit()
            return cursor.rowcount > 0
        finally:
            conn.close()

    def add_tag(self, entry_id: int, tag_name: str) -> None:
        conn = get_connection()
        try:
            cursor = conn.execute("SELECT id FROM tags WHERE name = ?", (tag_name,))
            tag_row = cursor.fetchone()
            if tag_row:
                tag_id = tag_row[0]
            else:
                conn.execute("INSERT INTO tags (name) VALUES (?)", (tag_name,))
                tag_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
                conn.commit()

            conn.execute(
                "INSERT OR IGNORE INTO entry_tags (entry_id, tag_id) VALUES (?, ?)",
                (entry_id, tag_id),
            )
            conn.commit()
        finally:
            conn.close()

    def remove_tag(self, entry_id: int, tag_name: str) -> None:
        conn = get_connection()
        try:
            cursor = conn.execute("SELECT id FROM tags WHERE name = ?", (tag_name,))
            tag_row = cursor.fetchone()
            if tag_row:
                conn.execute(
                    "DELETE FROM entry_tags WHERE entry_id = ? AND tag_id = ?",
                    (entry_id, tag_row[0]),
                )
                conn.commit()
        finally:
            conn.close()

    def get_all_tags(self) -> list[dict]:
        conn = get_connection()
        try:
            cursor = conn.execute("SELECT id, name FROM tags ORDER BY name")
            return [{"id": row[0], "name": row[1]} for row in cursor.fetchall()]
        finally:
            conn.close()

    def get_stats(self) -> dict:
        conn = get_connection()
        try:
            stats = {}
            stats["total"] = conn.execute("SELECT COUNT(*) FROM entries").fetchone()[0]
            stats["unread"] = conn.execute("SELECT COUNT(*) FROM entries WHERE read = 0").fetchone()[0]
            tags = conn.execute("SELECT COUNT(DISTINCT name) FROM tags").fetchone()[0]
            stats["tags"] = tags
            oldest = conn.execute("SELECT MIN(created_at) FROM entries").fetchone()[0]
            newest = conn.execute("SELECT MAX(created_at) FROM entries").fetchone()[0]
            stats["oldest"] = oldest
            stats["newest"] = newest
            return stats
        finally:
            conn.close()

    def _get_tags(self, entry_id: int) -> list[str]:
        conn = get_connection()
        try:
            cursor = conn.execute(
                """SELECT t.name FROM tags t
                   INNER JOIN entry_tags et ON t.id = et.tag_id
                   WHERE et.entry_id = ?
                   ORDER BY t.name""",
                (entry_id,),
            )
            return [row[0] for row in cursor.fetchall()]
        finally:
            conn.close()
