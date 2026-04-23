# box

このリポジトリには以下のツールが入っています。

- [Kindle Screenshot Tool](#kindle-screenshot-tool) — Kindle アプリのスクリーンショット撮影
- [求人媒体 → 法人マスター同期](#求人媒体--法人マスター同期) — Octoparse MCP + Google Sheets API で法人マスターの空欄を埋める

---

## 求人媒体 → 法人マスター同期

求人媒体（リクナビ NEXT / マイナビ転職 / doda / エン転職 / Indeed / 求人ボックス / 施工管理系専門サイト）の公開情報を Octoparse でクローリングし、既存の Google Sheets 法人マスターの **空欄セルだけを埋める** ツール。

```bash
pip install -e .
cp .env.example .env && $EDITOR .env        # Octoparse / Google 認証情報
job-crawler inspect-sheet                   # マスターの列を確認
job-crawler sync --all --dry-run            # 差分サマリだけ表示
job-crawler sync --all                      # マスターに反映
```

詳細は [`docs/job_crawler.md`](docs/job_crawler.md)。Octoparse タスクの整備は `.mcp.json` で登録済みの Octoparse MCP サーバーを Claude Code から対話的に叩く。

---

## Kindle Screenshot Tool

Kindleアプリのスクリーンショットを撮影するPythonツールです。

## 機能

- **本1冊全体の自動キャプチャ** - 最後のページを自動検出して停止
- Kindleウィンドウの自動検出
- 単一ページのスクリーンショット撮影
- 複数ページの連続キャプチャ（自動ページめくり）
- 対話モードでの操作

## インストール

```bash
pip install -e .
```

または依存ライブラリのみをインストール:

```bash
pip install pyautogui pillow imagehash pygetwindow
```

## 使い方

### コマンドラインから実行

```bash
# ヘルプを表示
kindle-screenshot --help

# 本1冊全体を自動でキャプチャ（おすすめ）
kindle-screenshot --auto

# 対話モードで実行
kindle-screenshot -i

# 10ページを連続キャプチャ
kindle-screenshot -n 10

# 単一のスクリーンショットを撮影
kindle-screenshot --single

# 出力先を指定して5ページキャプチャ（3ページ目から開始）
kindle-screenshot -n 5 -s 3 -o ./my_screenshots

# 本を自動キャプチャして保存先を指定
kindle-screenshot --auto -o ./my_book
```

### モジュールとして実行

```bash
python -m kindle_screenshot -i
```

### Pythonコードから使用

```python
from kindle_screenshot import KindleScreenshot

# インスタンスを作成
kindle = KindleScreenshot(
    output_dir="./screenshots",
    delay=0.5,
    prefix="kindle"
)

# 本1冊全体を自動キャプチャ（おすすめ）
kindle.capture_entire_book()

# 単一のスクリーンショットを撮影
kindle.take_screenshot()

# 10ページを連続キャプチャ
kindle.capture_multiple_pages(num_pages=10)

# 対話モードで実行
kindle.interactive_capture()
```

## オプション

| オプション | 短縮形 | 説明 | デフォルト |
|------------|--------|------|------------|
| `--auto` | - | 本1冊全体を自動キャプチャ | - |
| `--output` | `-o` | 保存先ディレクトリ | `./screenshots` |
| `--num-pages` | `-n` | 連続キャプチャするページ数 | - |
| `--start-page` | `-s` | 開始ページ番号 | `1` |
| `--delay` | `-d` | ページめくり後の待機時間（秒） | `0.5` |
| `--prefix` | `-p` | ファイル名のプレフィックス | `kindle` |
| `--interactive` | `-i` | 対話モードで実行 | - |
| `--single` | - | 単一のスクリーンショットを撮影 | - |
| `--max-pages` | - | 自動キャプチャ時の最大ページ数 | `10000` |

## 対話モードのコマンド

| コマンド | 説明 |
|----------|------|
| `s` | スクリーンショットを撮影 |
| `n` | 次のページに移動 |
| `p` | 前のページに移動 |
| `c` | 連続キャプチャ（ページ数を入力） |
| `q` | 終了 |

## 動作環境

- Python 3.9以上
- Windows / macOS / Linux

## 注意事項

- Kindleアプリが起動している必要があります
- 連続キャプチャ時は、Kindleアプリをアクティブにしてください
- スクリーンショットの撮影には、画面キャプチャの権限が必要な場合があります（特にmacOS）

## ライセンス

MIT License
