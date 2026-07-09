from __future__ import annotations

import typer
from reading_list.services.list_service import EntryService
from reading_list.services.fetch_service import FetchService

app = typer.Typer(name="reading-list")
entry_service = EntryService()
fetch_service = FetchService()


@app.command()
def list(
    page: int = typer.Option(1, "--page", help="Page number"),
    per_page: int = typer.Option(50, "--per-page", help="Entries per page"),
    tag: str | None = typer.Option(None, "--tag", help="Filter by tag"),
    search: str | None = typer.Option(None, "--search", help="Search query"),
    json_output: bool = typer.Option(False, "--json", help="Output as JSON"),
):
    """List entries with optional filtering and pagination."""
    entries, total = entry_service.get_entries(
        page=page, per_page=per_page, tag=tag, search=search
    )

    if json_output:
        import json
        from reading_list.models.entry import entry_to_dict
        print(json.dumps([entry_to_dict(e) for e in entries], indent=2))
    else:
        if not entries:
            print("No entries found.")
            return

        for entry in entries:
            status = "read" if entry.read else "unread"
            tags = ", ".join(entry.tags) if entry.tags else ""
            print(f"[{entry.id}] {entry.url}")
            print(f'    "{entry.title}" — {entry.excerpt[:100]}{"..." if len(entry.excerpt) > 100 else ""}')
            if tags:
                print(f"    tags: {tags}")
            print(f"    status: {status}")
            print()


@app.command()
def add(
    url: str = typer.Argument(..., help="URL to add"),
    title: str | None = typer.Option(None, "--title", help="Title"),
    excerpt: str | None = typer.Option(None, "--excerpt", help="Excerpt"),
    fetch: bool = typer.Option(False, "--fetch", help="Fetch headline/excerpt from URL"),
):
    """Add an entry to the reading list."""
    if fetch:
        try:
            result = fetch_service.fetch_and_extract(url)
            title = title or result["title"] or ""
            excerpt = excerpt or result["excerpt"] or ""
        except Exception as e:
            typer.echo(f"Error fetching: {e}", err=True)
            raise typer.Exit(code=1)

    if fetch and title:
        # With --fetch, only title is required (excerpt is optional)
        pass
    elif not title or not excerpt:
        typer.echo("Error: --title and --excerpt are required (or use --fetch)", err=True)
        raise typer.Exit(code=1)

    from reading_list.models.entry import Entry
    entry = Entry(url=url, title=title or "", excerpt=excerpt or "")
    try:
        created = entry_service.create_entry(entry)
        typer.echo(f"Added entry {created.id}: {created.url}")
    except ValueError as e:
        typer.echo(f"Error: {e}", err=True)
        raise typer.Exit(code=1)


@app.command()
def delete(entry_id: int = typer.Argument(..., help="Entry ID to delete")):
    """Delete an entry from the reading list."""
    confirm = typer.prompt(f"Delete entry {entry_id}? [y/N]")
    if confirm.lower() not in ("y", "yes"):
        typer.echo("Cancelled.")
        return

    deleted = entry_service.delete_entry(entry_id)
    if deleted:
        typer.echo(f"Deleted entry {entry_id}.")
    else:
        typer.echo(f"Entry {entry_id} not found.", err=True)
        raise typer.Exit(code=1)


@app.command()
def tag(
    entry_id: int = typer.Argument(..., help="Entry ID"),
    name: str = typer.Argument(..., help="Tag name"),
):
    """Add a tag to an entry."""
    entry = entry_service.get_entry(entry_id)
    if not entry:
        typer.echo(f"Entry {entry_id} not found.", err=True)
        raise typer.Exit(code=1)

    entry_service.add_tag(entry_id, name)
    typer.echo(f"Added tag '{name}' to entry {entry_id}.")


@app.command()
def untag(
    entry_id: int = typer.Argument(..., help="Entry ID"),
    name: str = typer.Argument(..., help="Tag name"),
):
    """Remove a tag from an entry."""
    entry_service.remove_tag(entry_id, name)
    typer.echo(f"Removed tag '{name}' from entry {entry_id}.")


@app.command()
def read(entry_id: int = typer.Argument(..., help="Entry ID")):
    """Mark an entry as read."""
    entry = entry_service.get_entry(entry_id)
    if not entry:
        typer.echo(f"Entry {entry_id} not found.", err=True)
        raise typer.Exit(code=1)

    entry_service.update_entry(entry_id, read=True)
    typer.echo(f"Marked entry {entry_id} as read.")


@app.command()
def unread(entry_id: int = typer.Argument(..., help="Entry ID")):
    """Mark an entry as unread."""
    entry = entry_service.get_entry(entry_id)
    if not entry:
        typer.echo(f"Entry {entry_id} not found.", err=True)
        raise typer.Exit(code=1)

    entry_service.update_entry(entry_id, read=False)
    typer.echo(f"Marked entry {entry_id} as unread.")


@app.command()
def tags():
    """List all tags."""
    tag_list = entry_service.get_all_tags()
    if not tag_list:
        typer.echo("No tags found.")
        return

    for tag in tag_list:
        typer.echo(f"- {tag['name']}")


@app.command()
def stats():
    """Show reading list statistics."""
    s = entry_service.get_stats()
    typer.echo(f"Total entries: {s['total']}")
    typer.echo(f"Unread: {s['unread']}")
    typer.echo(f"Tags: {s['tags']}")
    if s["oldest"]:
        typer.echo(f"Oldest entry: {s['oldest'][:10]}")
    if s["newest"]:
        typer.echo(f"Newest entry: {s['newest'][:10]}")


if __name__ == "__main__":
    app()
