# CLAUDE.md

このファイルは、このリポジトリで作業するClaude Code（claude.ai/code）へのガイダンスを提供します。

@AGENTS.md

## コマンド

```bash
npm run dev            # 開発サーバー起動（Next.js 16）
npm run build          # プロダクションビルド
npm run lint           # ESLintチェック
npm run test           # 全テスト実行（Vitest）
npm run test:watch     # ウォッチモード
npm run test:coverage  # カバレッジ付き実行（全指標80%以上が必須）
npm run setup:richmenu # LINE Rich MenuをAPIで登録（.env.localを読み込む）
```

単一テストファイルの実行:
```bash
npx vitest run tests/webhook.test.ts
```

## アーキテクチャ

LINE上で職場改善課題を記録・管理するチャットボット。Vercelにデプロイ済み。

**リクエストフロー:**
1. LINEが `/api/webhook` にPOSTを送信
2. `src/app/api/webhook/route.ts` がHMAC-SHA256署名を検証し、即座に `200 OK` を返す。処理本体は `waitUntil`（Vercelのバックグラウンド実行）で非同期に継続
3. メッセージイベント → Notionの `createIssue` または `listIssues`；ポストバックイベント → register/list/delete の各フロー
4. `src/services/line-reply.ts` がLINEのReply APIへ返信を送信

**主要モジュール:**
- `src/app/api/webhook/route.ts` — エントリーポイント。署名検証とイベントディスパッチ
- `src/services/notion.ts` — Notion API呼び出し（課題の作成・一覧・削除）。一覧は `databases.query` ではなく `dataSources.query` を使用（ソート対応のため）
- `src/services/line-reply.ts` — LINE Reply API呼び出し。全返信に `MENU_QUICK_REPLY` ボタンを付与
- `src/lib/flex-message.ts` — 削除選択UI用のFlex Messageカルーセルを構築
- `src/lib/formatter.ts` — 課題一覧をプレーンテキストにフォーマット
- `src/lib/rich-menu.ts` — LINE Rich Menuの初回セットアップ（課題登録・削除・一覧の3セクション）
- `src/lib/create-png.ts` — SVGから `sharp` でRich Menu用PNGを生成
- `src/lib/verify-signature.ts` — Web Crypto APIを使ったHMAC-SHA256検証

**ポストバックアクション**（`postback.data` にURLSearchParams形式でエンコード）:
- `action=register` → 課題タイトルの入力を促す
- `action=list` → 課題一覧を表示
- `action=show_delete_list` → 削除用Flex Messageカルーセルを表示
- `action=delete&issueId=<pageId>` → 論理削除（ステータスを `削除済み` に変更）

**Notionスキーマ**（プロパティ名は日本語）:
- `課題タイトル`（title）、`ステータス`（select: Raw/整理済み/対応中/完了/削除済み）、`通番`（unique_id）、`記録日時`（date）
- 削除は論理削除（ステータス → `削除済み`）。`listIssues` でフィルタリングして除外

## 環境変数

ローカル開発時は `.env.local` に設定:
```
LINE_CHANNEL_SECRET=
LINE_CHANNEL_ACCESS_TOKEN=
NOTION_TOKEN=
NOTION_DATABASE_ID=
NOTION_DATA_SOURCE_ID=
```

`NOTION_DATA_SOURCE_ID` は `NOTION_DATABASE_ID` とは別物。ソート付きクエリに使う `dataSources.query` API向けのID。

## テスト

テストは `tests/` に配置し、Vitestを使用。`@` パスエイリアスは `src/` に解決される。外部依存（Notion・LINE・`@vercel/functions`）はすべて `vi.mock` でモック化。`waitUntil` がハンドラー返却後に非同期処理を実行するため、返信系の副作用は `vi.waitFor` で検証する。
