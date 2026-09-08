export type MotionCleanup = () => void;

export const MOTION_DURATION = {
  sequenceStep: 45,
  control: 240,
  stamp: 360,
  panel: 420,
  hero: 460,
  reveal: 520,
  draw: 620,
} as const;

export const MOTION_EASING = {
  out: 'cubic-bezier(0.23, 1, 0.32, 1)',
  expand: 'cubic-bezier(0.22, 1, 0.36, 1)',
  sweep: 'cubic-bezier(0.7, 0, 0.2, 1)',
  stamp: 'cubic-bezier(0.2, 1.45, 0.4, 1)',
} as const;

type EntranceOptions = {
  rootMargin?: string;
  threshold?: number;
  immediateViewportRatio?: number;
};

type ActivityOptions = {
  rootMargin?: string;
  threshold?: number;
};

const noop = () => {};

export function motionIsReduced(): boolean {
  return typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function observeEntrance(
  nodes: Iterable<HTMLElement>,
  enter: (node: HTMLElement) => void,
  options: EntranceOptions = {},
): MotionCleanup {
  const elements = Array.from(nodes);
  if (elements.length === 0) return noop;

  if (typeof IntersectionObserver === 'undefined') {
    elements.forEach(enter);
    return noop;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const node = entry.target as HTMLElement;
      enter(node);
      observer.unobserve(node);
    });
  }, {
    rootMargin: options.rootMargin ?? '0px 0px -12% 0px',
    threshold: options.threshold ?? 0.12,
  });

  const immediateLine = window.innerHeight * (options.immediateViewportRatio ?? 0.88);
  elements.forEach((node) => {
    if (node.getBoundingClientRect().top < immediateLine) enter(node);
    else observer.observe(node);
  });

  return () => observer.disconnect();
}

export function observeMotionActivity(
  selector = '[data-motion-loop]',
  options: ActivityOptions = {},
): MotionCleanup {
  const nodes = new Set<HTMLElement>();
  const viewportVisibility = new Map<HTMLElement, boolean>();

  const sync = (node: HTMLElement) => {
    node.dataset.motionActive = String(!document.hidden && viewportVisibility.get(node) === true);
  };

  if (typeof IntersectionObserver === 'undefined') {
    document.querySelectorAll<HTMLElement>(selector).forEach((node) => nodes.add(node));
    const syncFallback = () => nodes.forEach((node) => { node.dataset.motionActive = String(!document.hidden); });
    syncFallback();
    document.addEventListener('visibilitychange', syncFallback);
    return () => {
      document.removeEventListener('visibilitychange', syncFallback);
      nodes.forEach((node) => delete node.dataset.motionActive);
    };
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const node = entry.target as HTMLElement;
      viewportVisibility.set(node, entry.isIntersecting);
      sync(node);
    });
  }, {
    threshold: options.threshold ?? 0,
    rootMargin: options.rootMargin ?? '0px',
  });

  const observe = (node: HTMLElement) => {
    if (nodes.has(node)) return;
    nodes.add(node);
    observer.observe(node);
  };

  const unobserve = (node: HTMLElement) => {
    if (!nodes.has(node)) return;
    observer.unobserve(node);
    delete node.dataset.motionActive;
    nodes.delete(node);
    viewportVisibility.delete(node);
  };

  document.querySelectorAll<HTMLElement>(selector).forEach(observe);

  const mutationObserver = new MutationObserver((records) => {
    records.forEach((record) => {
      record.addedNodes.forEach((added) => {
        if (!(added instanceof HTMLElement)) return;
        if (added.matches(selector)) observe(added);
        added.querySelectorAll<HTMLElement>(selector).forEach(observe);
      });
      record.removedNodes.forEach((removed) => {
        if (!(removed instanceof HTMLElement)) return;
        if (removed.matches(selector)) unobserve(removed);
        removed.querySelectorAll<HTMLElement>(selector).forEach(unobserve);
      });
    });
  });
  mutationObserver.observe(document.body, { childList: true, subtree: true });

  const handleVisibility = () => nodes.forEach(sync);
  document.addEventListener('visibilitychange', handleVisibility);

  return () => {
    observer.disconnect();
    mutationObserver.disconnect();
    document.removeEventListener('visibilitychange', handleVisibility);
    nodes.forEach((node) => delete node.dataset.motionActive);
    nodes.clear();
    viewportVisibility.clear();
  };
}

export function bindReplayIntent(
  trigger: HTMLElement,
  replay: () => void,
): MotionCleanup {
  const handleReplay = () => {
    if (!motionIsReduced()) replay();
  };
  trigger.addEventListener('click', handleReplay);
  return () => trigger.removeEventListener('click', handleReplay);
}

export function cancelAnimations(animations: Iterable<Animation>): void {
  Array.from(animations).forEach((animation) => animation.cancel());
}
