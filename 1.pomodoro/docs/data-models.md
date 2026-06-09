# データモデル仕様

## 現在の実装状態

現時点では、データモデルは未実装です（`app.py` はスタブ状態）。

以下は設計ドキュメントに基づく予定仕様です。

---

## MVP（localStorage）

### 設定（Settings）

キー: `pomodoro.settings`

| フィールド | 型 | 説明 | デフォルト |
|---|---|---|---|
| `workMinutes` | number | 作業時間（分） | 25 |
| `shortBreakMinutes` | number | 短休憩時間（分） | 5 |
| `longBreakMinutes` | number | 長休憩時間（分） | 15 |
| `longBreakEvery` | number | 何回ごとに長休憩か | 4 |

**例**

````json
{
  "workMinutes": 25,
  "shortBreakMinutes": 5,
  "longBreakMinutes": 15,
  "longBreakEvery": 4
}
````

---

### タイマー状態（TimerState）

キー: `pomodoro.timerState`

| フィールド | 型 | 説明 |
|---|---|---|
| `status` | string | `idle` / `running` / `paused` / `onBreak` / `finished` |
| `remainingSec` | number | 残り秒数 |
| `endAt` | number \| null | 終了予定時刻（Unix ms）、停止中は `null` |
| `sessionType` | string | `work` / `shortBreak` / `longBreak` |
| `completedCount` | number | 本日の完了ポモドーロ数 |

**例**

````json
{
  "status": "running",
  "remainingSec": 1200,
  "endAt": 1749466800000,
  "sessionType": "work",
  "completedCount": 2
}
````

---

### 日次進捗（DailyStats）

キー: `pomodoro.dailyStats.YYYY-MM-DD`（例: `pomodoro.dailyStats.2026-06-09`）

| フィールド | 型 | 説明 |
|---|---|---|
| `completedCount` | number | 完了したポモドーロ数 |
| `focusMinutes` | number | 累計集中時間（分） |

**例**

````json
{
  "completedCount": 4,
  "focusMinutes": 100
}
````

---

## 将来拡張（SQLite）

### settings テーブル

| カラム | 型 | 説明 |
|---|---|---|
| `id` | INTEGER PRIMARY KEY | 自動採番 |
| `work_min` | INTEGER | 作業時間（分） |
| `short_break_min` | INTEGER | 短休憩時間（分） |
| `long_break_min` | INTEGER | 長休憩時間（分） |
| `long_break_every` | INTEGER | 長休憩間隔（回） |
| `updated_at` | DATETIME | 更新日時 |

---

### sessions テーブル

| カラム | 型 | 説明 |
|---|---|---|
| `id` | INTEGER PRIMARY KEY | 自動採番 |
| `started_at` | DATETIME | 開始日時 |
| `ended_at` | DATETIME | 終了日時 |
| `type` | TEXT | `work` / `shortBreak` / `longBreak` |
| `duration_sec` | INTEGER | 実際の継続秒数 |
| `completed` | BOOLEAN | 完了フラグ |
