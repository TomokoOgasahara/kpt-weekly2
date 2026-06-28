import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatWeekRange(weekStartDate: string): string {
  const start = new Date(weekStartDate);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" });
  return `${start.getFullYear()}年 ${fmt(start)} 〜 ${fmt(end)}`;
}

export const priorityLabel: Record<string, string> = {
  high: "高",
  medium: "中",
  low: "低",
};

export const priorityColor: Record<string, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-green-100 text-green-700",
};

export const statusLabel: Record<string, string> = {
  todo: "未着手",
  in_progress: "進行中",
  done: "完了",
  carried_over: "持ち越し",
};

export const statusColor: Record<string, string> = {
  todo: "bg-gray-100 text-gray-600",
  in_progress: "bg-blue-100 text-blue-700",
  done: "bg-green-100 text-green-700",
  carried_over: "bg-orange-100 text-orange-700",
};
