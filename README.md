# TetrisEvo

進化戦略でヒューリスティック評価の重みを自動チューニングするテトリスボット。ブラウザで動作し、**フォーカスを奪わずに**自動プレイと重み最適化を行う。

## 🎮 特徴

- **10×20ボード** + 7ミノ + ホールド + Next3個表示
- **SRS準拠**の回転（簡易壁キック実装）
- **Bot API** (`window.tetrisBot`) でプログラム制御
- **ヒューリスティックAI**: 盤面特徴量（穴、高さ、凸凹等）で評価
- **自動学習ループ**: 進化戦略で重み最適化
- **フォーカス不要**: OS入力なし、内部API駆動

## 📁 構成

```
TetrisAI/
├── frontend/           # TypeScript + Vite
│   ├── src/
│   │   ├── core/       # ゲームロジック
│   │   ├── bot/        # AI・計画・重み管理
│   │   ├── canvas/     # 描画
│   │   ├── net/        # バックエンド通信
│   │   └── ui/         # HUD
│   └── index.html
├── backend/            # Python + FastAPI
│   ├── server.py       # APIサーバー
│   ├── trainer.py      # 重み最適化
│   ├── analysis.py     # 統計分析
│   ├── weights/        # 現在の重み
│   └── logs/           # ゲームログ
└── README.md
```

## 🚀 セットアップ

### 前提条件
- Node.js 18+
- Python 3.11+

### インストール

```bash
# フロントエンド
cd frontend
npm install

# バックエンド
cd ../backend
pip install -r requirements.txt
```

## ▶️ 起動

**ターミナル1: バックエンド**
```bash
cd backend
python server.py
# → http://localhost:8000
```

**ターミナル2: フロントエンド**
```bash
cd frontend
npm run dev
# → http://localhost:3000
```

**ターミナル3: トレーナー（オプション）**
```bash
cd backend
python trainer.py
```

## 🎯 使い方

### 手動プレイ
- ← → : 移動
- ↑ / X : 右回転
- Z : 左回転
- ↓ : ソフトドロップ
- Space : ハードドロップ
- C / Shift : ホールド

### 自動プレイ
1. ブラウザで http://localhost:3000 を開く
2. 「**AUTO START**」ボタンをクリック
3. AIが自動でプレイ開始
4. 「AUTO STOP」で停止

### コンソールAPI
```javascript
window.tetrisBot.startAuto()  // 自動開始
window.tetrisBot.stopAuto()   // 停止
window.tetrisBot.getState()   // 現在状態を取得
window.tetrisBot.resetGame()  // リセット
```

## 🧠 重み最適化ループ

1. `trainer.py` が重み候補を生成
2. `weights.json` を更新
3. フロント側が5秒ごとにポーリングして反映
4. ボットが新しい重みでゲームをプレイ
5. 結果が `/log` に送信
6. trainerが集計し、良い重みを選択して次世代へ

### 設定（trainer.py）

```python
TrainerConfig(
    games_per_candidate=20,    # 候補あたりのゲーム数
    population_size=5,         # 世代あたりの候補数
    elite_size=2,              # 次世代に残すエリート数
    mutation_rate=0.1,         # 突然変異率
)
```

## 📊 特徴量と重み

ボットは以下の特徴量を線形加重和で評価：

| 特徴量 | 説明 | デフォルト重み |
|--------|------|---------------|
| `linesCleared` | 消去ライン数 | +0.76 |
| `holes` | 穴の数 | -0.36 |
| `aggregateHeight` | 列高さ合計 | -0.51 |
| `bumpiness` | 隣接列の高さ差合計 | -0.18 |
| `maxHeight` | 最大高さ | -0.10 |
| `wells` | くぼみの深さ | -0.05 |
| `tetrisReady` | Tetris狙いの縦穴が整っているか | +0.50 |
| `tetrisBonus` | 4ライン同時消去時のボーナス | +5.00 |

## 🔧 背景実行の注意

ブラウザは背景タブでタイマーを間引くことがあるため：

### 推奨運用
1. テトリスを**別ウィンドウ**で開く
2. 他のアプリで作業しながらそのまま放置
3. タブは前面のまま

### 安定しない場合
- Chromeの場合: `--disable-background-timer-throttling` オプションで起動
- または: Electron化を検討

## 📝 API エンドポイント

| メソッド | パス | 説明 |
|---------|------|------|
| POST | `/log` | ゲーム結果をログ |
| GET | `/weights` | 現在の重みを取得 |
| GET | `/summary?n=100` | 直近n件の統計 |
| GET | `/health` | ヘルスチェック |

## 🐛 トラブルシューティング

### サーバーに接続できない
- `server.py` が起動しているか確認
- ポート8000が使用されていないか確認

### ボットが動かない
- ブラウザのコンソールでエラー確認
- `window.tetrisBot.startAuto()` を手動実行

### 重みが更新されない
- `server.py` のログ確認
- `backend/weights/weights.json` が存在するか確認
