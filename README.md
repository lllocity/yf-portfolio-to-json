# Yahoo Finance Portfolio to JSON Extension

ヤフーファイナンス（日本版）のポートフォリオ画面から保有銘柄情報を抽出し、JSON形式で取得するChrome Extensionです。

## 取得できる情報

ポートフォリオに表示している列に応じて、以下の情報を自動取得します（非表示の列は `null`）。

| フィールド | 内容 | 例 |
|---|---|---|
| `code` | 銘柄コード | `"7012"` |
| `market` | 市場区分 | `"東証PRM"` |
| `name` | 銘柄名 | `"川崎重工業(株)"` |
| `currentPrice` | 現在値 | `3134` |
| `earningsDate` | 決算発表日 | `"2025年5月9日"` |
| `dividendYield` | 配当利回り（%） | `1.06` |
| `profitLoss` | 損益（円） | `-211` |
| `marketCap` | 時価総額（百万円） | `2631335` |
| `pbr` | PBR（倍） | `3.24` |
| `per` | PER（倍） | `29.10` |
| `marginBuy` | 信用買残（株） | `18599900` |
| `marginSell` | 信用売残（株） | `1018000` |
| `memo` | メモ | `"防衛関連"` |

## インストール方法

### 1. リポジトリの準備

```bash
git clone https://github.com/lllocity/yf-portfolio-to-json.git
cd yf-portfolio-to-json
```

### 2. ビルド

```bash
npm install
npm run build
```

`dist/content.js` が生成されます。

### 3. Chrome に読み込む

1. Chrome のアドレスバーに `chrome://extensions` と入力して開く
2. 右上の **デベロッパーモード** をオンにする
3. **「パッケージ化されていない拡張機能を読み込む」** をクリック
4. このリポジトリのルートフォルダ（`manifest.json` があるフォルダ）を選択

## 使い方

1. [ヤフーファイナンス ポートフォリオ](https://finance.yahoo.co.jp/portfolio/) を開く
2. Chrome の **デベロッパーツール** を開く（`F12` または `⌘ + Option + I`）
3. **Console** タブを選択
4. `[yf-portfolio] 抽出結果:` というログに JSON が出力されている

```json
[
  {
    "code": "7012",
    "market": "東証PRM",
    "name": "川崎重工業(株)",
    "currentPrice": 3134,
    "earningsDate": "2025年5月9日",
    "dividendYield": 1.06,
    "profitLoss": -211,
    "marketCap": 2631335,
    "pbr": 3.24,
    "per": 29.10,
    "marginBuy": 18599900,
    "marginSell": 1018000,
    "memo": null
  }
]
```

> **ポートフォリオの列設定について**
> 列の表示・非表示や順番はユーザー設定に依存します。表示していない列の値は `null` になります。

## 注意事項

- Yahoo Finance のDOM構造が変更された場合、正しく取得できなくなることがあります。その場合は [Issues](https://github.com/lllocity/yf-portfolio-to-json/issues) でご報告ください。
- 本拡張機能はデータの読み取りのみを行います。ポートフォリオの変更・送信は一切行いません。

## 開発者向け

```bash
npm run lint   # 型チェック
npm run build  # ビルド
```

**技術スタック:** TypeScript / Chrome Extension Manifest V3 / tsc
