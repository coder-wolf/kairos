"use client";

import * as React from "react";

/**
 * A small localStorage-backed state hook so dashboard widgets can remember
 * whether they were expanded. Hydration happens after mount to keep SSR
 * markup deterministic.
 */
export function useStoredState<T>(key: string, initial: T) {
  const [value, setValue] = React.useState<T>(initial);
  const [hydrated, setHydrated] = React.useState(false);

  /* eslint-disable react-hooks/set-state-in-effect -- restoring a persisted UI preference */
  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) setValue(JSON.parse(raw) as T);
    } catch {
      // ignore malformed storage
    }
    setHydrated(true);
  }, [key]);
  /* eslint-enable react-hooks/set-state-in-effect */

  React.useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore storage failures
    }
  }, [hydrated, key, value]);

  return [value, setValue] as const;
}
