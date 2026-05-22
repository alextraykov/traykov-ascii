import * as React from 'react';
import { CreditPill } from '@/components/composite/CreditPill';
import { CreditStateProvider, useCreditContext } from '@/contexts/CreditStateContext';
import { TooltipProvider } from '@/components/ui/Tooltip';
import type { CreditState } from '@/lib/useCreditState';
import { Frame, FrameChip, FrameChipGroup } from './Frame';

const STATES: { id: CreditState; label: string; credits: number; total: number }[] = [
  { id: 'healthy', label: 'Healthy', credits: 18.4, total: 25 },
  { id: 'warning', label: 'Warning', credits: 4.5, total: 25 },
  { id: 'low', label: 'Low', credits: 1.0, total: 25 },
  { id: 'depleted', label: 'Depleted', credits: 0, total: 25 },
];

function CreditPillDemo({ activeState }: { activeState: CreditState }) {
  const ctx = useCreditContext();
  const target = STATES.find((s) => s.id === activeState)!;

  // Sync the provider to the requested demo state whenever the chip changes.
  React.useEffect(() => {
    ctx.setCreditsRemaining(target.credits);
    ctx.setCreditsTotal(target.total);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeState]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
      <CreditPill />
      <span
        style={{
          fontFamily: 'var(--font-family-base)',
          fontSize: 'var(--font-size-xs)',
          color: 'var(--color-text-tertiary)',
        }}
      >
        Click the pill to open the popover
      </span>
    </div>
  );
}

export function CreditPillPreview() {
  const [state, setState] = React.useState<CreditState>('warning');
  const target = STATES.find((s) => s.id === state)!;

  return (
    <Frame
      title="CreditPill"
      subtitle="Ambient credit scoreboard. Always-on in the app header. Click to open the popover with balance animation, usage trend, and credit-source breakdown."
      stage="page"
      controls={
        <FrameChipGroup>
          {STATES.map((s) => (
            <FrameChip key={s.id} active={state === s.id} onClick={() => setState(s.id)}>
              {s.label}
            </FrameChip>
          ))}
        </FrameChipGroup>
      }
    >
      <CreditStateProvider
        key={`${target.credits}-${target.total}`}
        initialCredits={target.credits}
        initialTotal={target.total}
      >
        <TooltipProvider>
          <CreditPillDemo activeState={state} />
        </TooltipProvider>
      </CreditStateProvider>
    </Frame>
  );
}
