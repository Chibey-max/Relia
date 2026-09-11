import Link from 'next/link';
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';

function classes(...values: Array<string | false | undefined>) {
  return values.filter(Boolean).join(' ');
}

export function Card({
  as: Component = 'div',
  variant = 'quiet',
  className,
  children,
  ...props
}: HTMLAttributes<HTMLElement> & {
  as?: 'div' | 'article' | 'li';
  variant?: 'quiet' | 'interactive' | 'proof' | 'technical' | 'illustrated';
  children: ReactNode;
}) {
  return <Component {...props} className={classes('ui-card', `ui-card-${variant}`, className)}>{children}</Component>;
}

type ButtonBase = {
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger' | 'loading';
  size?: 'compact' | 'standard';
  className?: string;
  children: ReactNode;
  busy?: boolean;
  busyLabel?: string;
};

type ButtonProps = ButtonBase & (
  | ({ href: string; target?: string; rel?: string; 'aria-label'?: string })
  | ({ href?: never } & ButtonHTMLAttributes<HTMLButtonElement>)
);

export function Button({
  variant = 'primary',
  size = 'standard',
  className,
  children,
  busy = false,
  busyLabel,
  ...props
}: ButtonProps) {
  const content = <>{busy && <span className="button-progress-mark" aria-hidden="true" data-motion-loop data-motion-active="false" />}<span>{busy ? busyLabel ?? 'Working...' : children}</span></>;
  const buttonClass = classes('button', 'ui-button', `ui-button-${variant}`, `ui-button-${size}`, className);

  if ('href' in props && props.href) {
    return <Link {...props} className={buttonClass} aria-busy={busy || undefined} aria-disabled={busy || undefined}>{content}</Link>;
  }

  const buttonProps = props as ButtonHTMLAttributes<HTMLButtonElement>;
  return <button {...buttonProps} className={buttonClass} disabled={busy || buttonProps.disabled} aria-busy={busy || undefined}>{content}</button>;
}
