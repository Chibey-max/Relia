'use client';

import { useState } from 'react';
import { ExperienceMode } from '@/components/ExperienceMode';
import { MaterialIcon } from '@/components/MaterialIcon';
import { DEMO_DISCLOSURE } from '@/lib/demoData';

export interface ProcessJourneyStep {
  number: string;
  title: string;
  body: string;
  meta: string;
}

type ExampleMode = 'progress' | 'complete' | 'failed';
type StepState = 'pending' | 'active' | 'complete' | 'failed';
type ConnectorState = Exclude<StepState, 'pending'> | 'pending' | 'none';

const EXAMPLES: Array<{ mode: ExampleMode; label: string }> = [
  { mode: 'progress', label: 'In progress' },
  { mode: 'complete', label: 'All complete' },
  { mode: 'failed', label: 'Proof refused' },
];

const MODE_COPY: Record<ExampleMode, { title: string; consequence: string }> = {
  progress: {
    title: 'Proof is being checked',
    consequence: 'The payment and shop confirmation are secured; the title waits for the proof result.',
  },
  complete: {
    title: 'The title advances',
    consequence: 'All four stages agree, so the next title slice becomes live and a public receipt is available.',
  },
  failed: {
    title: 'The title stays unchanged',
    consequence: 'The proof was refused before any title update. The source payment record remains where it settled.',
  },
};

const STEP_INSIGHTS = [
  'The source transaction fixes the asset, slice, amount, buyer, and payer into one inspectable payment record.',
  'The acknowledgement cites that exact payment transaction, so the shop cannot confirm a different installment.',
  'The verification step rebuilds the expected relationship between both records and refuses incomplete evidence.',
  'One accepted pair can fill one slice only. The resulting receipt remains public without moving the payment funds.',
];

const STATE_MEANING: Record<StepState, string> = {
  pending: 'Waiting',
  active: 'In progress',
  complete: 'Complete',
  failed: 'Refused',
};

function stateFor(mode: ExampleMode, index: number): StepState {
  if (mode === 'complete') return 'complete';
  if (index < 2) return 'complete';
  if (index === 2) return mode === 'failed' ? 'failed' : 'active';
  return 'pending';
}

function stateSymbol(state: StepState): string {
  if (state === 'complete') return 'check';
  if (state === 'failed') return 'close';
  if (state === 'active') return 'radio_button_checked';
  return 'radio_button_unchecked';
}

function connectorFor(current: StepState, next?: StepState): ConnectorState {
  if (!next) return 'none';
  if (next === 'failed') return 'failed';
  if (next === 'active') return 'active';
  if (current === 'complete' && next === 'complete') return 'complete';
  return 'pending';
}

export function ProcessJourney({ steps }: { steps: ProcessJourneyStep[] }) {
  const [mode, setMode] = useState<ExampleMode>('progress');
  const [selectedStep, setSelectedStep] = useState(2);
  const [announcement, setAnnouncement] = useState('');
  const states = steps.map((_, index) => stateFor(mode, index));
  const selected = steps[selectedStep];
  const selectedState = states[selectedStep];
  const modeCopy = MODE_COPY[mode];

  const selectMode = (nextMode: ExampleMode, label: string) => {
    setMode(nextMode);
    setAnnouncement(`${label} preview selected. ${MODE_COPY[nextMode].title}.`);
  };

  return (
    <div className="process-journey" data-scroll-story="process">
      <div className="process-example-disclosure" data-scroll-item>
        <ExperienceMode>{DEMO_DISCLOSURE}</ExperienceMode>
        <span>Controls below preview possible states; they do not query or change a contract.</span>
      </div>
      <div className="process-example-toolbar" role="group" aria-label="Preview a process state" data-scroll-item>
        <span>Preview state</span>
        {EXAMPLES.map((example) => (
          <button
            type="button"
            aria-pressed={mode === example.mode}
            onClick={() => selectMode(example.mode, example.label)}
            key={example.mode}
          >
            {example.label}
          </button>
        ))}
      </div>
      <div className="process-mode-consequence" data-mode={mode}>
        <strong>{modeCopy.title}</strong>
        <span>{modeCopy.consequence}</span>
      </div>
      <span className="sr-announcement" role="status" aria-live="polite" aria-atomic="true">{announcement}</span>
      <div className="process-track">
        <ol className="process-grid">
          {steps.map((step, index) => {
            const state = states[index];
            const connector = connectorFor(state, states[index + 1]);
            return (
              <li
                className="process-card"
                data-state={state}
                data-connector={connector}
                data-selected={selectedStep === index}
                aria-current={state === 'active' ? 'step' : undefined}
                data-scroll-item
                key={step.number}
              >
                <button
                  className="process-card-trigger"
                  type="button"
                  aria-pressed={selectedStep === index}
                  aria-expanded={selectedStep === index}
                  aria-controls="process-step-detail"
                  aria-describedby={selectedStep === index ? 'process-step-detail' : undefined}
                  onClick={() => setSelectedStep(index)}
                >
                  <span className="process-top">
                    <span className="process-number">{step.number}</span>
                    <span className="process-check" aria-hidden="true"><MaterialIcon name={stateSymbol(state)} /></span>
                    <span className="process-state-label">{state}</span>
                  </span>
                  <span className="process-card-title">{step.title}</span>
                  <span className="process-card-body">{step.body}</span>
                  <span className="process-meta">{step.meta}</span>
                </button>
              </li>
            );
          })}
          <li
            className="process-step-detail"
            id="process-step-detail"
            data-step={selectedStep + 1}
            data-state={selectedState}
            role="note"
            key={`detail-${selectedStep}`}
          >
            <span className="mini-title">STEP {selected?.number} | {STATE_MEANING[selectedState]}</span>
            <strong>{selected?.title}</strong>
            <p>{STEP_INSIGHTS[selectedStep]}</p>
            <span className="process-detail-meta">{selected?.meta}</span>
          </li>
        </ol>
      </div>
    </div>
  );
}
