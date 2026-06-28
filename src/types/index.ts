// ---- Core Types ----

export type KPT = {
  keep: string;
  problem: string;
  tryText: string;
};

export type AIReview = {
  polishedReflection: string;
  managerFeedback: string;
  nextFocus: string;
  generatedAt?: string;
};

export type Task = {
  id: string;
  weekId: string;

  title: string;
  description: string;
  dueDate: string;

  priority: "high" | "medium" | "low";

  status: "todo" | "in_progress" | "done" | "carried_over";

  progress: number; // 0-100

  reviewComment: string;

  createdAt: string;
  updatedAt: string;
};

export type WeeklyReview = {
  taskReviewSaved: boolean;
  managerSummary: string;
  nextWeekAdvice: string;
  reviewedAt?: string;
};

export type Week = {
  id: string;
  weekStartDate: string; // "YYYY-MM-DD" (Monday)

  kpt: KPT;
  aiReview: AIReview;
  tasks: Task[];
  weeklyReview: WeeklyReview;

  createdAt: string;
  updatedAt: string;
};

// ---- Candidate type used before saving tasks ----
export type TaskCandidate = {
  title: string;
  description: string;
  dueDate: string;
  priority: "high" | "medium" | "low";
};

// ---- Defaults ----

export const emptyKPT = (): KPT => ({ keep: "", problem: "", tryText: "" });

export const emptyAIReview = (): AIReview => ({
  polishedReflection: "",
  managerFeedback: "",
  nextFocus: "",
});

export const emptyWeeklyReview = (): WeeklyReview => ({
  taskReviewSaved: false,
  managerSummary: "",
  nextWeekAdvice: "",
});
