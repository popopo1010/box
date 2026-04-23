"""Convert Octoparse raw rows to master-sheet column names."""
from __future__ import annotations

from datetime import datetime, timezone

from .config import SiteConfig

META_COLUMNS = ("source_site", "source_url", "fetched_at")


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def apply(site: SiteConfig, raw_rows: list[dict], header: dict[str, int]) -> list[dict[str, str]]:
    """Return rows keyed by master-sheet header names.

    Any source column not declared in ``site.field_map`` is dropped.
    Values targeting columns that do not exist in ``header`` are still retained so callers can
    create the columns via :meth:`SheetsClient.ensure_columns`.
    """
    fetched = _now_iso()
    out: list[dict[str, str]] = []
    for raw in raw_rows:
        mapped: dict[str, str] = {}
        for src_col, dest_col in site.field_map.items():
            if src_col not in raw:
                continue
            val = raw[src_col]
            if val is None:
                continue
            mapped[dest_col] = str(val).strip()
        if not mapped:
            continue
        mapped.setdefault("source_site", site.display_name)
        url_candidates = [
            raw.get(k)
            for k in ("求人URL", "URL", "job_url", "url")
            if raw.get(k)
        ]
        if url_candidates:
            mapped["source_url"] = str(url_candidates[0]).strip()
        mapped["fetched_at"] = fetched
        out.append(mapped)
    return out
