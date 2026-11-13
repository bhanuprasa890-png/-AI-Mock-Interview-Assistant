import { History, Menu, Sparkles, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { buttonClasses } from '../ui/Button';

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/setup', label: 'New interview' },
  { to: '/history', label: 'History' },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  // Close the mobile sheet on navigation.
  useEffect(() => setOpen(false), [location.pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" className="group flex items-center gap-2.5 rounded-lg" aria-label="InterviewMate AI home">
          <span className="gradient-surface flex size-9 items-center justify-center rounded-xl shadow-sm shadow-brand-600/30 transition group-hover:scale-105">
            <Sparkles className="size-5 text-white" aria-hidden />
          </span>
          <span className="text-[15px] font-bold tracking-tight text-slate-900 sm:text-base">
            InterviewMate <span className="gradient-text">AI</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `rounded-lg px-3.5 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden md:block">
          <Link
            to="/setup"
            className={buttonClasses('primary', 'sm', 'shadow-sm shadow-brand-600/20')}
          >
            Start Interview
          </Link>
        </div>

        <button
          type="button"
          className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 md:hidden"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
        </button>
      </div>

      {open ? (
        <div id="mobile-nav" className="animate-fade-in border-t border-slate-200 bg-white md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3" aria-label="Mobile">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-700 hover:bg-slate-100'
                  }`
                }
              >
                {link.to === '/history' ? <History className="size-4" aria-hidden /> : null}
                {link.label}
              </NavLink>
            ))}
            <Link to="/setup" className={buttonClasses('primary', 'md', 'mt-2 w-full')}>
              Start Interview
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
