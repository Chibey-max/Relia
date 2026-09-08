import type { CSSProperties } from 'react';

export interface TaskStep {
  label: string;
  detail?: string;
}

export function TaskSteps({ steps, current }: { steps: TaskStep[]; current: number }) {
  return (
    <ol className="task-stepper" aria-label="Task progress" data-reveal style={{ '--task-step-count': steps.length } as CSSProperties}>
      {steps.map((step, index) => {
        const state = index < current ? 'done' : index === current ? 'active' : 'pending';
        return (
          <li className={state} aria-current={state === 'active' ? 'step' : undefined} key={step.label}>
            <span className="task-stepper-mark" aria-hidden="true">{state === 'done' ? '✓' : String(index + 1).padStart(2, '0')}</span>
            <span><strong>{step.label}</strong>{step.detail && <small>{step.detail}</small>}</span>
          </li>
        );
      })}
    </ol>
  );
}
