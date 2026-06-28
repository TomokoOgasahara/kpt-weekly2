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
    const { keep, problem, tryText, weekStartDate } = await req.json();

    const weekStart = new Date(weekStartDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const weekEndStr = weekEnd.toISOString().split("T")[0];

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

    const prompt = `
あなたは優秀な上司です。部下のKPTを確認し、来週実行すべきタスク候補を生成してください。

【KPT】
Keep: ${keep}
Problem: ${problem}
Try: ${tryText}

【制約】
- Tryを中心に、来週（${weekStartDate} 〜 ${weekEndStr}）で実行可能な具体的タスクを3〜7件生成する
- 各タスクは1週間以内に実行可能であること
- 期限（dueDate）は ${weekStartDate} 〜 ${weekEndStr} の範囲内で設定（YYYY-MM-DD形式）
- 優先度はhigh・medium・lowのいずれか

【出力形式に関する厳守事項】
- 必ず以下のJSON形式のみを返すこと
- JSON以外のテキスト（説明文・前置き・コードブロックなど）を一切含めないこと
- コードブロック（\`\`\`json や \`\`\`）で囲まないこと
- 文字列の中の改行は必ず \\n として表現し、生の改行文字を使わないこと

{
  "tasks": [
    {
      "title": "タスク名（具体的な動詞から始める）",
      "description": "タスクの詳細説明",
      "dueDate": "YYYY-MM-DD",
      "priority": "high"
    }
  ]
}
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const parsed = safeParseJson<{ tasks?: unknown[] }>(text, { tasks: [] });
    const tasks = Array.isArray(parsed.tasks) ? parsed.tasks : [];

    return NextResponse.json({ tasks });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "不明なエラー";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
