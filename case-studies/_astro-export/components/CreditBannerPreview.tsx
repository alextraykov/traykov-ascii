import * as React from 'react';
import { CreditBanner } from '@/components/composite/CreditBanner';
import { CreditStateProvider } from '@/contexts/CreditStateContext';
import { TooltipProvider } from '@/components/ui/Tooltip';
import type { CreditState } from '@/lib/useCreditState';
import { Frame, FrameChip, FrameChipGroup } from './Frame';

const STATES: { id: CreditState; label: string; credits: number; total: number }[] = [
  { id: 'warning', label: 'Warning (≤20%)', credits: 4.5, total: 25 },
  { id: 'low', label: 'Low (≤5%)', credits: 1.0, total: 25 },
  { id: 'depleted', label: 'Depleted (0)', credits: 0, total: 25 },
];

export function CreditBannerPreview() {
  const [state, setState] = React.useState<CreditState>('warning');
  const [showRenewed, setShowRenewed] = React.useState(false);
  const target = STATES.find((s) => s.id === state)!;

  return (
    <Frame
      title="CreditBanner"
      subtitle="Inline nudge above the composer. State-driven icon, message, CTA. Dismissible except at depleted — dismissal re-prompts on escalation."
      stage="page"
      controls={
        <>
          <FrameChipGroup>
            {STATES.map((s) => (
              <FrameChip
                key={s.id}
                active={state === s.id && !showRenewed}
                onClick={() => {
                  setState(s.id);
                  setShowRenewed(false);
                }}
              >
                {s.label}
              </FrameChip>
            ))}
          </FrameChipGroup>
          <FrameChip active={showRenewed} onClick={() => setShowRenewed((v) => !v)}>
            Renewed
          </FrameChip>
        </>
      }
    >
      <CreditStateProvider
        key={`${target.credits}-${target.total}-${showRenewed}`}
        initialCredits={target.credits}
        initialTotal={target.total}
      >
        <TooltipProvider>
          <div style={{ width: '100%', maxWidth: 620 }}>
            <CreditBanner showRenewed={showRenewed} />
          </div>
        </TooltipProvider>
      </CreditStateProvider>
    </Frame>
  );
}
