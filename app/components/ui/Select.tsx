'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { MaterialIcon } from '@/components/MaterialIcon';

export interface SelectOption {
  value: string;
  label: string;
  detail?: string;
}

interface Placement { top: number; left: number; width: number; maxHeight: number; above: boolean }

const LIST_MAX_HEIGHT = 300;
const GAP = 6;

function classes(...values: Array<string | false | undefined>) {
  return values.filter(Boolean).join(' ');
}

/**
 * Select-only combobox (WAI-ARIA APG pattern). Focus stays on the trigger;
 * the listbox renders in a portal with fixed positioning so rounded, clipped
 * panels and scrolling tables can never cut it off.
 */
export function Select({
  value,
  onChange,
  options,
  label,
  placeholder = 'Select...',
  disabled = false,
  invalid = false,
  mono = false,
  describedBy,
  onBlur,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  label: string;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  mono?: boolean;
  describedBy?: string;
  onBlur?: () => void;
  className?: string;
}) {
  const id = useId();
  const listId = `${id}-list`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const typeahead = useRef({ text: '', timer: 0 });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [placement, setPlacement] = useState<Placement | null>(null);

  const selectedIndex = options.findIndex((option) => option.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null;

  const place = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom - GAP - 8;
    const aboveSpace = rect.top - GAP - 8;
    const above = below < Math.min(LIST_MAX_HEIGHT, 180) && aboveSpace > below;
    const maxHeight = Math.max(120, Math.min(LIST_MAX_HEIGHT, above ? aboveSpace : below));
    setPlacement({
      top: above ? rect.top - GAP : rect.bottom + GAP,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8)),
      width: rect.width,
      maxHeight,
      above,
    });
  }, []);

  const close = useCallback((returnFocus = true) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
    onBlur?.();
  }, [onBlur]);

  const openList = useCallback((index = selectedIndex >= 0 ? selectedIndex : 0) => {
    if (disabled || options.length === 0) return;
    place();
    setActive(index);
    setOpen(true);
  }, [disabled, options.length, place, selectedIndex]);

  const choose = (index: number) => {
    const option = options[index];
    if (!option) return;
    if (option.value !== value) onChange(option.value);
    close();
  };

  useLayoutEffect(() => {
    if (!open) return undefined;
    let frame = 0;
    const update = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(place);
    };
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open, place]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || listRef.current?.contains(target)) return;
      close(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open, close]);

  useEffect(() => {
    if (!open || active < 0) return;
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const last = options.length - 1;
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
        event.preventDefault();
        openList(event.key === 'ArrowUp' ? Math.max(0, selectedIndex) : undefined);
      }
      return;
    }
    switch (event.key) {
      case 'ArrowDown': event.preventDefault(); setActive((index) => Math.min(last, index + 1)); return;
      case 'ArrowUp': event.preventDefault(); setActive((index) => Math.max(0, index - 1)); return;
      case 'Home': event.preventDefault(); setActive(0); return;
      case 'End': event.preventDefault(); setActive(last); return;
      case 'PageDown': event.preventDefault(); setActive((index) => Math.min(last, index + 6)); return;
      case 'PageUp': event.preventDefault(); setActive((index) => Math.max(0, index - 6)); return;
      case 'Enter':
      case ' ': event.preventDefault(); choose(active); return;
      case 'Escape': event.preventDefault(); close(); return;
      case 'Tab': close(false); return;
      default:
        if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
          const state = typeahead.current;
          window.clearTimeout(state.timer);
          state.text += event.key.toLowerCase();
          state.timer = window.setTimeout(() => { state.text = ''; }, 600);
          const match = options.findIndex((option) => option.label.toLowerCase().startsWith(state.text));
          if (match >= 0) setActive(match);
        }
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        className={classes('ui-select', mono && 'ui-select-mono', open && 'is-open', className)}
        aria-label={`${label}: ${selected ? selected.label : placeholder}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && active >= 0 ? `${id}-option-${active}` : undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        disabled={disabled}
        data-placeholder={selected ? undefined : 'true'}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onKeyDown}
        onBlur={() => { if (!open) onBlur?.(); }}
      >
        <span className="ui-select-value">{selected ? selected.label : placeholder}</span>
        <MaterialIcon name="expand_more" className="ui-select-chevron" />
      </button>
      {open && placement && createPortal(
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={label}
          className={classes('ui-select-list', mono && 'ui-select-mono', placement.above && 'is-above')}
          style={{
            top: placement.top,
            left: placement.left,
            width: placement.width,
            maxHeight: placement.maxHeight,
            transform: placement.above ? 'translateY(-100%)' : undefined,
          }}
        >
          {options.map((option, index) => {
            const isSelected = index === selectedIndex;
            return (
              <li
                key={option.value}
                id={`${id}-option-${index}`}
                role="option"
                aria-selected={isSelected}
                data-index={index}
                data-active={index === active || undefined}
                className="ui-select-option"
                onPointerMove={() => setActive(index)}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => choose(index)}
              >
                <span className="ui-select-option-text">
                  <span>{option.label}</span>
                  {option.detail && <small>{option.detail}</small>}
                </span>
                {isSelected && <MaterialIcon name="check" className="ui-select-check" />}
              </li>
            );
          })}
        </ul>,
        document.body,
      )}
    </>
  );
}
