import { useState } from 'react';

export function useLocalStorageState<T extends Record<string, unknown>>(
  key: string,
  defaults: T,
): [T, (v: Partial<T>) => void] {
  const [state, setState] = useState<T>(() => {
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (typeof parsed === 'object' && parsed !== null) {
          return { ...defaults, ...parsed };
        }
      } catch {}
    }
    return defaults;
  });
  const updateState = (v: Partial<T>) =>
    setState((prev) => ({ ...prev, ...v }));
  return [state, updateState];
}
