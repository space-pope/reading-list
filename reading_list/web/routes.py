from __future__ import annotations

from flask import Flask, render_template, request, jsonify, redirect, url_for
from reading_list.services.list_service import EntryService
from reading_list.services.fetch_service import FetchService
from reading_list.models.entry import Entry, entry_to_dict


entry_service = EntryService()
fetch_service = FetchService()


def register_routes(app: Flask) -> None:
    @app.route("/")
    def index():
        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 50, type=int)
        tag = request.args.get("tag")
        search = request.args.get("q") or request.args.get("search")

        entries, total = entry_service.get_entries(
            page=page,
            per_page=per_page,
            tag=tag,
            search=search,
        )

        tags = entry_service.get_all_tags()
        total_pages = (total + per_page - 1) // per_page

        # Read truncation preference from query string or default
        truncation_length = request.args.get("truncation", 80, type=int)
        truncation_length = max(20, min(500, truncation_length))

        return render_template(
            "index.html",
            entries=entries,
            tags=tags,
            current_page=page,
            total_pages=total_pages,
            current_tag=tag,
            search_query=search,
            truncation_length=truncation_length,
        )

    @app.route("/add")
    def add_form():
        return render_template("add.html")

    @app.route("/fetch", methods=["POST"])
    def fetch():
        url = request.form.get("url") or request.json.get("url")
        if not url:
            return jsonify({"error": "url is required"}), 400

        try:
            result = fetch_service.fetch_and_extract(url)
            return jsonify(result)
        except ValueError as e:
            return jsonify({"error": str(e)}), 400
        except RuntimeError as e:
            return jsonify({"error": str(e)}), 502

    @app.route("/entries", methods=["POST"])
    def create_entry():
        data = request.form.to_dict() or request.get_json(silent=True) or {}
        url = data.get("url")
        title = data.get("title")
        excerpt = data.get("excerpt") or ""

        if not url or not title:
            return jsonify({"error": "url and title are required"}), 400

        entry = Entry(url=url, title=title, excerpt=excerpt)
        errors = entry.validate()
        if errors:
            return jsonify({"error": "Validation failed", "details": errors}), 400

        try:
            created = entry_service.create_entry(entry)
            return jsonify(entry_to_dict(created)), 201
        except ValueError as e:
            return jsonify({"error": str(e)}), 409

    @app.route("/entries/<int:entry_id>", methods=["PATCH"])
    def update_entry(entry_id: int):
        existing = entry_service.get_entry(entry_id)
        if not existing:
            return jsonify({"error": "Entry not found"}), 404

        data = request.form.to_dict() or request.get_json(silent=True) or {}

        updates = {}
        if "title" in data:
            updates["title"] = data["title"]
        if "excerpt" in data:
            updates["excerpt"] = data["excerpt"]
        if "read" in data:
            updates["read"] = data["read"].lower() in ("true", "1", "yes")

        updated = entry_service.update_entry(entry_id, **updates)
        return jsonify(entry_to_dict(updated))

    @app.route("/entries/<int:entry_id>", methods=["DELETE"])
    def delete_entry(entry_id: int):
        deleted = entry_service.delete_entry(entry_id)
        if deleted:
            return jsonify({"message": "Entry deleted", "id": entry_id})
        return jsonify({"error": "Entry not found"}), 404

    @app.route("/tags")
    def list_tags():
        tags = entry_service.get_all_tags()
        return jsonify(tags)

    @app.route("/tags", methods=["POST"])
    def create_tag():
        data = request.form.to_dict() or request.get_json(silent=True) or {}
        name = data.get("name")
        if not name:
            return jsonify({"error": "name is required"}), 400
        # Tags are created on demand via add_tag, so just return a placeholder
        return jsonify({"id": None, "name": name}), 201

    @app.route("/stats")
    def stats():
        stats = entry_service.get_stats()
        return jsonify(stats)
