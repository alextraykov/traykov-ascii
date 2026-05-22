import * as React from 'react';
import { SpacingControls, parseSpacingValues } from '@/components/composite/SpacingControls';
import type { SpacingValues } from '@/components/composite/InspectorToolbar/types';
import { Frame } from './Frame';

const INITIAL_MARGIN: SpacingValues = { top: '16px', right: '24px', bottom: '16px', left: '24px' };
const INITIAL_PADDING: SpacingValues = { top: '12px', right: '16px', bottom: '12px', left: '16px' };

export function SpacingControlsPreview() {
  const [margin, setMargin] = React.useState<SpacingValues>(INITIAL_MARGIN);
  const [padding, setPadding] = React.useState<SpacingValues>(INITIAL_PADDING);
  const [active, setActive] = React.useState<{ layer: 'margin' | 'padding'; side: string } | null>(null);

  const reset = () => {
    setMargin(INITIAL_MARGIN);
    setPadding(INITIAL_PADDING);
    setActive(null);
  };

  const m = parseSpacingValues(margin);
  const p = parseSpacingValues(padding);

  return (
    <Frame
      title="SpacingControls"
      subtitle="Box-model diagram. Drag a directional label to scrub, or click to type. The live preview on the right applies your values to a real element."
      stage="page"
      onReset={reset}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(240px, 1fr) minmax(220px, 1fr)',
          gap: 'var(--spacing-xl)',
          alignItems: 'start',
          width: '100%',
          maxWidth: 640,
        }}
      >
        <SpacingControls
          margin={margin}
          padding={padding}
          onMarginChange={setMargin}
          onPaddingChange={setPadding}
          onActiveSideChange={setActive}
        />
        {/* Live-result canvas */}
        <div
          style={{
            borderRadius: 'var(--radius-md)',
            border: '1px dashed var(--color-border-medium)',
            background:
              active?.layer === 'margin'
                ? 'rgba(255, 180, 0, 0.08)'
                : 'var(--color-bg-page)',
            padding: `${m.top}px ${m.right}px ${m.bottom}px ${m.left}px`,
            transition: 'background var(--motion-duration-fast) var(--motion-ease-default)',
            minHeight: 220,
          }}
        >
          <div
            style={{
              background:
                active?.layer === 'padding'
                  ? 'rgba(0, 120, 255, 0.08)'
                  : 'var(--color-bg-surface)',
              border: '1px solid var(--color-border-light)',
              borderRadius: 'var(--radius-md)',
              padding: `${p.top}px ${p.right}px ${p.bottom}px ${p.left}px`,
              transition: 'background var(--motion-duration-fast) var(--motion-ease-default)',
            }}
          >
            <div
              style={{
                background: 'var(--color-accent-primary-alpha)',
                color: 'var(--color-accent-primary)',
                padding: 'var(--spacing-sm) var(--spacing-md)',
                borderRadius: 'var(--radius-sm)',
                textAlign: 'center',
                fontFamily: 'var(--font-family-base)',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 500,
              }}
            >
              Live element
            </div>
          </div>
        </div>
      </div>
    </Frame>
  );
}
