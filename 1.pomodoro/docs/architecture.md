# ポモドーロタイマー アーキテクチャ

## 現在の実装状態

現時点では、`1.pomodoro/app.py` のみが存在し、スタブ状態（コメントのみ）です。

```
1.pomodoro/
├── app.py          # スタブ（未実装）
└── pomodoro.png    # UIモック画像
```

## 設計方針

設計ドキュメント（`architecture.md`）に基づく予定アーキテクチャを以下に示します。

### 層構成

| 層 | 場所 | 役割 |
|---|---|---|
| Flask層（サーバ） | `app.py` | ページ配信・静的ファイル配信・API提供 |
| UI層（ブラウザ） | `static/js/` | 画面描画・ユーザー入力処理 |
| Application層 | `static/js/` | イベント処理・状態更新のオーケストレーション |
| Domain層 | `static/js/domain/` | 状態遷移・残り時間計算（純粋関数） |
| Ports/Adapters層 | `static/js/ports/`, `static/js/adapters/` | 外部依存の抽象化と実装 |

### 依存関係

```
UI Controller
    └── Application Service
            ├── Domain（純粋関数）
            └── Ports
                    └── Adapters（Browser: Date.now, localStorage, setInterval）
```

### Flask（app.py）エンドポイント（予定）

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/` | メイン画面を返す |
| GET | `/health` | ヘルスチェック |
| GET | `/api/settings` | 設定取得（将来拡張） |
| POST | `/api/settings` | 設定保存（将来拡張） |
| POST | `/api/sessions` | セッション履歴保存（将来拡張） |
| GET | `/api/stats/daily` | 日次統計取得（将来拡張） |

## タイマー進行ロジック方針

時間の進行は「終了予定時刻（endAt）」基準で計算します。

- 開始時: `endAt = now + remainingSec * 1000`
- 表示時: `remainingSec = max(0, ceil((endAt - now) / 1000))`

この方式により、タブ非アクティブ復帰時や描画遅延が発生しても正確な残り時間を表示できます。

## Domain 状態遷移（予定）

- 状態: `idle / running / paused / onBreak / finished`
- イベント: `start / pause / resume / reset / tick / complete`
- ルール例:
  - `start` は `idle` または `paused` からのみ有効
  - `tick` は `running` でのみ有効
  - `remainingSec` は 0 未満にしない
