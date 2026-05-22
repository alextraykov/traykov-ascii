import * as React from 'react';
import { BackgroundGradientAnimation } from '@/components/ui/BackgroundGradientAnimation';
import { matchPalette } from '@/components/ui/BackgroundGradientAnimation/BackgroundGradientAnimation';
import { Frame, FrameChip } from './Frame';

const HINT_WORDS = ['dashboard', 'crm', 'booking', 'ecommerce', 'hr', 'inventory'];

export function BackgroundGradientPreview() {
  const [text, setText] = React.useState('');
  const [focused, setFocused] = React.useState(false);
  const palette = matchPalette(text);

  return (
    <Frame
      title="BackgroundGradientAnimation"
      subtitle="The orbs interpolate their palette based on what you type. Try a keyword like 'dashboard' or 'crm' — watch the colour shift."
      stage="page"
      controls={
        <div style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>
          {HINT_WORDS.map((w) => (
            <FrameChip
              key={w}
              active={text.toLowerCase().includes(w)}
              onClick={() => setText((prev) => (prev.toLowerCase().includes(w) ? prev : `${prev} ${w}`.trim()))}
            >
              {w}
            </FrameChip>
          ))}
        </div>
      }
      onReset={() => setText('')}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          minHeight: 360,
          borderRadius: 'var(--radius-lg, 12px)',
          overflow: 'hidden',
          border: '1px solid var(--color-border-light)',
        }}
      >
        <BackgroundGradientAnimation
          showOrbs
          isInputFocused={focused}
          inputText={text}
          firstColor={palette?.first}
          secondColor={palette?.second}
          thirdColor={palette?.third}
          fourthColor={palette?.fourth}
          fifthColor={palette?.fifth}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--spacing-lg)',
              padding: 'var(--spacing-2xl)',
              zIndex: 2,
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-family-display, var(--font-family-base))',
                fontSize: 'clamp(1.25rem, 3vw, 1.75rem)',
                fontWeight: 500,
                color: 'var(--color-text-primary)',
                textAlign: 'center',
                maxWidth: 420,
                lineHeight: 1.25,
              }}
            >
              From idea to done.
            </div>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Try typing 'build a sales crm'…"
              style={{
                width: '100%',
                maxWidth: 420,
                padding: '12px 16px',
                borderRadius: 'var(--radius-full)',
                border: '1px solid var(--color-border-light)',
                background: 'rgba(255, 255, 255, 0.72)',
                backdropFilter: 'blur(12px)',
                fontFamily: 'var(--font-family-base)',
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-primary)',
                outline: 'none',
              }}
            />
            {palette ? (
              <div
                style={{
                  fontFamily: 'var(--font-family-base)',
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-text-tertiary)',
                }}
              >
                Palette locked to <strong>{palette.label}</strong>
              </div>
            ) : (
              <div
                style={{
                  fontFamily: 'var(--font-family-base)',
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-text-tertiary)',
                }}
              >
                Default palette
              </div>
            )}
          </div>
        </BackgroundGradientAnimation>
      </div>
    </Frame>
  );
}
