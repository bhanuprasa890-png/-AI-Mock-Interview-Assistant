import type { ReactNode } from 'react';

export function SectionTitle({
  eyebrow,
  title,
  description,
  align = 'center',
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: 'center' | 'left';
}) {
  return (
    <div className={align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      {eyebrow ? (
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-brand-600">{eyebrow}</p>
      ) : null}
      <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h2>
      {description ? (
        <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">{description}</p>
      ) : null}
    </div>
  );
}
