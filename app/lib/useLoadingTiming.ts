'use client';

import { useEffect, useState } from 'react';

export function useLoadingTiming(active: boolean) {
  const [show, setShow] = useState(false);
  const [slow, setSlow] = useState(false);
  const [prolonged, setProlonged] = useState(false);

  useEffect(() => {
    if (!active) {
      setShow(false);
      setSlow(false);
      setProlonged(false);
      return;
    }

    const showTimer = window.setTimeout(() => setShow(true), 200);
    const slowTimer = window.setTimeout(() => setSlow(true), 3000);
    const prolongedTimer = window.setTimeout(() => setProlonged(true), 10000);

    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(slowTimer);
      window.clearTimeout(prolongedTimer);
    };
  }, [active]);

  return { show, slow, prolonged };
}
