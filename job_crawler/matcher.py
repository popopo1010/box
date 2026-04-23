"""Match normalized crawl rows to existing master-sheet rows."""
from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass

_COMPANY_PREFIXES = ("株式会社", "有限会社", "合同会社", "合資会社", "合名会社", "一般社団法人", "一般財団法人")
_PAREN_ABBR = {
    "(株)": "株式会社",
    "（株）": "株式会社",
    "(有)": "有限会社",
    "（有）": "有限会社",
    "(合)": "合同会社",
    "（合）": "合同会社",
}
_PHONE_RE = re.compile(r"\D+")


def normalize_company(name: str) -> str:
    if not name:
        return ""
    s = unicodedata.normalize("NFKC", str(name)).strip()
    for abbr, full in _PAREN_ABBR.items():
        s = s.replace(abbr, full)
    # Drop the legal-form prefix for matching so 株式会社○○ と ○○ が衝突しない形で揃える。
    # ここでは末尾のスペースや記号だけ落として、後ろにある会社名本体を比較対象にする。
    for prefix in _COMPANY_PREFIXES:
        if s.startswith(prefix):
            s = s[len(prefix):].strip()
            break
        if s.endswith(prefix):
            s = s[: -len(prefix)].strip()
            break
    s = re.sub(r"\s+", "", s)
    return s.casefold()


def normalize_phone(value: str) -> str:
    if not value:
        return ""
    return _PHONE_RE.sub("", unicodedata.normalize("NFKC", str(value)))


def _value(row: dict[str, str], key: str) -> str:
    return (row.get(key) or "").strip()


@dataclass
class MasterIndex:
    by_name: dict[str, int]
    by_name_pref: dict[tuple[str, str], int]
    by_phone: dict[str, int]

    @classmethod
    def build(cls, rows: list[dict[str, str]]) -> "MasterIndex":
        by_name: dict[str, int] = {}
        by_name_pref: dict[tuple[str, str], int] = {}
        by_phone: dict[str, int] = {}
        for row in rows:
            sheet_row = int(row.get("__row__") or 0)
            if not sheet_row:
                continue
            name_key = normalize_company(_value(row, "会社名"))
            if name_key:
                by_name.setdefault(name_key, sheet_row)
                pref = _value(row, "都道府県")
                by_name_pref.setdefault((name_key, pref), sheet_row)
            phone_key = normalize_phone(_value(row, "電話番号"))
            if phone_key:
                by_phone.setdefault(phone_key, sheet_row)
        return cls(by_name=by_name, by_name_pref=by_name_pref, by_phone=by_phone)

    def find(self, candidate: dict[str, str]) -> int | None:
        name_key = normalize_company(candidate.get("会社名", ""))
        if name_key:
            pref = (candidate.get("都道府県") or "").strip()
            if pref and (name_key, pref) in self.by_name_pref:
                return self.by_name_pref[(name_key, pref)]
            if name_key in self.by_name:
                return self.by_name[name_key]
        phone_key = normalize_phone(candidate.get("電話番号", ""))
        if phone_key and phone_key in self.by_phone:
            return self.by_phone[phone_key]
        return None
