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
    const { keep, problem, tryText } = await req.json();

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

    const prompt = `
あなたは優秀な上司です。部下から以下のKPT（Keep・Problem・Try）を受け取りました。
冷静で建設的なスタンスで、以下の3点を生成してください。

【KPT入力】
Keep（良かったこと）:
${keep}

Problem（課題）:
${problem}

Try（来週試すこと）:
${tryText}

---

【出力形式に関する厳守事項】
- 必ず以下のJSON形式のみを返すこと
- JSON以外のテキスト（説明文・前置き・コードブロックなど）を一切含めないこと
- コードブロック（\`\`\`json や \`\`\`）で囲まないこと
- 文字列の中の改行は必ず \\n として表現し、生の改行文字を使わないこと
- JSON以外は絶対に返さないこと

{
  "polishedReflection": "今週の振り返りまとめ（Keepの良かった点、Problemの構造化、Tryの具体化を含む）",
  "managerFeedback": "AI上司目線での建設的フィードバック（課題の捉え方、次の打ち手、行動・構造・優先順位の整理。過度に褒めず、実務的なトーンで）",
  "nextFocus": "来週意識するとよいこと（具体的な行動・観点。抽象論ではなく次に取れる行動へ落とし込む）"
}

【文体の注意】
- 日本語
- 丁寧だが過度に励まさない
- 上司が1on1で伝えるような実務的なトーン
- 課題は曖昧にしない
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const parsed = safeParseJson<{
      polishedReflection?: string;
      managerFeedback?: string;
      nextFocus?: string;
    }>(text, {});

    // フォールバック：JSONパースに失敗した場合でも生テキストを返す
    const polishedReflection = parsed.polishedReflection ?? text.slice(0, 500);
    const managerFeedback = parsed.managerFeedback ?? "";
    const nextFocus = parsed.nextFocus ?? "";

    if (!polishedReflection) {
      return NextResponse.json(
        { error: "AI応答の取得に失敗しました。もう一度お試しください。" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      polishedReflection,
      managerFeedback,
      nextFocus,
      generatedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "不明なエラー";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
