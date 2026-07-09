from __future__ import annotations

import time
import httpx
from typing import TypedDict, Any


class FetchResult(TypedDict):
    url: str
    title: str
    excerpt: str
    fetch_time_ms: int


class FetchService:
    def __init__(self, extractor=None):
        self.extractor = extractor

    def fetch_and_extract(self, url: str, timeout: float = 30.0) -> FetchResult:
        if not self._valid_url(url):
            raise ValueError("Invalid URL: must start with http:// or https://")

        start = time.time()
        try:
            response = httpx.get(url, timeout=timeout, follow_redirects=True)
            response.raise_for_status()
        except httpx.TimeoutException:
            raise RuntimeError(f"Request timed out after {timeout}s")
        except httpx.HTTPError as e:
            raise RuntimeError(f"Failed to fetch URL: {e}")

        fetch_time = int((time.time() - start) * 1000)

        if not self.extractor:
            from reading_list.fetcher.extractor import GenericExtractor
            self.extractor = GenericExtractor()

        result = self.extractor.extract(response.text)
        fetch_result: FetchResult = {
            "url": url,
            "title": result["headline"],
            "excerpt": result["excerpt"],
            "fetch_time_ms": fetch_time,
        }

        return fetch_result

    @staticmethod
    def _valid_url(url: str) -> bool:
        return url.startswith("http://") or url.startswith("https://")
