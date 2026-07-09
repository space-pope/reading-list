import re
from typing import TypedDict


class ExtractResult(TypedDict):
    headline: str
    excerpt: str


class GenericExtractor:
    def extract(self, html: str) -> ExtractResult:
        try:
            import trafilatura
            result = trafilatura.extract(
                html,
                with_metadata=True,
                include_comments=False,
                include_links=False,
            )

            headline = ""
            excerpt = ""

            if result:
                if isinstance(result, str):
                    headline = result[:500]
                elif hasattr(result, 'title') and isinstance(getattr(result, 'title', ''), str) and result.title:
                    headline = result.title[:500]
                if hasattr(result, 'description') and isinstance(getattr(result, 'description', ''), str) and result.description:
                    excerpt = result.description[:2000]

            if headline or excerpt:
                return {
                    "headline": headline,
                    "excerpt": excerpt,
                }
        except Exception:
            pass

        headline = self._extract_title_tag(html)
        if headline:
            return {"headline": headline, "excerpt": ""}

        return {"headline": "Untitled", "excerpt": ""}

    @staticmethod
    def _extract_title_tag(html: str) -> str:
        match = re.search(r'<title[^>]*>(.*?)</title>', html, re.IGNORECASE | re.DOTALL)
        if match:
            title = match.group(1).strip()
            if title and title != "Untitled":
                return title
        return ""
