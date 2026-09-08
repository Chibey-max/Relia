'use client';

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { DrawnArrow, Stamp } from '@/components/ui';
import { ExperienceMode } from '@/components/ExperienceMode';
import { DEMO_DISCLOSURE } from '@/lib/demoData';
import { motionIsReduced } from '@/lib/interactionMotion';

type HeroStage = {
  label: string;
  icon?: string;
  title: string;
  summary: string;
  result?: string;
  explanation: string;
  explanationTitle: string;
  className: string;
};

const STAGES: readonly HeroStage[] = [
  {
    label: 'Installment',
    icon: '₦',
    title: '40.00 USDC sent',
    summary: 'Payment 04 · Generator',
    result: 'Recorded',
    explanation: 'The buyer approves one installment. The payment settles on Sepolia and stays there.',
    explanationTitle: 'The payment stays on its source chain',
    className: 'proof-payment',
  },
  {
    label: 'Shop check',
    icon: '✓',
    title: 'Payment confirmed',
    summary: 'The shop confirms the same installment.',
    result: 'Matched',
    explanation: 'The shop acknowledges the exact payment, giving both sides the same source record.',
    explanationTitle: 'The shop confirms the same fact',
    className: 'proof-ack',
  },
  {
    label: 'Proof accepted',
    title: 'Both records agree',
    summary: 'Ready to update the title.',
    result: 'Accepted',
    explanation: 'Relia verifies that the payment and acknowledgement belong together without moving the money.',
    explanationTitle: 'The two records are proven together',
    className: 'proof-accepted',
  },
  {
    label: 'New title slice',
    title: '04 of 12',
    summary: 'Owned, visible, and easy to check.',
    explanation: 'The accepted proof fills the next title slice and creates a public receipt anyone can inspect.',
    explanationTitle: 'The buyer receives durable progress',
    className: 'proof-title',
  },
];

const SEQUENCE_DELAY = 720;

export function HeroProof() {
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const timersRef = useRef<number[]>([]);
  const autoPlayedRef = useRef(false);
  const [activeStage, setActiveStage] = useState(STAGES.length - 1);
  const [direction, setDirection] = useState<'forward' | 'backward'>('backward');
  const [advancing, setAdvancing] = useState(false);
  const [playing, setPlaying] = useState(false);

  const clearSequence = useCallback(() => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
  }, []);

  const playSequence = useCallback(() => {
    clearSequence();
    autoPlayedRef.current = true;
    setPlaying(true);
    setAdvancing(false);
    setDirection('backward');
    setActiveStage(0);

    STAGES.slice(1).forEach((_, offset) => {
      const stageIndex = offset + 1;
      const timer = window.setTimeout(() => {
        setDirection('forward');
        setAdvancing(true);
        setActiveStage(stageIndex);
        if (stageIndex === STAGES.length - 1) setPlaying(false);
      }, stageIndex * SEQUENCE_DELAY);
      timersRef.current.push(timer);
    });
  }, [clearSequence]);

  const selectStage = (index: number) => {
    if (index === activeStage && !playing) return;
    autoPlayedRef.current = true;
    clearSequence();
    const movesForward = index > activeStage;
    setDirection(movesForward ? 'forward' : 'backward');
    setAdvancing(movesForward);
    setPlaying(false);
    setActiveStage(index);
  };

  const handleStageKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | undefined;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (index + 1) % STAGES.length;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (index - 1 + STAGES.length) % STAGES.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = STAGES.length - 1;
    if (nextIndex === undefined) return;
    event.preventDefault();
    buttonRefs.current[nextIndex]?.focus();
  };

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    root.dataset.motionReady = 'true';
    if (motionIsReduced()) {
      root.dataset.entered = 'true';
      return () => { delete root.dataset.motionReady; delete root.dataset.entered; };
    }

    const enter = () => {
      root.dataset.entered = 'true';
      if (!autoPlayedRef.current && !document.hidden) playSequence();
    };

    if (typeof IntersectionObserver === 'undefined') {
      enter();
      return () => { clearSequence(); delete root.dataset.motionReady; delete root.dataset.entered; };
    }

    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      enter();
    }, { threshold: 0.24 });
    observer.observe(root);

    return () => {
      observer.disconnect();
      clearSequence();
      delete root.dataset.motionReady;
      delete root.dataset.entered;
    };
  }, [clearSequence, playSequence]);

  const selected = STAGES[activeStage];

  return (
    <div
      ref={rootRef}
      className="hero-proof"
      data-active-stage={activeStage + 1}
      data-direction={direction}
      data-advancing={advancing}
      role="region"
      aria-labelledby="hero-proof-title"
      aria-describedby="hero-proof-instructions"
      data-hero-reveal
    >
      <h2 className="sr-only" id="hero-proof-title">How an installment becomes a new title slice</h2>
      <p className="sr-only" id="hero-proof-instructions">Choose a stage with Tab or the arrow keys. Use Replay story to run the sequence again.</p>
      <div className="hero-proof-toolbar">
        <div className="hero-proof-mode">
          <ExperienceMode>{DEMO_DISCLOSURE}</ExperienceMode>
          <span className="drawn-note hero-proof-note">choose a step, follow the proof</span>
        </div>
        <button
          className="hero-proof-replay"
          type="button"
          onClick={playSequence}
          aria-label="Replay the payment-to-title story"
          aria-busy={playing || undefined}
          data-playing={playing || undefined}
        >
          <span aria-hidden="true">↻</span>{playing ? 'Playing…' : 'Replay story'}
        </button>
      </div>
      <DrawnArrow className="drawn-arrow" />
      <ol className="hero-proof-flow" aria-label="Payment-to-title stages">
        {STAGES.map((stage, index) => {
          const state = index < activeStage ? 'complete' : index === activeStage ? 'active' : 'pending';
          const connector = index < activeStage ? 'complete' : 'pending';
          return (
            <li className="proof-stage-shell" data-state={state} data-connector={connector} key={stage.label}>
              <button
                ref={(node) => { buttonRefs.current[index] = node; }}
                type="button"
                className={`proof-paper proof-stage ${stage.className}`}
                aria-pressed={index === activeStage}
                aria-describedby={index === activeStage ? 'hero-proof-explanation' : undefined}
                onClick={() => selectStage(index)}
                onFocus={() => selectStage(index)}
                onKeyDown={(event) => handleStageKeyDown(event, index)}
              >
                {index < 2 && (
                  <span className="proof-paper-head"><span className="proof-icon">{stage.icon}</span><span className="mono">{stage.label}</span></span>
                )}
                {index === 2 && <><Stamp tone="attention" className="stamp">CHECKED</Stamp><span className="mono proof-overline">{stage.label}</span></>}
                {index === 3 && <><Stamp className="stamp">✓ LIVE</Stamp><span className="mono proof-overline">{stage.label}</span></>}
                <strong>{stage.title}</strong>
                {index === 3 && (
                  <span className="slice-progress" role="img" aria-label="Four of twelve title slices complete">
                    {Array.from({ length: 12 }, (_, sliceIndex) => <i className={sliceIndex < 4 ? 'filled' : ''} key={sliceIndex} />)}
                  </span>
                )}
                <span className="proof-stage-summary">{stage.summary}</span>
                {index < 3 && <span className="proof-stage-result">{stage.result}</span>}
              </button>
              {index < STAGES.length - 1 && <span className="proof-stage-connector" aria-hidden="true">→</span>}
            </li>
          );
        })}
      </ol>
      <div className="hero-proof-explanation" id="hero-proof-explanation">
        <span className="mini-title">STEP {String(activeStage + 1).padStart(2, '0')}</span>
        <div>
          <strong>{selected.explanationTitle}</strong>
          <p>{selected.explanation}</p>
        </div>
      </div>
    </div>
  );
}
