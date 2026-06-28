"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  getWeek,
  updateKPT,
  updateAIReview,
  updateTasks,
  updateTaskInWeek,
  updateWeeklyReview,
  deleteWeek,
  generateId,
} from "@/lib/storage";
import { polishReflection, generateTasks, generateWeeklySummary } from "@/lib/gemini-ai";
import {
  Week,
  KPT,
  Task,
  TaskCandidate,

} from "@/types";
import {
  formatWeekRange,
  priorityLabel,
  priorityColor,
  statusLabel,
  statusColor,
} from "@/lib/utils";
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Pencil,
  RefreshCw,
  Save,
  Trash2,
  Loader2,
  AlertTriangle,
  Check,
  CheckCircle2,
  X,
} from "lucide-react";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function WeekDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [week, setWeek] = useState<Week | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    if (!id) { router.push("/"); return; }
    const w = getWeek(id);
    if (!w) { router.push("/"); return; }
    setWeek(w);
  }, [id, router]);

  if (!week) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
        読み込み中…
      </div>
    );
  }

  const handleDelete = () => {
    deleteWeek(week.id);
    router.push("/");
  };

  const refresh = (updated: Week) => setWeek(updated);

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-2"
          >
            <ChevronLeft size={14} /> ホーム
          </Link>
          <h1 className="text-xl font-bold text-gray-900 leading-tight">
            {formatWeekRange(week.weekStartDate)}
          </h1>
        </div>
        <button
          onClick={() => setShowDeleteDialog(true)}
          className="shrink-0 inline-flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 px-2 py-1.5 rounded hover:bg-red-50 transition-colors"
        >
          <Trash2 size={13} /> この週を削除
        </button>
      </div>

      {/* ── Section 1: KPT ── */}
      <KPTSection week={week} onUpdate={refresh} />

      {/* ── Section 2: AI Review ── */}
      <AIReviewSection week={week} onUpdate={refresh} />

      {/* ── Section 3: Tasks ── */}
      <TaskSection week={week} onUpdate={refresh} />

      {/* ── Section 4: Weekly Review ── */}
      <WeeklyReviewSection week={week} onUpdate={refresh} />

      {/* ── Delete dialog ── */}
      {showDeleteDialog && (
        <ConfirmDialog
          title="この週の記録を削除"
          message="KPT・AIレビュー・タスク・週末レビューをすべて削除します。この操作は取り消せません。"
          confirmLabel="削除する"
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteDialog(false)}
          danger
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 1: KPT
// ---------------------------------------------------------------------------

function KPTSection({ week, onUpdate }: { week: Week; onUpdate: (w: Week) => void }) {
  const [open, setOpen] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<KPT>(week.kpt);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const hasKPT = !!(week.kpt.keep || week.kpt.problem || week.kpt.tryText);

  // auto-open in edit mode if KPT is empty
  useEffect(() => {
    if (!hasKPT) setEditing(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = () => {
    setSaving(true);
    const updated = updateKPT(week.id, draft);
    if (updated) onUpdate(updated);
    setSaving(false);
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleCancel = () => {
    setDraft(week.kpt);
    setEditing(false);
  };

  const isDirty =
    draft.keep !== week.kpt.keep ||
    draft.problem !== week.kpt.problem ||
    draft.tryText !== week.kpt.tryText;

  return (
    <SectionCard
      number={1}
      title="KPT"
      open={open}
      onToggle={() => setOpen((v) => !v)}
      headerRight={
        !editing ? (
          <button
            onClick={(e) => { e.stopPropagation(); setEditing(true); }}
            className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
          >
            <Pencil size={11} /> 編集
          </button>
        ) : null
      }
    >
      {editing ? (
        /* ── Edit mode ── */
        <div className="space-y-3">
          {isDirty && week.aiReview.polishedReflection && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
              <AlertTriangle size={13} className="shrink-0 mt-0.5" />
              KPTを変更すると、生成済みのAIレビューがリセットされます。
            </div>
          )}
          <KPTTextarea
            label="Keep" description="うまくいったこと・続けたいこと" color="green"
            value={draft.keep} onChange={(v) => setDraft({ ...draft, keep: v })}
            placeholder="例: 毎朝タスクを整理してから作業を始められた。"
          />
          <KPTTextarea
            label="Problem" description="課題に感じたこと・改善したいこと" color="red"
            value={draft.problem} onChange={(v) => setDraft({ ...draft, problem: v })}
            placeholder="例: 会議が多くてまとまった作業時間が取れなかった。"
          />
          <KPTTextarea
            label="Try" description="来週試してみたいこと・アクション" color="blue"
            value={draft.tryText} onChange={(v) => setDraft({ ...draft, tryText: v })}
            placeholder="例: 午前中2時間はノー会議タイムにする。"
          />
          <div className="flex gap-2 justify-end pt-1">
            <button
              onClick={handleCancel}
              className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5"
            >
              キャンセル
            </button>
            <button
              onClick={handleSave}
              disabled={saving || (!draft.keep && !draft.problem && !draft.tryText)}
              className="inline-flex items-center gap-1.5 text-sm bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-40"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              保存
            </button>
          </div>
        </div>
      ) : hasKPT ? (
        /* ── View mode ── */
        <div className="space-y-2">
          <KPTBlock label="Keep" value={week.kpt.keep} color="green" />
          <KPTBlock label="Problem" value={week.kpt.problem} color="red" />
          <KPTBlock label="Try" value={week.kpt.tryText} color="blue" />
          {saved && (
            <p className="text-xs text-green-600 flex items-center gap-1">
              <Check size={11} /> 保存しました
            </p>
          )}
        </div>
      ) : (
        <div className="text-center py-4">
          <p className="text-sm text-gray-400 mb-2">KPTがまだ入力されていません</p>
          <button
            onClick={() => setEditing(true)}
            className="text-sm text-blue-600 hover:underline"
          >
            入力する →
          </button>
        </div>
      )}
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Section 2: AI Review
// ---------------------------------------------------------------------------

function AIReviewSection({ week, onUpdate }: { week: Week; onUpdate: (w: Week) => void }) {
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const hasKPT = !!(week.kpt.keep || week.kpt.problem || week.kpt.tryText);
  const hasAI = !!week.aiReview.polishedReflection;

  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await polishReflection({
        keep: week.kpt.keep,
        problem: week.kpt.problem,
        tryText: week.kpt.tryText,
      });
      const updated = updateAIReview(week.id, result);
      if (updated) onUpdate(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SectionCard
      number={2}
      title="AI上司フィードバック"
      open={open}
      onToggle={() => setOpen((v) => !v)}
      headerRight={
        hasAI ? (
          <button
            onClick={(e) => { e.stopPropagation(); handleGenerate(); }}
            disabled={loading}
            className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
          >
            <RefreshCw size={11} className={loading ? "animate-spin" : ""} /> 再生成
          </button>
        ) : null
      }
    >
      {error && <ErrorBanner message={error} />}

      {!hasAI && !loading && (
        <button
          onClick={handleGenerate}
          disabled={!hasKPT}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Sparkles size={15} />
          {hasKPT ? "AI上司にフィードバックを依頼する" : "先にKPTを入力してください"}
        </button>
      )}

      {loading && <LoadingSpinner label="AI上司が分析中…" />}

      {hasAI && !loading && (
        <div className="space-y-3">
          <AIBlock title="今週の振り返りまとめ" content={week.aiReview.polishedReflection} bg="gray" />
          {week.aiReview.managerFeedback && (
            <AIBlock title="AI上司からの建設的フィードバック" content={week.aiReview.managerFeedback} bg="amber" />
          )}
          {week.aiReview.nextFocus && (
            <AIBlock title="来週意識すること" content={week.aiReview.nextFocus} bg="blue" />
          )}
        </div>
      )}
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Section 3: Tasks
// ---------------------------------------------------------------------------

function TaskSection({ week, onUpdate }: { week: Week; onUpdate: (w: Week) => void }) {
  const [open, setOpen] = useState(true);
  const [candidates, setCandidates] = useState<TaskCandidate[]>([]);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const [savedNotice, setSavedNotice] = useState(false);
  const [taskSavedId, setTaskSavedId] = useState<string | null>(null);

  const hasAI = !!week.aiReview.polishedReflection;
  const hasTasks = week.tasks.length > 0;

  const handleGenerate = async () => {
    setGenerating(true);
    setGenError("");
    try {
      const result = await generateTasks({
        keep: week.kpt.keep,
        problem: week.kpt.problem,
        tryText: week.kpt.tryText,
        weekStartDate: week.weekStartDate,
      });
      setCandidates(result.tasks);
    } catch (err: unknown) {
      setGenError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveCandidates = () => {
    const now = new Date().toISOString();
    const tasks: Task[] = candidates.map((tc) => ({
      id: generateId(),
      weekId: week.id,
      title: tc.title,
      description: tc.description,
      dueDate: tc.dueDate,
      priority: tc.priority,
      status: "todo",
      progress: 0,
      reviewComment: "",
      createdAt: now,
      updatedAt: now,
    }));
    const updated = updateTasks(week.id, tasks);
    if (updated) onUpdate(updated);
    setCandidates([]);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  const handleTaskUpdate = (taskId: string, updates: Partial<Task>) => {
    const updated = updateTaskInWeek(week.id, taskId, updates);
    if (updated) onUpdate(updated);
    setTaskSavedId(taskId);
    setTimeout(() => setTaskSavedId(null), 1500);
  };

  return (
    <SectionCard
      number={3}
      title={`タスク${hasTasks ? ` (${week.tasks.filter(t => t.status === "done").length}/${week.tasks.length}件完了)` : ""}`}
      open={open}
      onToggle={() => setOpen((v) => !v)}
      headerRight={
        hasAI && candidates.length === 0 ? (
          <button
            onClick={(e) => { e.stopPropagation(); handleGenerate(); }}
            disabled={generating}
            className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-600 px-2 py-1 rounded hover:bg-indigo-50 transition-colors"
          >
            {generating
              ? <><Loader2 size={11} className="animate-spin" /> 生成中…</>
              : <><Sparkles size={11} /> {hasTasks ? "再生成" : "タスクを生成"}</>}
          </button>
        ) : null
      }
    >
      {genError && <ErrorBanner message={genError} />}

      {/* No AI yet */}
      {!hasAI && candidates.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-3">
          先にAIフィードバックを生成してください
        </p>
      )}

      {/* Generate button (first time, no tasks, no candidates) */}
      {hasAI && !hasTasks && candidates.length === 0 && !generating && (
        <button
          onClick={handleGenerate}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <Sparkles size={15} /> Tryからタスクを生成する
        </button>
      )}

      {generating && <LoadingSpinner label="タスクを生成中…" />}

      {/* Candidates */}
      {candidates.length > 0 && !generating && (
        <div className="space-y-3">
          <p className="text-xs text-gray-500 font-medium">
            タスク候補 — 編集・削除して保存してください
          </p>
          {candidates.map((tc, idx) => (
            <CandidateCard
              key={idx}
              task={tc}
              onUpdate={(u) => setCandidates((prev) => prev.map((t, i) => i === idx ? { ...t, ...u } : t))}
              onDelete={() => setCandidates((prev) => prev.filter((_, i) => i !== idx))}
            />
          ))}
          <div className="flex gap-2 justify-between items-center pt-1">
            <button
              onClick={handleGenerate}
              className="text-xs text-gray-400 hover:text-indigo-600 flex items-center gap-1"
            >
              <RefreshCw size={11} /> 再生成
            </button>
            <button
              onClick={handleSaveCandidates}
              disabled={candidates.length === 0}
              className="inline-flex items-center gap-1.5 text-sm bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-40"
            >
              <Save size={13} /> {candidates.length}件を保存する
            </button>
          </div>
          {savedNotice && (
            <p className="text-xs text-green-600 flex items-center gap-1">
              <Check size={11} /> 保存しました
            </p>
          )}
        </div>
      )}

      {/* Saved tasks */}
      {hasTasks && candidates.length === 0 && (
        <div className="space-y-3">
          {savedNotice && (
            <p className="text-xs text-green-600 flex items-center gap-1 mb-1">
              <Check size={11} /> 保存しました
            </p>
          )}
          {week.tasks.map((task) => (
            <SavedTaskCard
              key={task.id}
              task={task}
              onUpdate={(u) => handleTaskUpdate(task.id, u)}
              justSaved={taskSavedId === task.id}
            />
          ))}
          {hasAI && (
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="text-xs text-gray-400 hover:text-indigo-600 flex items-center gap-1 pt-1"
            >
              <RefreshCw size={11} className={generating ? "animate-spin" : ""} />
              タスクを再生成する
            </button>
          )}
        </div>
      )}
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Section 4: Weekly Review
// ---------------------------------------------------------------------------

function WeeklyReviewSection({ week, onUpdate }: { week: Week; onUpdate: (w: Week) => void }) {
  const [open, setOpen] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [taskSavedId, setTaskSavedId] = useState<string | null>(null);

  const hasTasks = week.tasks.length > 0;
  const hasReview = !!week.weeklyReview.managerSummary;
  const doneCount = week.tasks.filter((t) => t.status === "done").length;

  const handleTaskUpdate = (taskId: string, updates: Partial<Task>) => {
    const updated = updateTaskInWeek(week.id, taskId, updates);
    if (updated) onUpdate(updated);
    setTaskSavedId(taskId);
    setTimeout(() => setTaskSavedId(null), 1500);
  };

  const handleGenerateSummary = async () => {
    setGenerating(true);
    setError("");
    try {
      const result = await generateWeeklySummary({
        keep: week.kpt.keep,
        problem: week.kpt.problem,
        tryText: week.kpt.tryText,
        polishedReflection: week.aiReview.polishedReflection,
        tasks: week.tasks.map((t) => ({
          title: t.title,
          status: t.status,
          progress: t.progress,
          reviewComment: t.reviewComment,
          priority: t.priority,
        })),
      });
      const now = new Date().toISOString();
      const updated = updateWeeklyReview(week.id, {
        managerSummary: result.managerSummary,
        nextWeekAdvice: result.nextWeekAdvice,
        taskReviewSaved: true,
        reviewedAt: now,
      });
      if (updated) onUpdate(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <SectionCard
      number={4}
      title="週末レビュー"
      open={open}
      onToggle={() => setOpen((v) => !v)}
      headerRight={
        hasReview ? (
          <button
            onClick={(e) => { e.stopPropagation(); handleGenerateSummary(); }}
            disabled={generating}
            className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-600 px-2 py-1 rounded hover:bg-indigo-50 transition-colors"
          >
            <RefreshCw size={11} className={generating ? "animate-spin" : ""} /> 再生成
          </button>
        ) : null
      }
    >
      {!hasTasks && (
        <p className="text-sm text-gray-400 text-center py-3">
          先にタスクを生成・保存してください
        </p>
      )}

      {hasTasks && (
        <div className="space-y-4">
          {/* Completion summary bar */}
          <div className="flex items-center gap-3">
            <CheckCircle2
              size={18}
              className={doneCount === week.tasks.length && week.tasks.length > 0 ? "text-green-500" : "text-gray-300"}
            />
            <div className="flex-1">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>完了 {doneCount}/{week.tasks.length}件</span>
                <span>{week.tasks.length > 0 ? Math.round((doneCount / week.tasks.length) * 100) : 0}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div
                  className="bg-blue-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${week.tasks.length > 0 ? (doneCount / week.tasks.length) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* Task review list */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-gray-500">各タスクの達成状況を入力してください</p>
            {week.tasks.map((task) => (
              <ReviewTaskCard
                key={task.id}
                task={task}
                onUpdate={(u) => handleTaskUpdate(task.id, u)}
                justSaved={taskSavedId === task.id}
              />
            ))}
          </div>

          {error && <ErrorBanner message={error} />}

          {/* AI Summary */}
          {!hasReview && !generating && (
            <button
              onClick={handleGenerateSummary}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              <Sparkles size={15} /> AI上司にサマリーを依頼する
            </button>
          )}

          {generating && <LoadingSpinner label="AI上司が週次サマリーを作成中…" />}

          {hasReview && !generating && (
            <div className="space-y-3">
              <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4">
                <p className="text-xs font-semibold text-indigo-700 mb-2">AI上司 週次サマリー</p>
                <p className="text-sm text-gray-700 ai-text">{week.weeklyReview.managerSummary}</p>
              </div>
              {week.weeklyReview.nextWeekAdvice && (
                <div className="bg-amber-50 border border-amber-100 rounded-lg p-4">
                  <p className="text-xs font-semibold text-amber-700 mb-2">次週への申し送り</p>
                  <p className="text-sm text-gray-700 ai-text">{week.weeklyReview.nextWeekAdvice}</p>
                </div>
              )}
              {week.weeklyReview.reviewedAt && (
                <p className="text-xs text-gray-400">
                  レビュー日時: {new Date(week.weeklyReview.reviewedAt).toLocaleString("ja-JP")}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

function SectionCard({
  number,
  title,
  open,
  onToggle,
  headerRight,
  children,
}: {
  number: number;
  title: string;
  open: boolean;
  onToggle: () => void;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-xs font-bold flex items-center justify-center shrink-0">
            {number}
          </span>
          <span className="font-semibold text-gray-800 text-sm">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          {headerRight}
          {open ? (
            <ChevronUp size={15} className="text-gray-400" />
          ) : (
            <ChevronDown size={15} className="text-gray-400" />
          )}
        </div>
      </button>
      {open && (
        <div className="border-t border-gray-100 px-5 py-4">
          {children}
        </div>
      )}
    </div>
  );
}

function KPTTextarea({
  label,
  description,
  color,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  description: string;
  color: "green" | "red" | "blue";
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const header = {
    green: "bg-green-50 text-green-700",
    red: "bg-red-50 text-red-700",
    blue: "bg-blue-50 text-blue-700",
  }[color];
  const border = {
    green: "border-green-200 focus-within:border-green-400",
    red: "border-red-200 focus-within:border-red-400",
    blue: "border-blue-200 focus-within:border-blue-400",
  }[color];

  return (
    <div className={`border-2 rounded-xl transition-colors ${border}`}>
      <div className={`px-4 pt-2.5 pb-1.5 rounded-t-xl ${header}`}>
        <p className="font-bold text-xs">{label}</p>
        <p className="text-xs opacity-60">{description}</p>
      </div>
      <textarea
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 text-sm text-gray-700 resize-none focus:outline-none rounded-b-xl"
      />
    </div>
  );
}

function KPTBlock({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: "green" | "red" | "blue";
}) {
  if (!value) return null;
  const style = {
    green: "bg-green-50 border-green-100 text-green-700",
    red: "bg-red-50 border-red-100 text-red-700",
    blue: "bg-blue-50 border-blue-100 text-blue-700",
  }[color];
  return (
    <div className={`border rounded-lg p-3 ${style}`}>
      <p className="text-xs font-bold mb-1">{label}</p>
      <p className="text-sm text-gray-700 whitespace-pre-wrap">{value}</p>
    </div>
  );
}

function AIBlock({
  title,
  content,
  bg,
}: {
  title: string;
  content: string;
  bg: "gray" | "amber" | "blue";
}) {
  const card = {
    gray: "bg-gray-50 border-gray-200",
    amber: "bg-amber-50 border-amber-100",
    blue: "bg-blue-50 border-blue-100",
  }[bg];
  const hd = {
    gray: "text-gray-600",
    amber: "text-amber-700",
    blue: "text-blue-700",
  }[bg];
  return (
    <div className={`border rounded-lg p-4 ${card}`}>
      <p className={`text-xs font-semibold mb-2 ${hd}`}>{title}</p>
      <p className="text-sm text-gray-700 ai-text">{content}</p>
    </div>
  );
}

function CandidateCard({
  task,
  onUpdate,
  onDelete,
}: {
  task: TaskCandidate;
  onUpdate: (u: Partial<TaskCandidate>) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg p-3 space-y-2">
      {editing ? (
        <div className="space-y-2">
          <input
            className="w-full text-sm border border-gray-200 rounded px-3 py-1.5 focus:outline-none focus:border-blue-400"
            value={task.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="タスク名"
          />
          <textarea
            className="w-full text-sm border border-gray-200 rounded px-3 py-1.5 focus:outline-none focus:border-blue-400 resize-none"
            rows={2}
            value={task.description}
            onChange={(e) => onUpdate({ description: e.target.value })}
            placeholder="説明"
          />
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-gray-400">期限</label>
              <input
                type="date"
                className="w-full text-sm border border-gray-200 rounded px-3 py-1.5 focus:outline-none focus:border-blue-400 mt-0.5"
                value={task.dueDate}
                onChange={(e) => onUpdate({ dueDate: e.target.value })}
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-400">優先度</label>
              <select
                className="w-full text-sm border border-gray-200 rounded px-3 py-1.5 focus:outline-none focus:border-blue-400 mt-0.5"
                value={task.priority}
                onChange={(e) => onUpdate({ priority: e.target.value as TaskCandidate["priority"] })}
              >
                <option value="high">高</option>
                <option value="medium">中</option>
                <option value="low">低</option>
              </select>
            </div>
          </div>
          <button onClick={() => setEditing(false)} className="text-xs text-blue-600 hover:underline">
            完了
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-gray-800 flex-1">{task.title}</p>
            <div className="flex gap-1 shrink-0">
              <button onClick={() => setEditing(true)} className="p-1 text-gray-400 hover:text-gray-600">
                <Pencil size={12} />
              </button>
              <button onClick={onDelete} className="p-1 text-gray-400 hover:text-red-500">
                <X size={12} />
              </button>
            </div>
          </div>
          {task.description && <p className="text-xs text-gray-500">{task.description}</p>}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">期限: {task.dueDate}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityColor[task.priority]}`}>
              {priorityLabel[task.priority]}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

function SavedTaskCard({
  task,
  onUpdate,
  justSaved,
}: {
  task: Task;
  onUpdate: (u: Partial<Task>) => void;
  justSaved: boolean;
}) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-800">{task.title}</p>
          {task.description && <p className="text-xs text-gray-500 mt-0.5">{task.description}</p>}
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${priorityColor[task.priority]}`}>
          {priorityLabel[task.priority]}
        </span>
      </div>

      <p className="text-xs text-gray-400">期限: {task.dueDate}</p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 block mb-1">ステータス</label>
          <select
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-400 bg-white"
            value={task.status}
            onChange={(e) => onUpdate({ status: e.target.value as Task["status"] })}
          >
            <option value="todo">未着手</option>
            <option value="in_progress">進行中</option>
            <option value="done">完了</option>
            <option value="carried_over">持ち越し</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">達成率: {task.progress}%</label>
          <input
            type="range" min={0} max={100} step={10} value={task.progress}
            onChange={(e) => onUpdate({ progress: Number(e.target.value) })}
            className="w-full mt-1.5"
          />
        </div>
      </div>

      <div className="w-full bg-gray-100 rounded-full h-1">
        <div
          className={`h-1 rounded-full transition-all ${task.status === "done" ? "bg-green-500" : "bg-blue-400"}`}
          style={{ width: `${task.progress}%` }}
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[task.status]}`}>
          {statusLabel[task.status]}
        </span>
        {justSaved && (
          <span className="text-xs text-green-600 flex items-center gap-1">
            <Check size={11} /> 自動保存しました
          </span>
        )}
      </div>
    </div>
  );
}

function ReviewTaskCard({
  task,
  onUpdate,
  justSaved,
}: {
  task: Task;
  onUpdate: (u: Partial<Task>) => void;
  justSaved: boolean;
}) {
  return (
    <div className="border border-gray-200 rounded-lg p-3 space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-gray-800 flex-1">{task.title}</p>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${priorityColor[task.priority]}`}>
          {priorityLabel[task.priority]}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-500 block mb-1">ステータス</label>
          <select
            className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-indigo-400 bg-white"
            value={task.status}
            onChange={(e) => onUpdate({ status: e.target.value as Task["status"] })}
          >
            <option value="todo">未着手</option>
            <option value="in_progress">進行中</option>
            <option value="done">完了</option>
            <option value="carried_over">持ち越し</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">達成率: {task.progress}%</label>
          <input
            type="range" min={0} max={100} step={10} value={task.progress}
            onChange={(e) => onUpdate({ progress: Number(e.target.value) })}
            className="w-full mt-1"
          />
        </div>
      </div>

      <div className="w-full bg-gray-100 rounded-full h-1">
        <div
          className={`h-1 rounded-full transition-all ${task.status === "done" ? "bg-green-500" : "bg-blue-400"}`}
          style={{ width: `${task.progress}%` }}
        />
      </div>

      <textarea
        rows={2}
        value={task.reviewComment}
        onChange={(e) => onUpdate({ reviewComment: e.target.value })}
        placeholder="コメント（完了状況・気づき・持ち越し理由など）"
        className="w-full text-xs border border-gray-200 rounded px-3 py-2 focus:outline-none focus:border-indigo-400 resize-none"
      />

      <div className="flex items-center justify-between">
        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[task.status]}`}>
          {statusLabel[task.status]}
        </span>
        {justSaved && (
          <span className="text-xs text-green-600 flex items-center gap-1">
            <Check size={11} /> 自動保存
          </span>
        )}
      </div>
    </div>
  );
}

function LoadingSpinner({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-6 text-gray-500">
      <Loader2 size={18} className="animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
      {message}
    </div>
  );
}

function ConfirmDialog({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  danger,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-sm w-full space-y-4">
        <div className="flex items-center gap-3">
          {danger && (
            <div className="w-9 h-9 bg-red-100 rounded-full flex items-center justify-center shrink-0">
              <AlertTriangle size={18} className="text-red-600" />
            </div>
          )}
          <h3 className="font-semibold text-gray-900">{title}</h3>
        </div>
        <p className="text-sm text-gray-600 leading-relaxed">{message}</p>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">
            キャンセル
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
              danger
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
