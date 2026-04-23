"""Google Sheets API wrapper: read headers/rows, batch-update blank cells, append new rows."""
from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Iterable

from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

logger = logging.getLogger(__name__)

_SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]
_UPDATE_CHUNK = 500


def _col_letter(index: int) -> str:
    """0-indexed column number → A1 letter (0→A, 25→Z, 26→AA)."""
    s = ""
    n = index
    while True:
        n, r = divmod(n, 26)
        s = chr(ord("A") + r) + s
        if n == 0:
            break
        n -= 1
    return s


@dataclass
class CellUpdate:
    row: int  # 1-indexed, matches Sheets A1 notation
    col: int  # 0-indexed column
    value: str


class SheetsClient:
    def __init__(self, credentials_path: str) -> None:
        creds = service_account.Credentials.from_service_account_file(
            credentials_path, scopes=_SCOPES
        )
        self._service = build("sheets", "v4", credentials=creds, cache_discovery=False)
        self._sheet_title_cache: dict[tuple[str, int], str] = {}

    def _resolve_sheet_title(self, sheet_id: str, gid: int) -> str:
        key = (sheet_id, gid)
        if key in self._sheet_title_cache:
            return self._sheet_title_cache[key]
        meta = self._service.spreadsheets().get(spreadsheetId=sheet_id).execute()
        for s in meta.get("sheets", []):
            props = s.get("properties", {})
            if int(props.get("sheetId", -1)) == int(gid):
                title = props["title"]
                self._sheet_title_cache[key] = title
                return title
        raise KeyError(f"sheet with gid={gid} not found in spreadsheet {sheet_id}")

    @retry(
        reraise=True,
        retry=retry_if_exception_type(HttpError),
        stop=stop_after_attempt(5),
        wait=wait_exponential(multiplier=2, min=2, max=30),
    )
    def _values_get(self, sheet_id: str, rng: str) -> list[list[str]]:
        resp = (
            self._service.spreadsheets()
            .values()
            .get(spreadsheetId=sheet_id, range=rng, valueRenderOption="UNFORMATTED_VALUE")
            .execute()
        )
        return resp.get("values", [])

    def read_header(self, sheet_id: str, gid: int) -> dict[str, int]:
        title = self._resolve_sheet_title(sheet_id, gid)
        rows = self._values_get(sheet_id, f"{title}!1:1")
        if not rows:
            return {}
        return {str(name): idx for idx, name in enumerate(rows[0]) if str(name)}

    def read_rows(self, sheet_id: str, gid: int) -> tuple[dict[str, int], list[dict[str, str]]]:
        """Return (header_index, list of row dicts). Row dicts are keyed by header name.

        The row dict also includes the synthetic key ``__row__`` with the 1-indexed sheet row number.
        """
        title = self._resolve_sheet_title(sheet_id, gid)
        data = self._values_get(sheet_id, title)
        if not data:
            return {}, []
        header = {str(name): idx for idx, name in enumerate(data[0]) if str(name)}
        rows: list[dict[str, str]] = []
        for row_idx, raw in enumerate(data[1:], start=2):
            row: dict[str, str] = {"__row__": str(row_idx)}
            for col_name, col_idx in header.items():
                row[col_name] = str(raw[col_idx]) if col_idx < len(raw) and raw[col_idx] is not None else ""
            rows.append(row)
        return header, rows

    @retry(
        reraise=True,
        retry=retry_if_exception_type(HttpError),
        stop=stop_after_attempt(5),
        wait=wait_exponential(multiplier=2, min=2, max=30),
    )
    def _batch_update_values(self, sheet_id: str, data: list[dict]) -> None:
        self._service.spreadsheets().values().batchUpdate(
            spreadsheetId=sheet_id,
            body={"valueInputOption": "USER_ENTERED", "data": data},
        ).execute()

    def update_cells(self, sheet_id: str, gid: int, updates: Iterable[CellUpdate]) -> int:
        title = self._resolve_sheet_title(sheet_id, gid)
        batch: list[CellUpdate] = list(updates)
        total = 0
        for i in range(0, len(batch), _UPDATE_CHUNK):
            chunk = batch[i : i + _UPDATE_CHUNK]
            payload = [
                {
                    "range": f"{title}!{_col_letter(u.col)}{u.row}",
                    "values": [[u.value]],
                }
                for u in chunk
            ]
            self._batch_update_values(sheet_id, payload)
            total += len(chunk)
        return total

    @retry(
        reraise=True,
        retry=retry_if_exception_type(HttpError),
        stop=stop_after_attempt(5),
        wait=wait_exponential(multiplier=2, min=2, max=30),
    )
    def append_rows(self, sheet_id: str, gid: int, header: dict[str, int], rows: list[dict[str, str]]) -> int:
        if not rows:
            return 0
        title = self._resolve_sheet_title(sheet_id, gid)
        width = max(header.values()) + 1 if header else 0
        values: list[list[str]] = []
        for row in rows:
            line = [""] * width
            for name, idx in header.items():
                v = row.get(name, "")
                if v is not None:
                    line[idx] = str(v)
            values.append(line)
        self._service.spreadsheets().values().append(
            spreadsheetId=sheet_id,
            range=title,
            valueInputOption="USER_ENTERED",
            insertDataOption="INSERT_ROWS",
            body={"values": values},
        ).execute()
        return len(values)

    def ensure_columns(self, sheet_id: str, gid: int, names: list[str]) -> dict[str, int]:
        """Add missing header columns at the end of row 1. Return the updated header map."""
        header = self.read_header(sheet_id, gid)
        missing = [n for n in names if n not in header]
        if not missing:
            return header
        title = self._resolve_sheet_title(sheet_id, gid)
        start_col = max(header.values()) + 1 if header else 0
        end_col = start_col + len(missing) - 1
        rng = f"{title}!{_col_letter(start_col)}1:{_col_letter(end_col)}1"
        self._service.spreadsheets().values().update(
            spreadsheetId=sheet_id,
            range=rng,
            valueInputOption="USER_ENTERED",
            body={"values": [missing]},
        ).execute()
        for i, name in enumerate(missing):
            header[name] = start_col + i
        return header
