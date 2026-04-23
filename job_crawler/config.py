"""Load YAML config and .env for the job crawler."""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml
from dotenv import load_dotenv


@dataclass
class SheetConfig:
    id: str
    gid: int
    key_columns: list[str] = field(default_factory=lambda: ["会社名"])
    match_columns: list[str] = field(default_factory=list)
    max_jobs_per_company: int = 3


@dataclass
class SiteConfig:
    name: str
    task_id: str
    display_name: str
    field_map: dict[str, str]
    template: str | None = None


@dataclass
class AppConfig:
    sheet: SheetConfig
    sites: dict[str, SiteConfig]
    octoparse_base_url: str
    octoparse_username: str
    octoparse_password: str
    google_credentials_path: str

    def site(self, name: str) -> SiteConfig:
        if name not in self.sites:
            raise KeyError(f"unknown site: {name}")
        return self.sites[name]


def _default_config_path() -> Path:
    env = os.getenv("JOB_CRAWLER_CONFIG")
    if env:
        return Path(env)
    return Path(__file__).resolve().parent.parent / "config" / "sites.yaml"


def load(config_path: Path | str | None = None) -> AppConfig:
    load_dotenv()
    path = Path(config_path) if config_path else _default_config_path()
    raw: dict[str, Any] = yaml.safe_load(path.read_text(encoding="utf-8")) or {}

    sheet_raw = raw.get("sheet") or {}
    sheet_id = os.getenv("JOB_CRAWLER_SHEET_ID") or sheet_raw.get("id", "")
    sheet = SheetConfig(
        id=sheet_id,
        gid=int(sheet_raw.get("gid", 0)),
        key_columns=sheet_raw.get("key_columns") or ["会社名"],
        match_columns=sheet_raw.get("match_columns") or [],
        max_jobs_per_company=int(sheet_raw.get("max_jobs_per_company", 3)),
    )

    sites: dict[str, SiteConfig] = {}
    for name, s in (raw.get("sites") or {}).items():
        field_map = s.get("field_map") or {}
        if not isinstance(field_map, dict):
            field_map = {}
        sites[name] = SiteConfig(
            name=name,
            task_id=str(s.get("task_id") or ""),
            display_name=s.get("display_name") or name,
            template=s.get("template"),
            field_map={str(k): str(v) for k, v in field_map.items()},
        )

    return AppConfig(
        sheet=sheet,
        sites=sites,
        octoparse_base_url=os.getenv("OCTOPARSE_BASE_URL", "https://openapi.octoparse.com"),
        octoparse_username=os.getenv("OCTOPARSE_USERNAME", ""),
        octoparse_password=os.getenv("OCTOPARSE_PASSWORD", ""),
        google_credentials_path=os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "./credentials.json"),
    )
