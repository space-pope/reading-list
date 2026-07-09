from __future__ import annotations

import httpx
from typing import Optional


class HttpClient:
    def __init__(self, timeout: float = 30.0, max_redirects: int = 5):
        self.timeout = timeout
        self.max_redirects = max_redirects

    def fetch(self, url: str, timeout: float | None = None) -> httpx.Response:
        t = timeout or self.timeout
        try:
            response = httpx.get(url, timeout=t, follow_redirects=True)
            response.raise_for_status()
            return response
        except httpx.TimeoutException:
            raise RuntimeError(f"Request timed out after {t}s")
        except httpx.HTTPError as e:
            raise RuntimeError(f"HTTP error: {e}")
