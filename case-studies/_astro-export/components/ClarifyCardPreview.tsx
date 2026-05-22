import * as React from 'react';
import { ClarifyCard, type ClarifyOption } from '@/components/composite/ClarifyCard';
import { Frame } from './Frame';

const INITIAL: ClarifyOption[] = [
  { id: 'o1', text: 'Email + password', selected: false },
  { id: 'o2', text: 'Google OAuth', selected: false },
  { id: 'o3', text: 'GitHub OAuth', selected: false },
  { id: 'o4', text: 'Magic link (passwordless)', selected: false },
];

export function ClarifyCardPreview() {
  const [options, setOptions] = React.useState<ClarifyOption[]>(INITIAL);
  const [confirmed, setConfirmed] = React.useState(false);
  const [customSubmission, setCustomSubmission] = React.useState<string | null>(null);

  const toggle = (id: string) => {
    setOptions((prev) =>
      prev.map((o) => (o.id === id ? { ...o, selected: !o.selected } : o)),
    );
  };

  const confirm = () => setConfirmed(true);

  const reset = () => {
    setOptions(INITIAL);
    setConfirmed(false);
    setCustomSubmission(null);
  };

  return (
    <Frame
      title="ClarifyCard"
      subtitle="Scoping questions before plan generation. Multi-select options or write something custom."
      stage="page"
      onReset={reset}
    >
      <div style={{ width: '100%', maxWidth: 520 }}>
        <ClarifyCard
          prompt="Before I plan the auth flow — which sign-in methods should I include?"
          options={options}
          confirmed={confirmed}
          onToggle={toggle}
          onConfirm={confirm}
          onCustomSubmit={(text) => setCustomSubmission(text)}
        />
        {customSubmission ? (
          <div
            style={{
              marginTop: 'var(--spacing-md)',
              padding: 'var(--spacing-sm) var(--spacing-md)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-bg-info-subtle)',
              border: '1px solid var(--color-border-info)',
              color: 'var(--color-text-info)',
              fontSize: 'var(--font-size-sm)',
            }}
          >
            Custom answer received: <em>{customSubmission}</em>
          </div>
        ) : null}
      </div>
    </Frame>
  );
}
