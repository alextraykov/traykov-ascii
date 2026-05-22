import * as React from 'react';
import { BlurText } from '@/components/ui/BlurText';
import { Frame, FrameChip, FrameChipGroup } from './Frame';

const STAGGER_OPTIONS: { id: string; label: string; value: number }[] = [
  { id: 'fast', label: 'Fast · 60ms', value: 60 },
  { id: 'default', label: 'Default · 120ms', value: 120 },
  { id: 'slow', label: 'Slow · 240ms', value: 240 },
];

export function BlurTextPreview() {
  const [stagger, setStagger] = React.useState<number>(120);
  const [mountKey, setMountKey] = React.useState(0);

  const replay = () => setMountKey((k) => k + 1);

  return (
    <Frame
      title="BlurText cascade"
      subtitle="Word-by-word blur-reveal. The 'pave.' word swaps in as an SVG wordmark. Tap Replay to watch it again."
      stage="page"
      onReset={replay}
      controls={
        <>
          <FrameChipGroup>
            {STAGGER_OPTIONS.map((o) => (
              <FrameChip key={o.id} active={stagger === o.value} onClick={() => setStagger(o.value)}>
                {o.label}
              </FrameChip>
            ))}
          </FrameChipGroup>
          <button
            type="button"
            className="cs-frame__chip cs-frame__chip--active"
            onClick={replay}
          >
            Replay
          </button>
        </>
      }
    >
      <div
        style={{
          width: '100%',
          minHeight: 180,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'var(--spacing-xl)',
        }}
      >
        <BlurText
          key={`${mountKey}-${stagger}`}
          text="From idea to done with pave."
          highlightWords={['pave.']}
          staggerDelay={stagger}
        />
      </div>
    </Frame>
  );
}
