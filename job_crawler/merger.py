"""Merge crawl rows into master-sheet rows, filling blanks only."""
from __future__ import annotations

from dataclasses import dataclass, field

from .sheets_client import CellUpdate

_ALWAYS_OVERWRITE = {"source_url", "fetched_at"}


def _split_sources(value: str) -> list[str]:
    return [part.strip() for part in value.split(",") if part.strip()]


def merge_source_site(existing: str, new: str) -> str:
    if not new:
        return existing
    combined = _split_sources(existing) + [new]
    seen: list[str] = []
    for name in combined:
        if name not in seen:
            seen.append(name)
    return ", ".join(seen)


@dataclass
class SyncPlan:
    updates: list[CellUpdate] = field(default_factory=list)
    new_rows: list[dict[str, str]] = field(default_factory=list)
    skipped_filled: int = 0
    unchanged: int = 0

    def summary(self) -> str:
        return (
            f"updates={len(self.updates)} "
            f"new_rows={len(self.new_rows)} "
            f"skipped_filled={self.skipped_filled} "
            f"unchanged={self.unchanged}"
        )


def build_plan(
    crawled: list[dict[str, str]],
    master_rows: list[dict[str, str]],
    header: dict[str, int],
    find_row: callable,
) -> SyncPlan:
    plan = SyncPlan()
    master_by_row = {int(r["__row__"]): r for r in master_rows if r.get("__row__")}

    for candidate in crawled:
        sheet_row = find_row(candidate)
        if sheet_row is None:
            plan.new_rows.append(candidate)
            continue
        master = master_by_row.get(sheet_row, {})
        touched = False
        for col_name, new_value in candidate.items():
            if col_name not in header:
                continue
            if not new_value:
                continue
            existing = (master.get(col_name) or "").strip()
            if col_name == "source_site":
                merged = merge_source_site(existing, new_value)
                if merged != existing:
                    plan.updates.append(CellUpdate(row=sheet_row, col=header[col_name], value=merged))
                    touched = True
                continue
            if col_name in _ALWAYS_OVERWRITE:
                if existing != new_value:
                    plan.updates.append(CellUpdate(row=sheet_row, col=header[col_name], value=new_value))
                    touched = True
                continue
            if existing:
                plan.skipped_filled += 1
                continue
            plan.updates.append(CellUpdate(row=sheet_row, col=header[col_name], value=new_value))
            touched = True
        if not touched:
            plan.unchanged += 1
    return plan
