'use client';

import Link from 'next/link';
import { CopyButton } from '@/components/CopyButton';
import { MaterialIcon } from '@/components/MaterialIcon';

function compact(value: string): string {
  if (value.length <= 20) return value;
  return `${value.slice(0, 10)}...${value.slice(-6)}`;
}

export function TableIdentifier({
  value,
  copyLabel,
  href,
  actionLabel,
  external = false,
}: {
  value: string;
  copyLabel: string;
  href?: string;
  actionLabel?: string;
  external?: boolean;
}) {
  const action = href && actionLabel && (external
    ? <a href={href} target="_blank" rel="noreferrer" aria-label={`${actionLabel}: ${value}`}>{actionLabel}<MaterialIcon name="open_in_new" /></a>
    : <Link href={href} aria-label={`${actionLabel}: ${value}`}>{actionLabel}<MaterialIcon name="arrow_forward" /></Link>);

  return (
    <div className="table-identifier">
      <code title={value}>{compact(value)}</code>
      <div><CopyButton value={value} label={copyLabel} />{action}</div>
    </div>
  );
}
