/** Small presentation helpers shared by several pages. */

export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Unknown date';
  return date.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelative(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} d ago`;
  return formatDate(iso);
}

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function scoreTone(percentage: number): {
  label: string;
  text: string;
  bg: string;
  ring: string;
  bar: string;
} {
  if (percentage >= 80) {
    return {
      label: 'Excellent',
      text: 'text-emerald-700',
      bg: 'bg-emerald-50',
      ring: 'ring-emerald-200',
      bar: 'bg-emerald-500',
    };
  }
  if (percentage >= 60) {
    return {
      label: 'Good',
      text: 'text-brand-700',
      bg: 'bg-brand-50',
      ring: 'ring-brand-200',
      bar: 'bg-brand-500',
    };
  }
  if (percentage >= 40) {
    return {
      label: 'Developing',
      text: 'text-amber-700',
      bg: 'bg-amber-50',
      ring: 'ring-amber-200',
      bar: 'bg-amber-500',
    };
  }
  return {
    label: 'Needs work',
    text: 'text-rose-700',
    bg: 'bg-rose-50',
    ring: 'ring-rose-200',
    bar: 'bg-rose-500',
  };
}

export const DIMENSION_LABELS: Record<string, string> = {
  technicalCorrectness: 'Technical correctness',
  relevance: 'Relevance',
  clarity: 'Clarity',
  completeness: 'Completeness',
  communication: 'Communication',
};
