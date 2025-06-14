import { useState } from "react";

export function useLocalStorageState<T>(
  key: string,
  defaultValue: T
): [T, (v: T) => void] {
  const [state, setState] = useState<T>(() => {
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return defaultValue;
  });
  return [state, setState];
}

export function useLocalStorageStates<T extends Record<string, any>>(
  key: string,
  defaults: T
): [T, (v: Partial<T>) => void] {
  const [state, setState] = useState<T>(() => {
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (typeof parsed === "object" && parsed !== null) {
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
