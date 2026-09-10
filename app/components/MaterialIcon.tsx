export function MaterialIcon({
  name,
  label,
  className = '',
}: {
  name: string;
  label?: string;
  className?: string;
}) {
  return (
    <span className={`material-symbols-rounded material-icon ${className}`.trim()} aria-hidden={label ? undefined : true} aria-label={label}>
      {name}
    </span>
  );
}
