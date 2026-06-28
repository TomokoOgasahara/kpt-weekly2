import { AIReview, TaskCandidate } from "@/types";

// ---------------------------------------------------------------------------
// JSON parsing utilities
// ---------------------------------------------------------------------------

/**
 * Geminiの返答から ```json ... ``` コードブロックを除去し、
 * JSONテキストだけを取り出す。
 */
export function extractJson(text: string): string {
  return text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
}

/**
 * JSON文字列中に含まれる「文字列値の中の生の制御文字」を
 * エスケープシーケンスに変換する。
 *
 * Geminiが文字列値の中に改行を生のまま埋め込んだとき
 * （例: "foo\nbar" ではなく "foo<LF>bar"）に発生する
 * "Bad control character in string literal" エラーを防ぐ。
 */
export function sanitizeJsonString(raw: string): string {
  // JSON オブジェクト全体の範囲を特定する
  const startIdx = raw.indexOf("{");
  const endIdx = raw.lastIndexOf("}");
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) return raw;

  const candidate = raw.slice(startIdx, endIdx + 1);

  let result = "";
  let inString = false;
  let escaped = false;

  for (let i = 0; i < candidate.length; i++) {
    const ch = candidate[i];
    const code = ch.charCodeAt(0);

    // 直前が \ だった場合は次の文字をそのまま流す（二重エスケープ防止）
    if (escaped) {
      result += ch;
      escaped = false;
      continue;
    }

    if (ch === "\\") {
      result += ch;
      escaped = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      result += ch;
      continue;
    }

    // 文字列値の内側にいる場合のみ制御文字をエスケープ
    if (inString && code < 0x20) {
      switch (code) {
        case 0x09: result += "\\t"; break; // TAB
        case 0x0a: result += "\\n"; break; // LF
        case 0x0d: result += "\\r"; break; // CR
        default:   /* その他の制御文字は除去 */ break;
      }
      continue;
    }

    result += ch;
  }

  return result;
}

/**
 * Geminiの生テキストを安全にパースする。
 * 1. コードブロック除去
 * 2. 制御文字サニタイズ
 * 3. JSON.parse
 * 4. 失敗した場合は fallback を返す（アプリを落とさない）
 */
export function safeParseJson<T>(text: string, fallback: T): T {
  try {
    const extracted = extractJson(text);
    const sanitized = sanitizeJsonString(extracted);
    return JSON.parse(sanitized) as T;
  } catch (e) {
    console.error("[safeParseJson] parse failed:", e, "\nraw text:", text);
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// Client-side API callers
// ---------------------------------------------------------------------------

type PolishInput = {
  keep: string;
  problem: string;
  tryText: string;
};

export async function polishReflection(input: PolishInput): Promise<AIReview> {
  const res = await fetch("/api/ai/polish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "不明なエラー" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

type TasksInput = {
  keep: string;
  problem: string;
  tryText: string;
  weekStartDate: string;
};

export async function generateTasks(
  input: TasksInput
): Promise<{ tasks: TaskCandidate[] }> {
  const res = await fetch("/api/ai/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "不明なエラー" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

type SummaryTaskInput = {
  title: string;
  status: string;
  progress: number;
  reviewComment: string;
  priority: string;
};

type SummaryInput = {
  keep: string;
  problem: string;
  tryText: string;
  polishedReflection: string;
  tasks: SummaryTaskInput[];
};

type SummaryOutput = {
  managerSummary: string;
  nextWeekAdvice: string;
};

export async function generateWeeklySummary(
  input: SummaryInput
): Promise<SummaryOutput> {
  const res = await fetch("/api/ai/summary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "不明なエラー" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}
