# フロントエンド モジュール仕様

## 現在の実装状態

現時点では、フロントエンドファイル（`static/js/`、`static/css/`、`templates/`）は未実装です。

以下は設計ドキュメントに基づく予定仕様です。

---

## ディレクトリ構成（予定）

````text
1.pomodoro/
├── templates/
│   └── index.html          # メインHTMLテンプレート
└── static/
    ├── css/
    │   └── main.css         # スタイルシート
    └── js/
        ├── app.js           # エントリーポイント
        ├── ui-controller.js # UI制御
        ├── application-service.js # Application層
        ├── domain/
        │   ├── timer-state.js      # タイマー状態定義
        │   ├── timer-reducer.js    # 状態遷移reducer
        │   ├── time-calculator.js  # 時間計算
        │   └── stats-aggregator.js # 進捗集計
        ├── ports/
        │   ├── clock-port.js       # 時刻取得インターフェース
        │   ├── storage-port.js     # ストレージインターフェース
        │   └── scheduler-port.js   # スケジューラインターフェース
        └── adapters/
            ├── browser-clock.js         # Date.now()実装
            ├── local-storage-adapter.js  # localStorageアダプター
            ├── in-memory-storage-adapter.js # テスト用インメモリストレージ
            └── interval-scheduler.js     # setInterval実装
````

---

## モジュール詳細

### app.js

エントリーポイント。各モジュールを初期化し、Application Serviceに接続します。

---

### ui-controller.js

UIイベント（ボタンクリック等）を受け取り、Application Serviceに伝達します。

**主な責務**

- ボタンクリックイベントの処理
- `viewModel` を受け取り DOM を更新
- 状態に応じたボタンラベル切替（開始 → 一時停止 → 再開）

---

### application-service.js

Domain関数とPortsを組み合わせてイベントを処理します。

**主な責務**

- 入力イベントを受けて `timer-reducer` を実行
- `clock.now()` で現在時刻取得
- `storage.save()` で状態/進捗を保存
- `ui.present(viewModel)` を呼ぶ

---

### domain/timer-reducer.js

タイマーの状態遷移を処理する純粋関数です。

**状態**

| 状態 | 説明 |
|---|---|
| `idle` | 初期状態・停止状態 |
| `running` | カウントダウン中 |
| `paused` | 一時停止中 |
| `onBreak` | 休憩中 |
| `finished` | セッション完了 |

**イベント**

| イベント | 有効な状態 | 説明 |
|---|---|---|
| `start` | `idle`, `paused` | タイマー開始 |
| `pause` | `running` | 一時停止 |
| `resume` | `paused` | 再開 |
| `reset` | 全状態 | リセット |
| `tick` | `running` | 残り時間更新 |
| `complete` | `running` | セッション完了 |

---

### domain/time-calculator.js

時間計算を行う純粋関数です。

**`endAt` 基準の計算方式**

- 開始時: `endAt = now + remainingSec * 1000`
- 表示時: `remainingSec = max(0, ceil((endAt - now) / 1000))`

---

### ports/

| ファイル | インターフェース |
|---|---|
| `clock-port.js` | `now(): number` — 現在時刻（Unix ms）を返す |
| `storage-port.js` | `load(key): any`, `save(key, value): void` |
| `scheduler-port.js` | `start(callback): void`, `stop(): void` |

---

### adapters/

| ファイル | 説明 |
|---|---|
| `browser-clock.js` | `Date.now()` を使用した Clock実装 |
| `local-storage-adapter.js` | `localStorage` を使用した Storage実装 |
| `in-memory-storage-adapter.js` | テスト用インメモリStorage実装 |
| `interval-scheduler.js` | `setInterval / clearInterval` を使用したScheduler実装 |

---

## UI コンポーネント

### 円形プログレスバー

SVGベースの実装を予定しています。

- `stroke-dasharray` / `stroke-dashoffset` を使用
- セッション開始時の総秒数に対する残り秒数の割合で進捗を表示

### ボタン状態管理

| タイマー状態 | ボタン表示 |
|---|---|
| `idle` | 「開始」ボタン（有効） |
| `running` | 「一時停止」ボタン（有効） |
| `paused` | 「再開」ボタン（有効） |
| `onBreak` | 「スキップ」ボタン |
| `finished` | 「次へ」ボタン |

### 今日の進捗表示

日付キーで集計された進捗を表示します。

- 完了ポモドーロ数
- 累計集中時間（分）
- 日付変更時に自動リセット

---

## 文言定数

UIに表示するテキストは定数として分離し、将来の多言語対応（i18n）を容易にする設計です。
