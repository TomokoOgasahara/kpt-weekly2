import {
  Week,
  KPT,
  AIReview,
  Task,
  WeeklyReview,
  emptyKPT,
  emptyAIReview,
  emptyWeeklyReview,
} from "@/types";

// ---- Storage keys ----
const WEEKS_KEY = "kpt-weekly-weeks";
const LEGACY_REFLECTIONS_KEY = "kpt-weekly-reflections";
const LEGACY_TASKS_KEY = "kpt-weekly-tasks";

// ---- Helpers ----

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

/** Returns the Monday of the week containing the given date (or today) as "YYYY-MM-DD" */
export function getWeekStartDate(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun, 1=Mon…
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

// ---- Migration from legacy format ----

function migrateLegacyData(): void {
  if (typeof window === "undefined") return;

  const legacyReflectionsRaw = localStorage.getItem(LEGACY_REFLECTIONS_KEY);
  const legacyTasksRaw = localStorage.getItem(LEGACY_TASKS_KEY);
  if (!legacyReflectionsRaw) return;

  // Already migrated if weeks key exists
  if (localStorage.getItem(WEEKS_KEY)) return;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reflections: any[] = JSON.parse(legacyReflectionsRaw);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const legacyTasks: any[] = legacyTasksRaw ? JSON.parse(legacyTasksRaw) : [];

    const weeks: Week[] = reflections.map((r) => {
      const tasks: Task[] = legacyTasks
        .filter((t) => t.weekReflectionId === r.id)
        .map((t) => ({
          id: t.id,
          weekId: r.id,
          title: t.title ?? "",
          description: t.description ?? "",
          dueDate: t.dueDate ?? "",
          priority: t.priority ?? "medium",
          status: t.status ?? "todo",
          progress: t.progress ?? 0,
          reviewComment: t.reviewComment ?? "",
          createdAt: t.createdAt ?? r.createdAt,
          updatedAt: t.updatedAt ?? r.updatedAt,
        }));

      return {
        id: r.id,
        weekStartDate: r.weekStartDate ?? "",
        kpt: {
          keep: r.rawKeep ?? "",
          problem: r.rawProblem ?? "",
          tryText: r.rawTry ?? "",
        },
        aiReview: {
          polishedReflection: r.polishedReflection ?? "",
          managerFeedback: r.feedback ?? "",
          nextFocus: r.nextFocus ?? "",
          generatedAt: r.updatedAt,
        },
        tasks,
        weeklyReview: {
          taskReviewSaved: !!r.reviewSummary,
          managerSummary: r.reviewSummary ?? "",
          nextWeekAdvice: "",
          reviewedAt: r.reviewSummary ? r.updatedAt : undefined,
        },
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      };
    });

    localStorage.setItem(WEEKS_KEY, JSON.stringify(weeks));
  } catch {
    // Migration failed silently — start fresh
    localStorage.setItem(WEEKS_KEY, JSON.stringify([]));
  }
}

// ---- Core CRUD ----

export function getWeeks(): Week[] {
  if (typeof window === "undefined") return [];
  migrateLegacyData();
  try {
    const raw = localStorage.getItem(WEEKS_KEY);
    return raw ? (JSON.parse(raw) as Week[]) : [];
  } catch {
    return [];
  }
}

function persistWeeks(weeks: Week[]): void {
  localStorage.setItem(WEEKS_KEY, JSON.stringify(weeks));
}

export function getWeek(id: string): Week | undefined {
  return getWeeks().find((w) => w.id === id);
}

export function getCurrentWeek(): Week | undefined {
  const weekStart = getWeekStartDate();
  return getWeeks().find((w) => w.weekStartDate === weekStart);
}

export function getOrCreateCurrentWeek(): Week {
  const existing = getCurrentWeek();
  if (existing) return existing;

  const now = new Date().toISOString();
  const week: Week = {
    id: generateId(),
    weekStartDate: getWeekStartDate(),
    kpt: emptyKPT(),
    aiReview: emptyAIReview(),
    tasks: [],
    weeklyReview: emptyWeeklyReview(),
    createdAt: now,
    updatedAt: now,
  };
  saveWeek(week);
  return week;
}

export function saveWeek(week: Week): Week {
  const list = getWeeks();
  const idx = list.findIndex((w) => w.id === week.id);
  if (idx !== -1) {
    list[idx] = week;
  } else {
    list.unshift(week);
  }
  persistWeeks(list);
  return week;
}

export function updateWeek(
  id: string,
  updates: Partial<Week>
): Week | undefined {
  const list = getWeeks();
  const idx = list.findIndex((w) => w.id === id);
  if (idx === -1) return undefined;
  const updated: Week = {
    ...list[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  list[idx] = updated;
  persistWeeks(list);
  return updated;
}

export function deleteWeek(id: string): void {
  persistWeeks(getWeeks().filter((w) => w.id !== id));
}

// ---- Granular updaters ----

export function updateKPT(weekId: string, kpt: KPT): Week | undefined {
  const week = getWeek(weekId);
  if (!week) return undefined;

  const kptChanged =
    kpt.keep !== week.kpt.keep ||
    kpt.problem !== week.kpt.problem ||
    kpt.tryText !== week.kpt.tryText;

  return updateWeek(weekId, {
    kpt,
    // Clear AI review when KPT content changes
    aiReview: kptChanged ? emptyAIReview() : week.aiReview,
  });
}

export function updateAIReview(
  weekId: string,
  aiReview: AIReview
): Week | undefined {
  return updateWeek(weekId, { aiReview });
}

export function updateTasks(weekId: string, tasks: Task[]): Week | undefined {
  return updateWeek(weekId, { tasks });
}

export function updateWeeklyReview(
  weekId: string,
  patch: Partial<WeeklyReview>
): Week | undefined {
  const week = getWeek(weekId);
  if (!week) return undefined;
  return updateWeek(weekId, {
    weeklyReview: { ...week.weeklyReview, ...patch },
  });
}

/** Update a single task inside a Week */
export function updateTaskInWeek(
  weekId: string,
  taskId: string,
  updates: Partial<Task>
): Week | undefined {
  const week = getWeek(weekId);
  if (!week) return undefined;
  const tasks = week.tasks.map((t) =>
    t.id === taskId
      ? { ...t, ...updates, updatedAt: new Date().toISOString() }
      : t
  );
  return updateWeek(weekId, { tasks });
}
