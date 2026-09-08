'use client';

import { useEffect, useRef } from 'react';

export function CountUp({ value, duration = 620 }: { value: number; duration?: number }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || value <= 0 || window.matchMedia('(prefers-reduced-motion: reduce)').matches || typeof IntersectionObserver === 'undefined') return;

    let frame = 0;
    let startedAt = 0;
    let complete = false;
    const finish = () => {
      cancelAnimationFrame(frame);
      node.textContent = String(value);
      complete = true;
    };
    const tick = (now: number) => {
      if (!startedAt) startedAt = now;
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      node.textContent = String(Math.round(value * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
      else complete = true;
    };
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) {
        if (startedAt && !complete) finish();
        return;
      }
      observer.unobserve(node);
      node.textContent = '0';
      frame = requestAnimationFrame(tick);
    }, { threshold: 0.55 });

    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      node.textContent = String(value);
    };
  }, [duration, value]);

  return <strong ref={ref} aria-label={String(value)} style={{ minInlineSize: `${String(value).length}ch` }}>{value}</strong>;
}
