# Yahoo Finance Portfolio to JSON Extension

ヤフーファイナンス（日本版）のポートフォリオ画面から保有銘柄情報を抽出し、JSON形式で取得するChrome Extensionです。

## 取得できる情報

ポートフォリオに表示している列に応じて、以下の情報を自動取得します（非表示の列は `null`）。

数値フィールドの多くは `{ value, date }` 形式で返されます。`date` は更新日（`6/16` 形式）または決算期（`2027/03` 形式）を表し、実績値か予想値かの判別に使用できます。

| フィールド | 内容 | 型 | 例 |
|---|---|---|---|
| `code` | 銘柄コード | `string` | `"4523"` |
| `market` | 市場区分 | `string` | `"東証PRM"` |
| `name` | 銘柄名 | `string` | `"エーザイ(株)"` |
| `currentPrice` | 現在値（円） | `NumberWithDate` | `{ value: 3750, date: "6/16" }` |
| `dividendYield` | 配当利回り（%） | `NumberWithDate` | `{ value: 4.27, date: "6/16" }` |
| `dividendPerShare` | 1株配当（円） | `NumberWithDate` | `{ value: 160, date: "2027/03" }` |
| `marketCap` | 時価総額（円） | `NumberWithDate` | `{ value: 1093684000000, date: "6/16" }` |
| `pbr` | PBR（倍） | `NumberWithDate` | `{ value: 1.18, date: "6/16" }` |
| `per` | PER（倍） | `NumberWithDate` | `{ value: 20.23, date: "6/16" }` |
| `eps` | EPS（円） | `NumberWithDate` | `{ value: 185.39, date: "2027/03" }` |
| `roe` | ROE（%） | `number \| null` | `4.43` |
| `equityRatio` | 自己資本比率（%） | `number \| null` | `62.0` |
| `operatingProfit` | 営業利益（円） | `NumberWithDate` | `{ value: 44138000000, date: "2026/03" }` |
| `netIncome` | 当期利益（円） | `NumberWithDate` | `{ value: 38558000000, date: "2026/03" }` |
| `interestBearingDebt` | 有利子負債（円） | `NumberWithDate` | `{ value: 186081000000, date: "2026/03" }` |
| `memo` | メモ | `string \| null` | `"医薬品"` |

`operatingProfit` / `netIncome` / `interestBearingDebt` / `marketCap` はポートフォリオテーブルの表示値（百万円・億円など）を円換算した整数で格納します。

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
2. ポートフォリオの列設定で必要な列（1株配当・有利子負債・営業利益・当期利益 など）を表示しておく
3. ページ右下に表示される **「JSONコピー」** ボタンをクリック
4. クリップボードに JSON がコピーされる

```json
[
  {
    "code": "4523",
    "market": "東証PRM",
    "name": "エーザイ(株)",
    "currentPrice": { "value": 3750, "date": "6/16" },
    "dividendYield": { "value": 4.27, "date": "6/16" },
    "dividendPerShare": { "value": 160, "date": "2027/03" },
    "marketCap": { "value": 1093684000000, "date": "6/16" },
    "pbr": { "value": 1.18, "date": "6/16" },
    "per": { "value": 20.23, "date": "6/16" },
    "eps": { "value": 185.39, "date": "2027/03" },
    "roe": 4.43,
    "equityRatio": 62.0,
    "operatingProfit": { "value": 44138000000, "date": "2026/03" },
    "netIncome": { "value": 38558000000, "date": "2026/03" },
    "interestBearingDebt": { "value": 186081000000, "date": "2026/03" },
    "memo": null
  }
]
```

> **ポートフォリオの列設定について**
> 列の表示・非表示や順番はユーザー設定に依存します。表示していない列の値は `null`（または `{ value: null, date: null }`）になります。

## 注意事項

- Yahoo Finance のDOM構造が変更された場合、正しく取得できなくなることがあります。その場合は [Issues](https://github.com/lllocity/yf-portfolio-to-json/issues) でご報告ください。
- 本拡張機能はデータの読み取りのみを行います。ポートフォリオの変更・送信は一切行いません。

## 開発者向け

```bash
npm run lint   # 型チェック
npm run build  # ビルド
```

**技術スタック:** TypeScript / Chrome Extension Manifest V3 / tsc
