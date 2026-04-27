# Yahoo Finance Portfolio to JSON Extension

ヤフーファイナンスのポートフォリオ画面から保有銘柄情報を抽出し、JSON形式で取得するためのChrome Extensionです。

## プロジェクト構成
- `src/manifest.json`: エクステンションの定義 (Manifest V3)
- `src/content.ts`: DOM抽出ロジック（メイン）
- `src/popup.html / .ts`: JSON出力用UI（任意）

## 開発スタック
- TypeScript
- Vite (ビルドツールとして推奨)

## 使用方法
1. ヤフーファイナンスのポートフォリオページを開く
2. エクステンションを実行
3. 抽出されたJSONをクリップボードにコピー、またはファイル保存
