# KPT Weekly

毎週のKPT振り返りをAI上司がサポートするWebアプリです。

## セットアップ

```bash
npm install
```

`.env.local` を作成して Gemini API キーを設定:

```bash
cp .env.local.example .env.local
# GEMINI_API_KEY=your_key をセット
```

Gemini API キーは [Google AI Studio](https://aistudio.google.com/app/apikey) で取得できます。

## 開発サーバー

```bash
npm run dev
```

http://localhost:3000 を開きます。

## Vercel デプロイ

1. GitHub にプッシュ（`.env.local` は含めない）
2. Vercel でプロジェクトをインポート
3. Environment Variables に `GEMINI_API_KEY` を設定
4. デプロイ

## 技術スタック

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- Gemini API (`gemini-2.5-flash`)
- LocalStorage
