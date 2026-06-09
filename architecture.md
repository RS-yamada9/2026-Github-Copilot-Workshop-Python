# Pomodoro Timer Webアプリケーション アーキテクチャ案

## 1. 目的

本ドキュメントは、Flask + HTML/CSS/JavaScript で実装するポモドーロタイマーWebアプリのアーキテクチャ方針を定義する。

主な目的は以下の3点。

- UIモックに沿った体験をシンプルに実装できること
- 将来の機能追加（設定保存、履歴、分析）に耐えること
- ユニットテストしやすい構造であること

---

## 2. 設計原則

- 責務分離: UI、アプリケーション制御、ドメインロジック、インフラ（時刻・保存・スケジューラ）を分離する
- 単方向依存: UI -> Application -> Domain/Ports -> Adapters
- テスト容易性優先: ドメインは純粋関数化し、副作用はAdapterに閉じ込める
- 段階的拡張: MVPはローカル完結、必要に応じてFlask API + SQLiteへ拡張

---

## 3. 全体アーキテクチャ

### 3.1 層構成

1. Flask層（サーバ）
- 役割: ページ配信、静的ファイル配信、将来API提供
- タイマー進行自体は担当しない

2. UI層（ブラウザ）
- 役割: 画面描画、ユーザー入力処理、viewModel表示
- ドメインロジックを直接持たない

3. Application層
- 役割: イベント処理、状態更新のオーケストレーション
- Domain関数とPortsを組み合わせて動かす

4. Domain層
- 役割: 状態遷移、残り時間計算、進捗集計
- 純粋関数のみ（副作用なし）

5. Ports/Adapters層
- 役割: 外部依存の抽象化と実装
- Clock、Storage、Schedulerなどをインターフェース化

### 3.2 依存関係イメージ

- UI Controller -> Application Service
- Application Service -> Domain（純粋関数）
- Application Service -> Ports（Clock/Storage/Scheduler）
- Ports <- Adapters（Browser実装: Date.now, localStorage, setInterval）

---

## 4. 推奨ディレクトリ構成

```text
.
├─ architecture.md
├─ README.md
└─ 1.pomodoro/
   ├─ app.py
   ├─ templates/
   │  └─ index.html
   ├─ static/
   │  ├─ css/
   │  │  └─ main.css
   │  └─ js/
   │     ├─ app.js
   │     ├─ ui-controller.js
   │     ├─ application-service.js
   │     ├─ domain/
   │     │  ├─ timer-state.js
   │     │  ├─ timer-reducer.js
   │     │  ├─ time-calculator.js
   │     │  └─ stats-aggregator.js
   │     ├─ ports/
   │     │  ├─ clock-port.js
   │     │  ├─ storage-port.js
   │     │  └─ scheduler-port.js
   │     └─ adapters/
   │        ├─ browser-clock.js
   │        ├─ local-storage-adapter.js
   │        ├─ in-memory-storage-adapter.js
   │        └─ interval-scheduler.js
   └─ tests/
      ├─ domain/
      ├─ application/
      └─ adapters/
```

---

## 5. 各層の責務詳細

### 5.1 Flask（app.py）

最小責務で開始する。

- `GET /` : メイン画面を返す
- `GET /health` : ヘルスチェック（任意）

将来拡張。

- `GET /api/settings` : 設定取得
- `POST /api/settings` : 設定保存
- `POST /api/sessions` : セッション履歴保存
- `GET /api/stats/daily` : 日次統計取得

### 5.2 Domain（純粋ロジック）

- 状態遷移: `idle/running/paused/break/finished`
- イベント: `start/pause/resume/reset/tick/complete`
- ルール例:
  - `start` は `idle` または `paused` からのみ有効
  - `tick` は `running` でのみ有効
  - `remainingSec` は0未満にしない

### 5.3 Application Service

- 入力イベントを受けて reducer 実行
- `clock.now()` で現在時刻取得
- `storage.save()` で状態/進捗を保存
- `ui.present(viewModel)` を呼ぶ

### 5.4 Ports/Adapters

- ClockPort: `now(): number`
- StoragePort: `load(key)`, `save(key, value)`
- SchedulerPort: `start(callback)`, `stop()`

MVP実装。

- Clock: `Date.now()`
- Storage: `localStorage`
- Scheduler: `setInterval/clearInterval`

テスト実装。

- FixedClock/FakeClock
- InMemoryStorage
- ManualScheduler（手動tick）

---

## 6. タイマー進行ロジック方針

時間の進行は「終了予定時刻（endAt）」基準で計算する。

- 開始時: `endAt = now + remainingSec * 1000`
- 表示時: `remainingSec = max(0, ceil((endAt - now) / 1000))`

この方式により、以下に強い。

- タブ非アクティブ復帰
- 描画遅延
- 短時間のイベントループ遅延

---

## 7. UI実装方針（モック準拠）

- 大きな円形プログレスはSVGベースで実装
  - `stroke-dasharray` / `stroke-dashoffset` を利用
- ボタンは状態に応じてラベルと有効/無効を切替
  - 例: 開始 -> 一時停止 -> 再開
- 「今日の進捗」は日付キーで集計
  - 例: `pomodoro.dailyStats.YYYY-MM-DD`

文言（日本語）は定数として分離し、将来のi18nを容易にする。

---

## 8. データ設計

### 8.1 MVP（localStorage）

キー例。

- `pomodoro.settings`
- `pomodoro.timerState`
- `pomodoro.dailyStats.2026-06-09`

保存項目例。

- 設定: `workMinutes`, `shortBreakMinutes`, `longBreakMinutes`, `longBreakEvery`
- 日次進捗: `completedCount`, `focusMinutes`

### 8.2 将来拡張（SQLite）

- `settings` テーブル
  - work_min, short_break_min, long_break_min, long_break_every, updated_at
- `sessions` テーブル
  - started_at, ended_at, type, duration_sec, completed

---

## 9. テスト戦略

### 9.1 ユニットテスト（最優先）

対象。

- Domain: reducer, 時間計算, 進捗集計
- Application: イベント処理、Port呼び出し順序

観点。

- 状態遷移表テスト
- 境界値（0秒、1秒、終了直前/直後）
- 日付跨ぎ

### 9.2 契約テスト（Port/Adapter）

同一テストセットを `LocalStorageAdapter` と `InMemoryStorageAdapter` に適用し、同じ振る舞いを保証する。

### 9.3 最小E2Eテスト

- 開始 -> 一時停止 -> 再開 -> 完了
- タブ復帰後の時間補正

---

## 10. 実装ステップ（推奨）

1. Flask配信基盤（`app.py`, `index.html`）を用意
2. UI骨格とスタイル（モック準拠）を作成
3. Domain純粋関数を先に実装
4. Application Serviceでイベント統合
5. Ports/Adapters接続（Clock/Storage/Scheduler）
6. localStorage連携と日次進捗表示
7. ユニットテスト追加
8. 必要に応じてAPI + SQLiteへ拡張

---

## 11. リスクと対策

- リスク: DOM更新とロジックが混在しテスト困難
  - 対策: presenter/viewModelで分離
- リスク: `setInterval`依存の時間ズレ
  - 対策: endAt基準計算
- リスク: localStorageスキーマ変更時の破壊
  - 対策: バージョン付きデータ構造を採用

---

## 12. まとめ

本アーキテクチャは、MVPの実装速度と将来拡張性、そしてユニットテスト容易性のバランスを重視している。

特に、Domainの純粋関数化とPorts/Adapters分離により、タイマーアプリで起きがちな時間依存バグを再現可能な形で検証できる点が中核的な価値である。
