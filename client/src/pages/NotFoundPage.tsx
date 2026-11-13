import { Compass, Home } from 'lucide-react';
import { LinkButton } from '../components/ui/Button';

export function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-brand-50">
        <Compass className="size-8 text-brand-600" aria-hidden />
      </div>
      <p className="mt-6 text-sm font-bold uppercase tracking-[0.2em] text-brand-600">404</p>
      <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
        This page took a different turn
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        The page you were looking for does not exist. Head back home or start a new mock interview.
      </p>
      <div className="mt-7 flex flex-col gap-2 sm:flex-row">
        <LinkButton to="/" icon={<Home className="size-4" aria-hidden />}>
          Back home
        </LinkButton>
        <LinkButton to="/setup" variant="secondary">
          Start an interview
        </LinkButton>
      </div>
    </div>
  );
}
