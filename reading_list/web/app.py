from flask import Flask


def create_app() -> Flask:
    app = Flask(__name__)

    @app.template_filter("truncate_headline")
    def truncate_headline(value: str, length: int = 80) -> str:
        """Truncate a headline to the given length with ellipsis."""
        length = int(length)
        if length < 3:
            length = 3
        if len(value) <= length:
            return value
        return value[: length - 3] + "..."

    @app.template_filter("truncate_excerpt")
    def truncate_excerpt(value: str, length: int = 200) -> str:
        """Truncate an excerpt to ~200 characters with ellipsis."""
        if len(value) <= length:
            return value
        return value[: length - 3] + "..."

    @app.template_filter("truncate_url")
    def truncate_url(value: str, length: int = 60) -> str:
        """Truncate a URL for display, preserving the domain."""
        if len(value) <= length:
            return value
        # Try to keep the domain intact
        if "://" in value:
            scheme, rest = value.split("://", 1)
            domain_end = rest.find("/")
            domain = rest[: domain_end if domain_end != -1 else len(rest)]
            if len(scheme + "://" + domain) + 3 <= length:
                return scheme + "://" + domain + "..."
        return value[: length - 3] + "..."

    from reading_list.web.routes import register_routes
    register_routes(app)
    return app
