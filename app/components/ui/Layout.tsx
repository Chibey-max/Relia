import type { HTMLAttributes, ReactNode } from 'react';

type Gap = 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 14 | 16;

function classes(...values: Array<string | false | undefined>) {
  return values.filter(Boolean).join(' ');
}

export function Container({
  size = 'product',
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { size?: 'reading' | 'product' | 'stage' | 'full'; children: ReactNode }) {
  return <div {...props} className={classes('ui-container', `ui-container-${size}`, className)}>{children}</div>;
}

export function Section({
  spacing = 'standard',
  tone = 'canvas',
  composition,
  className,
  children,
  ...props
}: HTMLAttributes<HTMLElement> & {
    spacing?: 'compact' | 'standard' | 'breathing' | 'none';
    tone?: 'canvas' | 'raised' | 'subtle' | 'attention' | 'live' | 'proof' | 'transparent';
    composition?: 'open' | 'contained' | 'evidence';
    children: ReactNode;
  }) {
  return <section {...props} className={classes('ui-section', `ui-section-${spacing}`, `ui-section-${tone}`, composition && `ui-section-${composition}`, className)}>{children}</section>;
}

export function Stack({
  gap = 4,
  align = 'stretch',
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { gap?: Gap; align?: 'start' | 'center' | 'end' | 'stretch'; children: ReactNode }) {
  return <div {...props} className={classes('ui-stack', `ui-gap-${gap}`, `ui-align-${align}`, className)}>{children}</div>;
}

export function Grid({
  columns = 2,
  gap = 6,
  collapse = 'compact',
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  columns?: 1 | 2 | 3 | 4 | 12;
  gap?: Gap;
  collapse?: 'never' | 'compact' | 'small';
  children: ReactNode;
}) {
  return <div {...props} className={classes('ui-grid', `ui-grid-${columns}`, `ui-gap-${gap}`, `ui-grid-collapse-${collapse}`, className)}>{children}</div>;
}
