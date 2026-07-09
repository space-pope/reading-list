from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class Entry:
    id: int | None = None
    url: str = ""
    title: str = ""
    excerpt: str = ""
    read: bool = False
    source_type: str = "generic"
    created_at: str = ""
    updated_at: str = ""
    tags: list[str] = field(default_factory=list)

    def validate(self) -> list[str]:
        errors = []
        if not self.url:
            errors.append("url is required")
        elif not self._valid_url(self.url):
            errors.append("url must be a valid URL with scheme (http:// or https://)")
        if not self.title:
            errors.append("title is required")
        elif len(self.title) > 500:
            errors.append("title must be 500 characters or less")
        if self.excerpt and len(self.excerpt) > 2000:
            errors.append("excerpt must be 2000 characters or less")
        if self.source_type not in ("generic",):
            errors.append(f"source_type must be 'generic' or a registered scraper name, got '{self.source_type}'")
        return errors

    @staticmethod
    def _valid_url(url: str) -> bool:
        return url.startswith("http://") or url.startswith("https://")


def entry_from_row(row) -> Entry:
    return Entry(
        id=row["id"],
        url=row["url"],
        title=row["title"],
        excerpt=row["excerpt"],
        read=bool(row["read"]),
        source_type=row["source_type"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def entry_to_dict(entry: Entry) -> dict:
    return {
        "id": entry.id,
        "url": entry.url,
        "title": entry.title,
        "excerpt": entry.excerpt,
        "read": entry.read,
        "source_type": entry.source_type,
        "created_at": entry.created_at,
        "updated_at": entry.updated_at,
        "tags": entry.tags,
    }


def now_iso() -> str:
    return datetime.now().isoformat()
