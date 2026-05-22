import * as React from 'react';
import {
  SubagentBubble,
  type SubagentStatus,
  type TimelineEntry,
  type SubagentMetrics,
} from '@/components/composite/SubagentBubble';
import { Frame, FrameChip, FrameChipGroup } from './Frame';

const TIMELINE_RUNNING: TimelineEntry[] = [
  { id: '1', type: 'thought', content: 'Starting task analysis' },
  { id: '2', type: 'thought', content: 'Identified 3 subtasks to complete' },
  { id: '3', type: 'edit', content: 'Creating component structure', detail: 'Feature.tsx' },
  { id: '4', type: 'edit', content: 'Adding styles', detail: 'Feature.css' },
];

const TIMELINE_COMPLETE: TimelineEntry[] = [
  ...TIMELINE_RUNNING,
  { id: '5', type: 'action', content: 'All tasks completed successfully' },
];

const METRICS: SubagentMetrics = {
  duration: '3.2s',
  linesChanged: 147,
  filesModified: 4,
  creditsUsed: 0.12,
};

const STATUSES: { id: SubagentStatus; label: string }[] = [
  { id: 'idle', label: 'Idle' },
  { id: 'running', label: 'Running' },
  { id: 'completed', label: 'Completed' },
  { id: 'error', label: 'Error' },
];

export function SubagentBubblePreview() {
  const [status, setStatus] = React.useState<SubagentStatus>('running');

  const timeline = status === 'completed' || status === 'error'
    ? TIMELINE_COMPLETE
    : status === 'idle'
      ? [{ id: '1', type: 'thought' as const, content: 'Waiting to start…' }]
      : TIMELINE_RUNNING;

  return (
    <Frame
      title="SubagentBubble"
      subtitle="Expandable AI subagent timeline. Click the header to expand and see the work trace."
      controls={
        <FrameChipGroup>
          {STATUSES.map((s) => (
            <FrameChip key={s.id} active={status === s.id} onClick={() => setStatus(s.id)}>
              {s.label}
            </FrameChip>
          ))}
        </FrameChipGroup>
      }
      stage="page"
    >
      <div style={{ width: '100%', maxWidth: 520 }}>
        <SubagentBubble
          id="preview-subagent"
          name="Schema agent"
          description="Analysing the Orders table structure"
          status={status}
          timeline={timeline}
          metrics={status === 'completed' ? METRICS : undefined}
          defaultExpanded={status === 'running'}
        />
      </div>
    </Frame>
  );
}
