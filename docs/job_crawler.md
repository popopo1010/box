# 求人媒体 → 法人マスター 同期ツール

既存の Google Sheets 法人マスターに対して、求人媒体（リクナビ NEXT / マイナビ転職 / doda / エン転職 / Indeed / 求人ボックス / 施工管理系専門サイト）で公開されている情報を Octoparse 経由でクローリングし、**空欄セルだけを埋める**バッチ同期ツール。

## 前提

- Octoparse のアカウント（Cloud プラン以上）
- Google Cloud のサービスアカウント（Sheets API 有効化 + 対象シートに編集者権限を付与）
- Python 3.9+

## 初期セットアップ

```bash
# 依存インストール
pip install -e .

# 環境変数
cp .env.example .env
$EDITOR .env
#   OCTOPARSE_USERNAME / OCTOPARSE_PASSWORD
#   GOOGLE_APPLICATION_CREDENTIALS=./credentials.json

# サービスアカウント JSON を配置
mv ~/Downloads/*-credentials.json ./credentials.json
```

Google Sheets のマスターは `./credentials.json` のサービスアカウントメール宛てに編集者権限を付与しておくこと。

## MCP（対話用）

`.mcp.json` に以下を登録済み。Claude Code 起動時に初回だけ OAuth ブラウザ認可が走る。

| サーバー | 用途 |
|----------|------|
| `octoparse` (`https://mcp.octoparse.com`) | テンプレート検索・タスク作成・試験実行 |
| `google-sheets` (`https://mcp.composio.dev/google_sheets`) | ヘッダー確認、小規模書き込みデバッグ |

## ワークフロー

### 1. Octoparse 側にタスクを用意する（MCP 経由、媒体ごとに 1 回）

Claude Code セッションで例えば以下のように指示する：

> リクナビ NEXT のテンプレートを octoparse MCP で検索して、「施工管理」キーワードで東京都・10 件だけ試験実行して。完了したら taskId を教えて。

返ってきた taskId を `config/sites.yaml` の該当 `task_id:` に書き写す。専門サイト（施工の窓口 / 建職バンク / 俺の夢 等）はテンプレートが無いので Octoparse の Auto-Detect でカスタムタスクを作ってもらう。

### 2. マスターシートのヘッダー確認

```bash
job-crawler inspect-sheet
```

Octoparse 側のフィールド名と `config/sites.yaml` の `field_map` が一致しているか、右辺（マスター側の列名）が実在するかを確認する。存在しない列は自動で末尾に追加される（`source_site`, `source_url`, `fetched_at`）。

### 3. 同期（dry-run → 本番）

```bash
# 単一媒体を試す
job-crawler sync --site rikunabi_next --dry-run --limit 100

# 全媒体を順に処理
job-crawler sync --all --dry-run

# 本番反映
job-crawler sync --all
```

出力例：

```
[rikunabi_next] updates=138 new_rows=42 skipped_filled=219 unchanged=11
```

- `updates`: マスターの空セルを埋めた件数
- `new_rows`: マスターに無かった法人として末尾追加する件数
- `skipped_filled`: 既に値があったため触らなかったセル数
- `unchanged`: 既存行に新しい情報が無かった件数

### 4. 動作ロジック（要約）

1. `sheets_client.read_rows` でマスター全行を取得。
2. `octoparse_client.fetch_all` で媒体の最新データを Open API から取得（20 req/sec 未満にスロットリング）。
3. `normalizer.apply` で媒体の生カラム → マスターのヘッダー名へリマップ。
4. `matcher.MasterIndex` で会社名（株式会社/(株) 等を吸収した正規化後）→ 都道府県 → 電話番号の順で既存行とマッチング。
5. ヒット行は `merger.build_plan` で **空セルのみ** 更新 key のセットを作る。`source_site` 列は「リクナビNEXT, doda」のようにマージ追記。`source_url` / `fetched_at` は常に最新で上書き。
6. 未ヒットは append バッファに送る。
7. `sheets_client.update_cells`（500 セル単位の batchUpdate）＋ `append_rows` で Sheets に反映。

## 法務・利用規約メモ

- **Octoparse の公式テンプレート利用を前提**にする。独自に媒体 HTML を解析するカスタムタスクは、対象媒体の利用規約と robots.txt を必ず確認する。
- 取得したデータは社内リード生成用途のみ。**外部への再配布は行わない**。
- アクセス頻度は Octoparse 側で Low / Medium、Open API 側は 20 req/sec 未満（実装上 ~17 req/sec）。

## スタブ検証（Octoparse / Google 認証抜きで merge ロジックだけテスト）

`--stub` に JSON 配列を渡すと、Octoparse を呼ばずに与えた生データを normalizer に流せる。`--dry-run` と組み合わせれば Google 認証も不要。

```bash
job-crawler sync --site rikunabi_next --stub ./tests/rikunabi_fixture.json --dry-run
```

## スコープ外

- 定期実行（cron / GitHub Actions）
- 法人番号 API による corporate number 付与
- 既存セルの上書きモード
- 媒体のカスタム Octoparse タスクをコードから作成（MCP 対話 or Octoparse UI で行う）
