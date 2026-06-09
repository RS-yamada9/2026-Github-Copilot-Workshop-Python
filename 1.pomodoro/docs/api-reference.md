# REST API リファレンス

## 現在の実装状態

現時点では `app.py` はスタブ状態であり、APIエンドポイントは未実装です。

## 予定エンドポイント

以下は設計ドキュメント（`architecture.md`）に基づく予定のAPIです。

---

### GET /

メイン画面（HTML）を返します。

**レスポンス**

- `200 OK`: `index.html` を返す

---

### GET /health

ヘルスチェックエンドポイント。

**レスポンス**

- `200 OK`

---

### GET /api/settings *(将来拡張)*

設定値を取得します。

**レスポンス例**

````json
{
  "workMinutes": 25,
  "shortBreakMinutes": 5,
  "longBreakMinutes": 15,
  "longBreakEvery": 4
}
````

---

### POST /api/settings *(将来拡張)*

設定値を保存します。

**リクエストボディ**

````json
{
  "workMinutes": 25,
  "shortBreakMinutes": 5,
  "longBreakMinutes": 15,
  "longBreakEvery": 4
}
````

**レスポンス**

- `200 OK`: 保存成功

---

### POST /api/sessions *(将来拡張)*

セッション履歴を保存します。

**リクエストボディ**

````json
{
  "startedAt": "2026-06-09T10:00:00Z",
  "endedAt": "2026-06-09T10:25:00Z",
  "type": "work",
  "durationSec": 1500,
  "completed": true
}
````

**レスポンス**

- `201 Created`: 保存成功

---

### GET /api/stats/daily *(将来拡張)*

日次統計を取得します。

**クエリパラメータ**

| パラメータ | 型 | 説明 |
|---|---|---|
| `date` | string | 対象日（`YYYY-MM-DD` 形式） |

**レスポンス例**

````json
{
  "date": "2026-06-09",
  "completedCount": 4,
  "focusMinutes": 100
}
````

---

## MVPの設定保存（localStorage）

MVP段階では、設定と進捗は `localStorage` に保存されます。

| キー | 内容 |
|---|---|
| `pomodoro.settings` | 設定値（workMinutes等） |
| `pomodoro.timerState` | タイマー状態 |
| `pomodoro.dailyStats.YYYY-MM-DD` | 日次進捗 |
