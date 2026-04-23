"""CLI for the Octoparse → Google Sheets 法人マスター同期ツール。"""
from __future__ import annotations

import argparse
import json
import logging
import sys
from pathlib import Path

from . import normalizer
from .config import AppConfig, load
from .matcher import MasterIndex
from .merger import build_plan
from .octoparse_client import OctoparseClient
from .sheets_client import SheetsClient

logger = logging.getLogger("job_crawler")


def _build_services(cfg: AppConfig) -> tuple[OctoparseClient, SheetsClient]:
    if not cfg.octoparse_username or not cfg.octoparse_password:
        raise SystemExit("OCTOPARSE_USERNAME / OCTOPARSE_PASSWORD を .env に設定してください")
    if not Path(cfg.google_credentials_path).exists():
        raise SystemExit(
            f"Google サービスアカウント JSON が見つかりません: {cfg.google_credentials_path}"
        )
    oc = OctoparseClient(cfg.octoparse_base_url, cfg.octoparse_username, cfg.octoparse_password)
    sh = SheetsClient(cfg.google_credentials_path)
    return oc, sh


def _load_stub(path: str) -> list[dict]:
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    if not isinstance(data, list):
        raise SystemExit("--stub に指定した JSON は配列でなければなりません")
    return data


def cmd_inspect_sheet(cfg: AppConfig, args: argparse.Namespace) -> int:
    _, sh = _build_services(cfg)
    header = sh.read_header(cfg.sheet.id, cfg.sheet.gid)
    for name, idx in sorted(header.items(), key=lambda kv: kv[1]):
        print(f"{idx:>3}  {name}")
    print(f"\n合計 {len(header)} 列")
    return 0


def cmd_list_tasks(cfg: AppConfig, args: argparse.Namespace) -> int:
    oc, _ = _build_services(cfg)
    tasks = oc.list_tasks()
    for t in tasks:
        print(f"{t.get('taskId')}\t{t.get('taskName')}")
    return 0


def _run_sync_for_site(
    cfg: AppConfig,
    site_name: str,
    args: argparse.Namespace,
    sh: SheetsClient | None,
    oc: OctoparseClient | None,
) -> int:
    site = cfg.site(site_name)
    if args.stub:
        raw_rows = _load_stub(args.stub)
    else:
        if not site.task_id:
            logger.warning("site=%s: task_id 未設定のためスキップ", site_name)
            return 0
        assert oc is not None
        raw_rows = list(oc.fetch_all(site.task_id, limit=args.limit))
    logger.info("site=%s: 取得 %d 件", site_name, len(raw_rows))

    if sh is None:
        # dry-run with --stub but without credentials → read header only if sheet ID available.
        header: dict[str, int] = {}
        master_rows: list[dict[str, str]] = []
    else:
        header, master_rows = sh.read_rows(cfg.sheet.id, cfg.sheet.gid)
        # Ensure meta columns exist so we can write them back.
        header = sh.ensure_columns(cfg.sheet.id, cfg.sheet.gid, list(normalizer.META_COLUMNS))

    crawled = normalizer.apply(site, raw_rows, header)
    index = MasterIndex.build(master_rows)
    plan = build_plan(crawled, master_rows, header, index.find)
    print(f"[{site_name}] {plan.summary()}")

    if args.dry_run:
        for u in plan.updates[:20]:
            col = next((n for n, i in header.items() if i == u.col), "?")
            print(f"  UPDATE row={u.row} col={col!r} value={u.value!r}")
        for row in plan.new_rows[:5]:
            print(f"  APPEND {row}")
        return 0

    if sh is None:
        raise SystemExit("書き込みには Google 認証情報が必要です（--dry-run でテストしてください）")
    if plan.updates:
        sh.update_cells(cfg.sheet.id, cfg.sheet.gid, plan.updates)
    if plan.new_rows:
        sh.append_rows(cfg.sheet.id, cfg.sheet.gid, header, plan.new_rows)
    return 0


def cmd_sync(cfg: AppConfig, args: argparse.Namespace) -> int:
    # dry-run + stub の組み合わせだけは Sheets 認証を求めない。
    need_sh = not (args.dry_run and args.stub)
    need_oc = not args.stub
    oc: OctoparseClient | None = None
    sh: SheetsClient | None = None
    if need_oc or need_sh:
        oc, sh = _build_services(cfg)
    if not need_sh:
        sh = None
    if not need_oc:
        oc = None

    if args.all:
        sites = list(cfg.sites.keys())
    elif args.site:
        sites = [args.site]
    else:
        raise SystemExit("--site <name> もしくは --all を指定してください")

    for name in sites:
        _run_sync_for_site(cfg, name, args, sh, oc)
    return 0


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="job-crawler", description="求人媒体 → 法人マスター同期")
    parser.add_argument("--config", help="config/sites.yaml のパス（デフォルト: config/sites.yaml）")
    parser.add_argument("-v", "--verbose", action="store_true")
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("inspect-sheet", help="マスターシートのヘッダー列を表示")
    sub.add_parser("list-tasks", help="Octoparse のタスク一覧を表示")

    sync = sub.add_parser("sync", help="媒体を取得してマスターシートを更新")
    group = sync.add_mutually_exclusive_group()
    group.add_argument("--site", help="対象媒体名（config/sites.yaml のキー）")
    group.add_argument("--all", action="store_true", help="全媒体を順に処理")
    sync.add_argument("--limit", type=int, default=None, help="媒体ごとの取得件数上限")
    sync.add_argument("--dry-run", action="store_true", help="書き込まず差分サマリだけ出す")
    sync.add_argument("--stub", help="Octoparse を呼ばずに JSON ファイルを生データとして使う（検証用）")
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = _build_parser()
    args = parser.parse_args(argv)
    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    cfg = load(args.config)

    if args.command == "inspect-sheet":
        return cmd_inspect_sheet(cfg, args)
    if args.command == "list-tasks":
        return cmd_list_tasks(cfg, args)
    if args.command == "sync":
        return cmd_sync(cfg, args)
    parser.error(f"unknown command: {args.command}")
    return 2


if __name__ == "__main__":
    sys.exit(main())
