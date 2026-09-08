import type { ReactNode } from 'react';

function classes(...values: Array<string | false | undefined>) {
  return values.filter(Boolean).join(' ');
}

export function DrawnArrow({ className, direction = 'right' }: { className?: string; direction?: 'right' | 'down' | 'left' }) {
  return <svg className={classes('annotation', 'annotation-arrow', `annotation-${direction}`, className)} viewBox="0 0 120 72" aria-hidden="true" focusable="false"><path pathLength="1" d="M6 60c20-48 55-52 98-20" /><path pathLength="1" d="m93 27 12 13-18 3" /></svg>;
}

export function DrawnLoop({ className }: { className?: string }) {
  return <svg className={classes('annotation', 'annotation-loop', className)} viewBox="0 0 180 90" aria-hidden="true" focusable="false"><path pathLength="1" d="M8 18c30-18 58 56 24 58C2 78 22 28 72 35c42 6 42 48 13 48-24 0-15-33 17-36 28-3 46 13 69 1" /></svg>;
}

export function DrawnUnderline({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={classes('annotation-underline', className)}>{children}</span>;
}

export function Starburst({ color = 'attention', className }: { color?: 'attention' | 'live' | 'editorial'; className?: string }) {
  return <span className={classes('annotation', 'annotation-starburst', `annotation-starburst-${color}`, className)} aria-hidden="true" />;
}

export function Stamp({ children, tone = 'live', decorative = false, className }: { children: ReactNode; tone?: 'live' | 'attention' | 'neutral'; decorative?: boolean; className?: string }) {
  return <span className={classes('annotation-stamp', `annotation-stamp-${tone}`, className)} aria-hidden={decorative || undefined}>{children}</span>;
}
