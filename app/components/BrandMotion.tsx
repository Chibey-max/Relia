'use client';

import { useEffect, useRef } from 'react';
import type Matter from 'matter-js';
import { MaterialIcon } from '@/components/MaterialIcon';

const REFUSALS = [
  'NOTSUCCESSFUL',
  'REL1BADVERSION',
  'UNDERPAID',
  'ACKDOESNOTCITEPAYMENT',
  'ALREADYCONSUMED',
  'WINDOWCLOSED',
  'RECLAIMBLOCKEDLIVE',
  'RECLAIMBLOCKEDDISPUTED',
  'SOULBOUND',
  'EVENTNOTFOUND',
];

const DISC_COUNT = 16;

function MotionIcon({ index }: { index: number }) {
  const icons = ['check', 'warning', 'close', 'keyboard_return', 'schedule', 'dashboard', 'link', 'receipt_long'];
  return <MaterialIcon name={icons[index % icons.length]} />;
}

export function BrandMotion() {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const discRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    if (!section || !canvas) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
    if (reduceMotion || saveData || typeof IntersectionObserver === 'undefined' || typeof ResizeObserver === 'undefined') {
      section.dataset.inView = 'true';
      return;
    }
    section.dataset.motion = 'ready';

    let cancelled = false;
    let loading = false;
    let teardownPhysics = () => {};

    const showStaticFallback = () => {
      delete section.dataset.motion;
      delete section.dataset.physics;
      section.dataset.inView = 'true';
    };

    const loadPhysics = async () => {
    const { default: MatterRuntime } = await import('matter-js');
    if (cancelled) return;
    const { Engine, Runner, Bodies, Body, Composite, Mouse, MouseConstraint, Events } = MatterRuntime;
    let engine: Matter.Engine | null = null;
    let runner: Matter.Runner | null = null;
    let mouseConstraint: Matter.MouseConstraint | null = null;
    let bodies: Matter.Body[] = [];
    let walls: Matter.Body[] = [];
    let active = false;
    let started = false;
    let resizeFrame = 0;
    let visibleInViewport = false;
    let removeKeyboardNudge = () => {};
    let removeMatterEvents = () => {};
    let lastDiscPaint = 0;
    let mouse: Matter.Mouse | null = null;

    const syncDisc = (body: Matter.Body) => {
      const element = discRefs.current[body.plugin.discIndex as number];
      if (!element) return;
      const half = body.circleRadius ?? 0;
      element.style.transform = `translate3d(${body.position.x - half}px, ${body.position.y - half}px, 0) rotate(${body.angle}rad)`;
    };

    const makeWalls = (width: number, height: number) => {
      const floor = height - 36;
      return [
        Bodies.rectangle(width / 2, -100, width, 200, { isStatic: true }),
        Bodies.rectangle(width / 2, floor + 100, width, 200, { isStatic: true }),
        Bodies.rectangle(-100, height / 2, 200, height, { isStatic: true }),
        Bodies.rectangle(width + 100, height / 2, 200, height, { isStatic: true }),
      ];
    };

    const resize = () => {
      if (!engine) return;
      const width = section.clientWidth;
      const height = section.clientHeight;
      canvas.width = width;
      canvas.height = height;
      Composite.remove(engine.world, walls);
      walls = makeWalls(width, height);
      Composite.add(engine.world, walls);
      bodies.forEach((body) => {
        Body.setPosition(body, {
          x: Math.max(36, Math.min(width - 36, body.position.x)),
          y: Math.max(36, Math.min(height - 76, body.position.y)),
        });
      });
    };

    const start = () => {
      if (started) return;
      started = true;
      section.dataset.inView = 'true';

      const width = section.clientWidth;
      const height = section.clientHeight;
      const size = width < 640 ? 64 : 76;
      const constrainedDevice = typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency <= 4;
      const bodyCount = width < 640 || constrainedDevice ? 10 : DISC_COUNT;
      const floor = height - 36;

      discRefs.current.forEach((element, index) => {
        if (element) element.hidden = index >= bodyCount;
      });

      section.dataset.physics = 'true';
      canvas.width = width;
      canvas.height = height;
      engine = Engine.create({ gravity: { x: 0, y: 1.05 } });
      runner = Runner.create();
      walls = makeWalls(width, height);
      Composite.add(engine.world, walls);

      bodies = Array.from({ length: bodyCount }, (_, index) => {
        const progress = index / Math.max(bodyCount - 1, 1);
        const x = Math.min(width * 0.62, Math.max(width * 0.05, width * (0.06 + progress * 0.5) + (Math.random() - 0.5) * width * 0.04));
        const y = Math.min(height * 0.3, Math.max(height * 0.04, height * (0.05 + 0.1 * Math.sin(1.1 * index)) + (Math.random() - 0.5) * 16));
        const body = Bodies.circle(x, y, size / 2, {
          restitution: 0.72,
          friction: 0.04,
          frictionAir: 0.018,
          density: 0.0022,
        });
        body.plugin.discIndex = index;
        body.plugin.pit = index % 2 === 0 ? 'left' : 'right';
        Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.12);
        Body.setVelocity(body, { x: (Math.random() - 0.35) * 2.2, y: Math.random() * 1.2 + 0.35 });
        return body;
      });
      Composite.add(engine.world, bodies);

      mouse = Mouse.create(canvas);
      mouseConstraint = MouseConstraint.create(engine, {
        mouse,
        constraint: { stiffness: 0.2, render: { visible: false } },
      });
      Composite.add(engine.world, mouseConstraint);

      const force = { x: 0, y: 0 };
      const attract = () => {
        const leftPit = width * 0.22;
        const rightPit = width * 0.58;
        const targetY = floor - 42;
        const now = performance.now();
        const shouldPaint = now - lastDiscPaint >= 32;
        if (shouldPaint) lastDiscPaint = now;

        bodies.forEach((body) => {
          if (shouldPaint) syncDisc(body);
          const targetX = body.plugin.pit === 'right' ? rightPit : leftPit;
          const dx = targetX - body.position.x;
          const dy = targetY - body.position.y;
          const depth = Math.max(0, body.position.y / height - 0.35);
          const strength = 0.00000115 * (0.35 + depth * depth * 2.2) / (Math.hypot(dx, dy) || 1);
          force.x = dx * strength;
          force.y = dy * strength;
          Body.applyForce(body, body.position, force);
        });
      };

      const repel = (event: Matter.IMouseEvent<Matter.MouseConstraint>) => {
        const pointer = event.mouse.position;
        bodies.forEach((body) => {
          const dx = body.position.x - pointer.x;
          const dy = body.position.y - pointer.y;
          const distanceSquared = dx * dx + dy * dy;
          if (distanceSquared >= 19600) return;
          const strength = 0.06 / (Math.sqrt(distanceSquared) || 1);
          Body.applyForce(body, body.position, { x: dx * strength, y: dy * strength });
        });
      };

      const nudgeWithKeyboard = (event: KeyboardEvent) => {
        const supported = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', ' '];
        if (!supported.includes(event.key) || bodies.length === 0) return;
        event.preventDefault();
        const direction = event.key === 'ArrowLeft' ? { x: -1, y: 0 }
          : event.key === 'ArrowRight' ? { x: 1, y: 0 }
            : event.key === 'ArrowDown' ? { x: 0, y: 1 }
              : { x: 0, y: -1 };
        bodies.forEach((body, index) => {
          const spread = event.key === 'Enter' || event.key === ' ' ? (index % 2 === 0 ? -0.35 : 0.35) : 0;
          Body.applyForce(body, body.position, {
            x: (direction.x + spread) * 0.006,
            y: direction.y * 0.006,
          });
        });
      };

      Events.on(engine, 'beforeUpdate', attract);
      Events.on(mouseConstraint, 'mousemove', repel);
      removeMatterEvents = () => {
        if (engine) Events.off(engine, 'beforeUpdate', attract);
        if (mouseConstraint) Events.off(mouseConstraint, 'mousemove', repel);
        if (mouse) Mouse.clearSourceEvents(mouse);
      };
      canvas.addEventListener('keydown', nudgeWithKeyboard);
      removeKeyboardNudge = () => canvas.removeEventListener('keydown', nudgeWithKeyboard);
      bodies.forEach(syncDisc);
      active = true;
      Runner.run(runner, engine);
    };

    const syncActivity = () => {
      const shouldRun = visibleInViewport && !document.hidden;
      section.dataset.inView = String(shouldRun);
      if (shouldRun) {
        start();
        if (started && !active && runner && engine) {
          active = true;
          Runner.run(runner, engine);
        }
      } else if (active && runner) {
        active = false;
        Runner.stop(runner);
      }
    };

    const observer = new IntersectionObserver((entries) => {
      visibleInViewport = entries.at(-1)?.isIntersecting ?? false;
      syncActivity();
    }, { threshold: 0, rootMargin: '0px' });

    const resizeObserver = new ResizeObserver(() => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(resize);
    });

    observer.observe(section);
    resizeObserver.observe(section);
    document.addEventListener('visibilitychange', syncActivity);

    teardownPhysics = () => {
      observer.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', syncActivity);
      cancelAnimationFrame(resizeFrame);
      if (runner) Runner.stop(runner);
      removeMatterEvents();
      if (engine) Engine.clear(engine);
      removeKeyboardNudge();
      delete section.dataset.physics;
      delete section.dataset.motion;
      delete section.dataset.inView;
      discRefs.current.forEach((element) => {
        element?.style.removeProperty('transform');
        if (element) element.hidden = false;
      });
    };
    };

    const preloadObserver = new IntersectionObserver((entries) => {
      if (loading || !entries.some((entry) => entry.isIntersecting)) return;
      loading = true;
      preloadObserver.disconnect();
      void loadPhysics().catch(() => {
        if (!cancelled) showStaticFallback();
      });
    }, { threshold: 0, rootMargin: '320px 0px' });
    preloadObserver.observe(section);

    return () => {
      cancelled = true;
      preloadObserver.disconnect();
      teardownPhysics();
    };
  }, []);

  return (
    <section id="brand-motion" ref={sectionRef} className="brand-motion" aria-labelledby="brand-motion-heading">
      <div className="brand-motion-grid" aria-hidden="true" />
      <svg className="brand-motion-squiggle" viewBox="0 0 400 200" fill="none" aria-hidden="true">
        <path d="M20 30 C 50 10, 80 140, 60 140 C 30 140, 30 60, 90 70 C 140 80, 160 180, 130 180 C 100 180, 100 100, 180 110 C 240 120, 260 190, 380 150" />
      </svg>

      <h2 id="brand-motion-heading" className="brand-motion-sr-only">Relia, title proven</h2>
      <p id="brand-motion-instructions" className="brand-motion-sr-only">A playful field of title-state tokens. Drag with a pointer, or focus the field and use the arrow, Enter, or Space keys to nudge the tokens.</p>
      <div className="brand-motion-lockup" aria-hidden="true">
        <div className="brand-motion-word">
          {'relia'.split('').map((letter, index) => (
            <span className="brand-motion-letter-clip" aria-hidden="true" key={`${letter}-${index}`}>
              <span className="brand-motion-letter">{letter}</span>
            </span>
          ))}
        </div>
        <p>title, proven</p>
      </div>

      <div className="brand-motion-field">
        {Array.from({ length: DISC_COUNT }, (_, index) => (
          <div
            className="brand-motion-disc"
            key={index}
            ref={(node) => { discRefs.current[index] = node; }}
            aria-hidden="true"
          >
            <MotionIcon index={index} />
          </div>
        ))}
        <canvas
          ref={canvasRef}
          className="brand-motion-canvas"
          role="button"
          tabIndex={0}
          aria-label="Nudge the title-state tokens"
          aria-describedby="brand-motion-instructions"
        />
      </div>

      <div className="brand-motion-ticker" aria-hidden="true">
        <div className="brand-motion-ticker-track">
          {Array.from({ length: 2 }, (_, group) => (
            <span className="brand-motion-ticker-group" key={group}>
              {REFUSALS.map((refusal) => (
                <span className="brand-motion-ticker-item" key={`${group}-${refusal}`}>
                  <span>{refusal}</span><span className="brand-motion-star"><MaterialIcon name="auto_awesome" /></span>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
