import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const ITEM_EMOJIS = [
  "🌿",
  "🚀",
  "💼",
  "📚",
  "🎯",
  "🧠",
  "🛠️",
  "🎨",
  "💡",
  "🧭",
  "🌱",
  "🔥",
  "⚡",
  "🧩",
  "📈",
  "🗂️",
  "🏗️",
  "🧪",
  "🎵",
  "🏡",
];

export function randomItemEmoji() {
  return ITEM_EMOJIS[Math.floor(Math.random() * ITEM_EMOJIS.length)];
}

export const ITEM_PALETTE = [
  "#6366f1",
  "#8b5cf6",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#f43f5e",
  "#14b8a6",
  "#f97316",
  "#a855f7",
  "#84cc16",
];

export function paletteColor(index: number) {
  return ITEM_PALETTE[index % ITEM_PALETTE.length];
}

export function colorForItem(item: { id: string; color?: string | null }, index = 0) {
  return item.color ?? ITEM_PALETTE[index % ITEM_PALETTE.length];
}

export function formatDuration(
  totalSeconds: number,
  options?: { compact?: boolean; zero?: string; showSeconds?: boolean },
) {
  const seconds = Math.max(0, Math.round(totalSeconds));
  if (seconds === 0) return options?.zero ?? (options?.compact ? "0h" : "0m");

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (options?.showSeconds) {
    const parts: string[] = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
    return parts.join(" ");
  }

  // Aggregate totals stay calm; individual entries can request seconds.
  if (hours > 0) {
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) return `${minutes}m`;
  return `${secs}s`;
}

export function formatClock(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatHours(totalSeconds: number, digits = 1) {
  const hours = totalSeconds / 3600;
  if (hours === 0) return "0";
  if (hours < 0.1) return "<0.1";
  return hours.toFixed(hours >= 10 ? 0 : digits);
}

export function formatPercent(value: number, digits = 0) {
  return `${Math.round(value * 100) / (digits === 0 ? 1 : 1)}%`;
}

export function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function toNumber(value: FormDataEntryValue | null) {
  if (value === null) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return count === 1 ? singular : plural;
}
