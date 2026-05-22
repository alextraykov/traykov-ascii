import { TemplateEditor } from '@/components/composite/TemplateEditor';
import { Frame } from './Frame';

export function TemplateEditorPreview() {
  return (
    <Frame
      title="TemplateEditor"
      subtitle="Block editor with keyboard composers. Try typing / for blocks, {{ for variables, and Space on an empty line for AI suggestions."
      stage="page"
    >
      <div
        style={{
          width: '100%',
          minHeight: 420,
          maxWidth: 720,
          borderRadius: 'var(--radius-lg, 12px)',
          border: '1px solid var(--color-border-light)',
          background: 'var(--color-bg-input)',
          overflow: 'hidden',
        }}
      >
        <TemplateEditor placeholder="Start typing your email template…" />
      </div>
    </Frame>
  );
}
