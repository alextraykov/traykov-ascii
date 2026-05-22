import * as React from 'react';
import {
  PlanCard,
  type PlanData,
  type PlanStepData,
  type PlanStepStatus,
} from '@/components/composite/PlanCard';
import { Frame } from './Frame';

const STEPS_TEMPLATE: PlanStepData[] = [
  { id: 's1', label: 'Analyse existing schema', status: 'pending', description: 'Read table structure to plan changes.', estimatedDuration: '~5s', assignedAgent: 'Schema Agent' },
  { id: 's2', label: 'Create login form component', status: 'pending', description: 'Form with email + password + validation.', estimatedDuration: '~12s', assignedAgent: 'UI Agent' },
  { id: 's3', label: 'Set up OAuth providers', status: 'pending', description: 'Configure Google and GitHub flows.', estimatedDuration: '~8s', assignedAgent: 'Auth Agent' },
  { id: 's4', label: 'Add session management', status: 'pending', description: 'JWT storage and refresh logic.', estimatedDuration: '~15s', assignedAgent: 'Auth Agent' },
  { id: 's5', label: 'Build password reset flow', status: 'pending', description: 'Email link and new-password form.', estimatedDuration: '~10s', assignedAgent: 'Auth Agent' },
];

const MARKDOWN =
  'We will set up an OAuth-based login flow with session management.\n\n1. Create the auth service module\n2. Add OAuth provider configuration\n3. Build the login page component\n4. Wire up session management\n5. Add error handling and loading states';

export function PlanCardPreview() {
  const [plan, setPlan] = React.useState<PlanData | null>(null);
  const timeoutsRef = React.useRef<number[]>([]);

  const clearTimeouts = React.useCallback(() => {
    timeoutsRef.current.forEach((id) => window.clearTimeout(id));
    timeoutsRef.current = [];
  }, []);

  const addTimeout = React.useCallback((fn: () => void, ms: number) => {
    timeoutsRef.current.push(window.setTimeout(fn, ms));
  }, []);

  React.useEffect(() => clearTimeouts, [clearTimeouts]);

  const generate = () => {
    clearTimeouts();
    setPlan({
      id: 'preview-plan',
      title: 'Build login flow',
      description: 'Setting up authentication with OAuth and session management',
      status: 'generating-plan',
      markdownContent: '',
      steps: [],
    });
    const words = MARKDOWN.split(' ');
    words.forEach((_, i) => {
      addTimeout(() => {
        setPlan((prev) => (prev ? { ...prev, markdownContent: words.slice(0, i + 1).join(' ') } : prev));
        if (i === words.length - 1) {
          addTimeout(() => setPlan((p) => (p ? { ...p, status: 'plan-ready' } : p)), 400);
        }
      }, 200 + i * 60);
    });
  };

  const approve = () => {
    clearTimeouts();
    setPlan((p) => (p ? { ...p, status: 'generating-steps', steps: [] } : p));
    const steps = STEPS_TEMPLATE.map((s) => ({ ...s, id: `preview-${s.id}` }));
    steps.forEach((step, i) => {
      addTimeout(() => {
        setPlan((p) => (p ? { ...p, steps: [...p.steps, step] } : p));
        if (i === steps.length - 1) {
          addTimeout(() => setPlan((p) => (p ? { ...p, status: 'draft' } : p)), 400);
        }
      }, 800 + i * 400);
    });
  };

  const execute = () => {
    clearTimeouts();
    setPlan((p) => {
      if (!p) return p;
      return {
        ...p,
        status: 'executing',
        steps: p.steps.map((s, i) => (i === 0 ? { ...s, status: 'active' as PlanStepStatus } : s)),
      };
    });
    STEPS_TEMPLATE.forEach((_, i) => {
      addTimeout(() => {
        setPlan((p) => {
          if (!p) return p;
          const next = p.steps.map((s, j) => {
            if (j === i) return { ...s, status: 'completed' as PlanStepStatus };
            if (j === i + 1) return { ...s, status: 'active' as PlanStepStatus };
            return s;
          });
          const allDone = i === STEPS_TEMPLATE.length - 1;
          return {
            ...p,
            status: allDone ? 'completed' : 'executing',
            steps: allDone
              ? next.map((s) => ({ ...s, status: 'completed' as PlanStepStatus }))
              : next,
          };
        });
      }, (i + 1) * 900);
    });
  };

  const reset = () => {
    clearTimeouts();
    setPlan(null);
  };

  return (
    <Frame
      title="PlanCard"
      subtitle="Two-phase review loop: markdown plan → step list → execution. Click Generate to watch the lifecycle."
      stage="page"
      onReset={reset}
      controls={
        <button
          type="button"
          className="cs-frame__chip cs-frame__chip--active"
          onClick={generate}
          disabled={plan !== null && plan.status !== 'completed' && plan.status !== 'cancelled'}
        >
          {plan ? 'Running…' : 'Generate plan'}
        </button>
      }
    >
      <div style={{ width: '100%', maxWidth: 560 }}>
        {plan ? (
          <PlanCard
            plan={plan}
            onApprove={approve}
            onExecute={execute}
            onReview={() => { /* no-op in preview */ }}
            onReviseSubmit={approve}
            onCancel={() => {
              clearTimeouts();
              setPlan((p) => (p ? { ...p, status: 'cancelled' } : p));
            }}
            onPause={() => {
              clearTimeouts();
              setPlan((p) => (p ? { ...p, status: 'paused' } : p));
            }}
            onResume={() => setPlan((p) => (p ? { ...p, status: 'executing' } : p))}
            onRetryStep={(stepId) => {
              setPlan((p) => {
                if (!p) return p;
                return {
                  ...p,
                  steps: p.steps.map((s) =>
                    s.id === stepId ? { ...s, status: 'active' as PlanStepStatus } : s
                  ),
                };
              });
            }}
            onSkipStep={(stepId) => {
              setPlan((p) => {
                if (!p) return p;
                return {
                  ...p,
                  steps: p.steps.map((s) =>
                    s.id === stepId ? { ...s, status: 'completed' as PlanStepStatus } : s
                  ),
                };
              });
            }}
          />
        ) : (
          <div
            style={{
              padding: 'var(--spacing-xl)',
              textAlign: 'center',
              color: 'var(--color-text-tertiary)',
              fontSize: 'var(--font-size-sm)',
              border: '1px dashed var(--color-border-light)',
              borderRadius: 'var(--radius-lg, 12px)',
              minWidth: 300,
            }}
          >
            Click <strong>Generate plan</strong> to start the lifecycle
          </div>
        )}
      </div>
    </Frame>
  );
}
