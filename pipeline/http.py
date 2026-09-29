"""Cliente HTTP gentil: pausa entre chamadas, retry com backoff e contagem de uso."""

from __future__ import annotations

import time
from typing import Any

import httpx
from tenacity import (
    retry,
    retry_if_exception,
    stop_after_attempt,
    wait_exponential,
)

from pipeline.config import HTTP_TIMEOUT_S, USER_AGENT


def _retryable(exc: BaseException) -> bool:
    if isinstance(exc, httpx.HTTPStatusError):
        return exc.response.status_code == 429 or exc.response.status_code >= 500
    return isinstance(exc, httpx.TransportError)


class PoliteClient:
    def __init__(self, base_url: str, pause_s: float = 0.25, headers: dict[str, str] | None = None):
        self.client = httpx.Client(
            base_url=base_url,
            timeout=HTTP_TIMEOUT_S,
            headers={"User-Agent": USER_AGENT, **(headers or {})},
            follow_redirects=True,
        )
        self.pause_s = pause_s
        self.calls = 0
        self._last = 0.0

    @retry(
        retry=retry_if_exception(_retryable),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=2, min=2, max=20),
        reraise=True,
    )
    def get_json(self, path: str, **params: Any) -> Any:
        wait = self.pause_s - (time.monotonic() - self._last)
        if wait > 0:
            time.sleep(wait)
        self.calls += 1
        try:
            r = self.client.get(path, params=params or None)
        finally:
            self._last = time.monotonic()
        r.raise_for_status()
        return r.json()

    @retry(
        retry=retry_if_exception(_retryable),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=2, min=2, max=20),
        reraise=True,
    )
    def get_bytes(self, url: str) -> bytes:
        wait = self.pause_s - (time.monotonic() - self._last)
        if wait > 0:
            time.sleep(wait)
        self.calls += 1
        try:
            r = self.client.get(url)
        finally:
            self._last = time.monotonic()
        r.raise_for_status()
        return r.content

    def close(self) -> None:
        self.client.close()
