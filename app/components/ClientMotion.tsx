'use client';

import { useEffect } from 'react';

export function ClientMotion() {
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    document.documentElement.dataset.motion = 'ready';

    if (reduce || nodes.length === 0) {
      nodes.forEach((node) => node.setAttribute('data-visible', 'true'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).setAttribute('data-visible', 'true');
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.12 },
    );

    nodes.forEach((node, index) => {
      node.style.setProperty('--reveal-delay', `${Math.min(index * 45, 180)}ms`);
      observer.observe(node);
    });

    return () => {
      observer.disconnect();
      delete document.documentElement.dataset.motion;
    };
  }, []);

  return null;
}
