export function ProgressBar({
  value,
  max = 100,
  label,
  className = '',
  tone = 'brand',
  height = 'md',
}: {
  value: number;
  max?: number;
  label?: string;
  className?: string;
  tone?: 'brand' | 'emerald' | 'amber' | 'rose';
  height?: 'sm' | 'md';
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const tones = {
    brand: 'bg-gradient-to-r from-brand-500 to-violet-brand-500',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
  } as const;

  return (
    <div
      className={`w-full overflow-hidden rounded-full bg-slate-100 ${height === 'sm' ? 'h-1.5' : 'h-2.5'} ${className}`}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-500 ease-out ${tones[tone]}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function RadialScore({
  score,
  max,
  size = 148,
  caption,
  tone = '#4f46e5',
}: {
  score: number;
  max: number;
  size?: number;
  caption?: string;
  tone?: string;
}) {
  const pct = max > 0 ? Math.min(1, Math.max(0, score / max)) : 0;
  const stroke = size >= 130 ? 11 : 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${score} out of ${max}${caption ? `, ${caption}` : ''}`}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#eef2ff"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={tone}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct)}
          style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold leading-none text-slate-900">
          {Number.isInteger(score) ? score : score.toFixed(1)}
        </span>
        <span className="mt-1 text-xs font-medium text-slate-500">out of {max}</span>
      </div>
    </div>
  );
}
