"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getWeeks, getOrCreateCurrentWeek, getWeekStartDate } from "@/lib/storage";
import { Week } from "@/types";
import { formatWeekRange } from "@/lib/utils";
import { PlusCircle, Calendar, ChevronRight, Sparkles, CheckCircle2 } from "lucide-react";

export default function Dashboard() {
  const router = useRouter();
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [weekStart] = useState(() => getWeekStartDate());

  useEffect(() => {
    setWeeks(getWeeks());
  }, []);

  const currentWeek = weeks.find((w) => w.weekStartDate === weekStart) ?? null;
  const pastWeeks = weeks.filter((w) => w.weekStartDate !== weekStart);

  const handleStartThisWeek = () => {
    const week = getOrCreateCurrentWeek();
    router.push(`/week/${week.id}`);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">KPT Weekly</h1>
          <p className="text-sm text-gray-500 mt-1">{formatWeekRange(weekStart)}</p>
        </div>
        <button
          onClick={handleStartThisWeek}
          className="shrink-0 inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <PlusCircle size={15} />
          {currentWeek ? "今週を開く" : "今週を開始する"}
        </button>
      </div>

      {/* Current week */}
      {currentWeek && (
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">今週</h2>
          <WeekCard week={currentWeek} onClick={() => router.push(`/week/${currentWeek.id}`)} />
        </section>
      )}

      {/* Past weeks */}
      {pastWeeks.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">過去の振り返り</h2>
          <div className="space-y-2">
            {pastWeeks.map((week) => (
              <WeekRow key={week.id} week={week} onClick={() => router.push(`/week/${week.id}`)} />
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {weeks.length === 0 && (
        <div className="text-center py-16">
          <Calendar className="mx-auto text-gray-200 mb-4" size={48} />
          <p className="text-gray-400 text-sm mb-4">まだ記録がありません</p>
          <button
            onClick={handleStartThisWeek}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <PlusCircle size={15} /> 今週のKPTを始める
          </button>
        </div>
      )}
    </div>
  );
}

// ── Current week card ──

function WeekCard({ week, onClick }: { week: Week; onClick: () => void }) {
  const hasKPT = !!(week.kpt.keep || week.kpt.problem || week.kpt.tryText);
  const hasAI = !!week.aiReview.polishedReflection;
  const hasTasks = week.tasks.length > 0;
  const doneCount = week.tasks.filter((t) => t.status === "done").length;
  const hasReview = !!week.weeklyReview.managerSummary;

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-sm transition-all group"
    >
      {/* Status badges */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        <Badge active={hasKPT} label="KPT" />
        <Badge active={hasAI} label="AIレビュー" icon={<Sparkles size={10} />} />
        <Badge
          active={hasTasks}
          label={hasTasks ? `タスク ${doneCount}/${week.tasks.length}` : "タスク未生成"}
          icon={hasTasks && doneCount === week.tasks.length ? <CheckCircle2 size={10} /> : undefined}
        />
        <Badge active={hasReview} label="週末レビュー" />
      </div>

      {/* Preview */}
      {hasAI ? (
        <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
          {week.aiReview.polishedReflection}
        </p>
      ) : hasKPT ? (
        <p className="text-sm text-gray-500 line-clamp-2">
          <span className="text-green-600 font-medium">K</span>
          {" "}{week.kpt.keep || "—"}
        </p>
      ) : (
        <p className="text-sm text-gray-400">クリックして入力を始める →</p>
      )}

      <div className="flex justify-end mt-3">
        <ChevronRight size={15} className="text-gray-300 group-hover:text-blue-400 transition-colors" />
      </div>
    </button>
  );
}

// ── Past week row ──

function WeekRow({ week, onClick }: { week: Week; onClick: () => void }) {
  const hasAI = !!week.aiReview.polishedReflection;
  const doneCount = week.tasks.filter((t) => t.status === "done").length;
  const total = week.tasks.length;
  const hasReview = !!week.weeklyReview.managerSummary;

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white border border-gray-200 rounded-xl px-5 py-3.5 flex items-center gap-3 hover:border-blue-200 hover:bg-blue-50/30 transition-colors group"
    >
      <Calendar size={14} className="text-gray-300 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-700">{formatWeekRange(week.weekStartDate)}</p>
        <div className="flex gap-2 mt-0.5 flex-wrap">
          {hasAI && <span className="text-xs text-blue-500">AI済み</span>}
          {total > 0 && (
            <span className="text-xs text-gray-400">タスク {doneCount}/{total}件</span>
          )}
          {hasReview && <span className="text-xs text-green-500">レビュー済み</span>}
        </div>
      </div>
      <ChevronRight size={14} className="text-gray-300 group-hover:text-blue-400 transition-colors shrink-0" />
    </button>
  );
}

function Badge({
  active,
  label,
  icon,
}: {
  active: boolean;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
        active ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-400"
      }`}
    >
      {icon}
      {label}
    </span>
  );
}
