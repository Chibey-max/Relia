'use client';

import { MaterialIcon } from '@/components/MaterialIcon';

/** Clamp a page index after the underlying list changes length. */
export function clampPage(page: number, total: number, pageSize: number) {
  return Math.min(page, Math.max(0, Math.ceil(total / pageSize) - 1));
}

export function Pagination({
  page,
  total,
  pageSize,
  onPageChange,
  noun,
  label,
}: {
  page: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  noun: string;
  label: string;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const first = total === 0 ? 0 : page * pageSize + 1;
  const last = Math.min(total, (page + 1) * pageSize);

  return (
    <nav className="ui-pagination" aria-label={label}>
      <p className="ui-pagination-summary" aria-live="polite">
        <strong>{first}-{last}</strong> of {total} {noun}
        <span aria-hidden="true"> / </span>
        <span>Page {page + 1} of {pageCount}</span>
      </p>
      {pageCount > 1 && (
        <div className="ui-pagination-controls">
          <button type="button" className="ui-pagination-step" onClick={() => onPageChange(page - 1)} disabled={page === 0}>
            <MaterialIcon name="arrow_back" /><span>Previous</span>
          </button>
          {pageCount <= 9 && (
            <ol className="ui-pagination-pages">
              {Array.from({ length: pageCount }, (_, index) => (
                <li key={index}>
                  <button
                    type="button"
                    aria-label={`Page ${index + 1}`}
                    aria-current={index === page ? 'page' : undefined}
                    onClick={() => onPageChange(index)}
                  >
                    {index + 1}
                  </button>
                </li>
              ))}
            </ol>
          )}
          <button type="button" className="ui-pagination-step" onClick={() => onPageChange(page + 1)} disabled={page >= pageCount - 1}>
            <span>Next</span><MaterialIcon name="arrow_forward" />
          </button>
        </div>
      )}
    </nav>
  );
}
