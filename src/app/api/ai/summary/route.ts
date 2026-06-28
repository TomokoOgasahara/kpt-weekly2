import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { safeParseJson } from "@/lib/gemini-ai";

const GEMINI_MODEL = "gemini-2.5-flash";

const NO_KEY_ERROR =
  "Gemini APIキーが設定されていません。ローカルでは .env.local、Vercelでは Environment Variables に GEMINI_API_KEY を設定してください。";

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: NO_KEY_ERROR }, { status: 500 });
  }

  try {
    const { keep, problem, tryText, polishedReflection, tasks } =
      await req.json();

    const tasksSummary = tasks
      .map(
        (t: {
          title: string;
          status: string;
          progress: number;
          reviewComment: string;
          priority: string;
        }) =>
          `・${t.title}（優先度: ${t.priority}、ステータス: ${t.status}、達成率: ${t.progress}%）コメント: ${t.reviewComment || "なし"}`
      )
      .join("\\n");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

    const prompt = `
あなたは優秀な上司です。部下の今週の振り返りとタスク実行状況を確認し、週次サマリーと来週へのアドバイスを生成してください。

【今週のKPT】
Keep: ${keep}
Problem: ${problem}
Try: ${tryText}

【AI清書まとめ】
${polishedReflection}

【タスク実行状況】
${tasksSummary || "（タスクなし）"}

【出力形式に関する厳守事項】
- 必ず以下のJSON形式のみを返すこと
- JSON以外のテキスト（説明文・前置き・コードブロックなど）を一切含めないこと
- コードブロック（\`\`\`json や \`\`\`）で囲まないこと
- 文字列の中の改行は必ず \\n として表現し、生の改行文字を使わないこと

{
  "managerSummary": "AI上司目線の週次サマリー。以下を含む：\\n1. 今週完了したこと\\n2. 未完了・持ち越しになったこと\\n3. タスク実行状況へのフィードバック（行動面・優先順位面での所見）",
  "nextWeekAdvice": "来週への申し送り・アドバイス。具体的で実行可能な内容。"
}

【文体の注意】
- 日本語
- 丁寧だが過度に励まさない・褒めすぎない
- 上司が1on1で伝えるような実務的なトーン
- 課題は曖昧にしない
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const parsed = safeParseJson<{
      managerSummary?: string;
      nextWeekAdvice?: string;
    }>(text, {});

    // フォールバック：JSONパースに失敗した場合でも生テキストを返す
    const managerSummary = parsed.managerSummary ?? text.slice(0, 1000);
    const nextWeekAdvice = parsed.nextWeekAdvice ?? "";

    return NextResponse.json({ managerSummary, nextWeekAdvice });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "不明なエラー";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
