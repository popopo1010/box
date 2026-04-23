"""Thin wrapper around the Octoparse Open API.

Docs: http://dataapi.octoparse.com/DataApi/en-US/
"""
from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from typing import Iterator

import requests
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

logger = logging.getLogger(__name__)

# Stay below the documented 20 req/sec ceiling.
_MIN_INTERVAL_SEC = 0.06


class OctoparseError(RuntimeError):
    pass


@dataclass
class _Token:
    access_token: str
    refresh_token: str
    expires_at: float


class OctoparseClient:
    def __init__(self, base_url: str, username: str, password: str, session: requests.Session | None = None) -> None:
        self.base_url = base_url.rstrip("/")
        self.username = username
        self.password = password
        self._session = session or requests.Session()
        self._token: _Token | None = None
        self._last_call = 0.0

    def _throttle(self) -> None:
        elapsed = time.monotonic() - self._last_call
        if elapsed < _MIN_INTERVAL_SEC:
            time.sleep(_MIN_INTERVAL_SEC - elapsed)
        self._last_call = time.monotonic()

    @retry(
        reraise=True,
        retry=retry_if_exception_type(requests.RequestException),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=8),
    )
    def _post_token(self, payload: dict[str, str]) -> dict:
        self._throttle()
        resp = self._session.post(
            f"{self.base_url}/token",
            data=payload,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=30,
        )
        resp.raise_for_status()
        return resp.json()

    def get_token(self) -> str:
        if self._token and self._token.expires_at > time.time() + 30:
            return self._token.access_token
        data = self._post_token(
            {
                "username": self.username,
                "password": self.password,
                "grant_type": "password",
            }
        )
        self._token = _Token(
            access_token=data["access_token"],
            refresh_token=data.get("refresh_token", ""),
            expires_at=time.time() + int(data.get("expires_in", 3600)),
        )
        return self._token.access_token

    def _auth_headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self.get_token()}"}

    @retry(
        reraise=True,
        retry=retry_if_exception_type(requests.RequestException),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=8),
    )
    def _get(self, path: str, params: dict | None = None) -> dict:
        self._throttle()
        resp = self._session.get(
            f"{self.base_url}{path}",
            params=params,
            headers=self._auth_headers(),
            timeout=60,
        )
        resp.raise_for_status()
        body = resp.json()
        if body.get("error") and body["error"] != "success":
            raise OctoparseError(f"{body.get('error')}: {body.get('error_Description')}")
        return body

    def list_tasks(self) -> list[dict]:
        body = self._get("/api/task")
        return body.get("data") or []

    def start_task(self, task_id: str) -> dict:
        self._throttle()
        resp = self._session.post(
            f"{self.base_url}/api/cloudextraction/start",
            params={"taskId": task_id},
            headers=self._auth_headers(),
            timeout=30,
        )
        resp.raise_for_status()
        return resp.json()

    def fetch_all(self, task_id: str, batch: int = 1000, limit: int | None = None) -> Iterator[dict]:
        """Yield every row from a task using the offset-based endpoint."""
        offset = 0
        yielded = 0
        while True:
            body = self._get(
                "/api/alldata/GetDataOfTaskByOffset",
                params={"taskId": task_id, "offset": offset, "size": batch},
            )
            payload = body.get("data") or {}
            rows: list[dict] = payload.get("dataList") or []
            if not rows:
                return
            for row in rows:
                yield row
                yielded += 1
                if limit is not None and yielded >= limit:
                    return
            offset = payload.get("offset", offset + len(rows))
            if len(rows) < batch:
                return

    def fetch_not_exported(self, task_id: str, size: int = 1000) -> list[dict]:
        body = self._get(
            "/api/notexportdata/gettop",
            params={"taskId": task_id, "size": size},
        )
        payload = body.get("data") or {}
        return payload.get("dataList") or []
