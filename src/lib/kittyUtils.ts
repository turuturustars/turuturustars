import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  Boxes,
  GraduationCap,
  HeartHandshake,
  Landmark,
} from 'lucide-react';

export type KittyCategoryKey = 'emergency' | 'education' | 'welfare' | 'project' | 'other';
export type KittyStatusKey = 'active' | 'paused' | 'completed' | 'closed';

export const KITTY_CATEGORY_META: Record<
  KittyCategoryKey,
  { label: string; Icon: LucideIcon; className: string; accentClassName: string }
> = {
  emergency: {
    label: 'Emergency',
    Icon: AlertTriangle,
    className: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900',
    accentClassName: 'text-red-600 bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900',
  },
  education: {
    label: 'Education',
    Icon: GraduationCap,
    className: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-300 dark:border-sky-900',
    accentClassName: 'text-sky-600 bg-sky-50 border-sky-200 dark:bg-sky-950/30 dark:border-sky-900',
  },
  welfare: {
    label: 'Welfare',
    Icon: HeartHandshake,
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900',
    accentClassName: 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900',
  },
  project: {
    label: 'Project',
    Icon: Landmark,
    className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900',
    accentClassName: 'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900',
  },
  other: {
    label: 'Other',
    Icon: Boxes,
    className: 'bg-muted text-muted-foreground border-border',
    accentClassName: 'text-muted-foreground bg-muted border-border',
  },
};

export const KITTY_STATUS_LABELS: Record<KittyStatusKey, string> = {
  active: 'Active',
  paused: 'Paused',
  completed: 'Completed',
  closed: 'Closed',
};

export function formatKes(value: number | string | null | undefined): string {
  const amount = Number(value ?? 0);
  return `KES ${Number.isFinite(amount) ? amount.toLocaleString() : '0'}`;
}

export function getKittyProgress(balance: number | string | null | undefined, target: number | string | null | undefined) {
  const parsedBalance = Number(balance ?? 0);
  const parsedTarget = Number(target ?? 0);
  if (!Number.isFinite(parsedBalance) || !Number.isFinite(parsedTarget) || parsedTarget <= 0) {
    return 0;
  }
  return Math.min(100, Math.max(0, (parsedBalance / parsedTarget) * 100));
}

export function getKittyRemaining(balance: number | string | null | undefined, target: number | string | null | undefined) {
  const parsedBalance = Number(balance ?? 0);
  const parsedTarget = Number(target ?? 0);
  if (!Number.isFinite(parsedBalance) || !Number.isFinite(parsedTarget)) {
    return 0;
  }
  return Math.max(0, parsedTarget - parsedBalance);
}

export function getDaysUntil(deadline: string | null | undefined) {
  if (!deadline) return null;
  const end = new Date(`${deadline}T23:59:59`);
  const diff = end.getTime() - Date.now();
  if (!Number.isFinite(diff)) return null;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function formatDeadline(deadline: string | null | undefined) {
  if (!deadline) return 'No deadline';
  const date = new Date(`${deadline}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 'No deadline';
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
