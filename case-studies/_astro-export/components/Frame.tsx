import * as React from 'react';
import { Moon, Sun, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import './Frame.css';

export interface FrameProps {
  /** Preview title, displayed in the chrome */
  title: string;
  /** Optional subtitle line */
  subtitle?: string;
  /** State controls rendered on the right side of the chrome header */
  controls?: React.ReactNode;
  /** Optional reset handler — shows a reset icon button when provided */
  onReset?: () => void;
  /** Whether to show a theme toggle in the chrome (default: true) */
  showThemeToggle?: boolean;
  /** The preview content */
  children: React.ReactNode;
  /** Force a specific background for the preview stage (default: inherits) */
  stage?: 'neutral' | 'page' | 'dark';
  /** Additional class on the root */
  className?: string;
}

/**
 * Frame is the shared chrome wrapper around every case-study preview.
 * It standardises: title bar, state controls slot, reset button, theme toggle,
 * and the stage area where the real component mounts.
 *
 * The theme toggle is purely local — it flips the .dark class on the frame
 * root rather than document.documentElement so previews can coexist with
 * a parent portfolio shell that has its own theme controls.
 */
export function Frame({
  title,
  subtitle,
  controls,
  onReset,
  showThemeToggle = true,
  children,
  stage = 'neutral',
  className,
}: FrameProps) {
  const [isDark, setIsDark] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return document.documentElement.classList.contains('dark');
  });

  const rootRef = React.useRef<HTMLDivElement>(null);

  // Sync initial theme from the document when mounted on the client
  React.useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  // Apply theme locally to the frame root so each preview is independent.
  React.useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    el.classList.toggle('dark', isDark);
  }, [isDark]);

  return (
    <div
      ref={rootRef}
      className={cn('cs-frame', `cs-frame--stage-${stage}`, className)}
      data-dark={isDark}
    >
      <header className="cs-frame__header">
        <div className="cs-frame__title-block">
          <h3 className="cs-frame__title">{title}</h3>
          {subtitle ? <p className="cs-frame__subtitle">{subtitle}</p> : null}
        </div>
        <div className="cs-frame__actions">
          {controls ? <div className="cs-frame__controls">{controls}</div> : null}
          {onReset ? (
            <button
              type="button"
              className="cs-frame__icon-button"
              onClick={onReset}
              aria-label="Reset preview"
              title="Reset"
            >
              <RotateCcw size={14} />
            </button>
          ) : null}
          {showThemeToggle ? (
            <button
              type="button"
              className="cs-frame__icon-button"
              onClick={() => setIsDark((d) => !d)}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              title={isDark ? 'Switch to light' : 'Switch to dark'}
            >
              {isDark ? <Sun size={14} /> : <Moon size={14} />}
            </button>
          ) : null}
        </div>
      </header>
      <div className="cs-frame__stage">{children}</div>
    </div>
  );
}

/** A small inline chip used for state selector controls. */
export interface FrameChipProps {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

export function FrameChip({ active, onClick, children }: FrameChipProps) {
  return (
    <button
      type="button"
      className={cn('cs-frame__chip', active && 'cs-frame__chip--active')}
      onClick={onClick}
      aria-pressed={!!active}
    >
      {children}
    </button>
  );
}

export function FrameChipGroup({ children }: { children: React.ReactNode }) {
  return <div className="cs-frame__chip-group">{children}</div>;
}
