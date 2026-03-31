import { useEffect, useRef } from 'react';

export function usePolling(callback, intervalMs = 10000, enabled = true) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!enabled) return;
    callbackRef.current(); // run immediately on mount
    const id = setInterval(() => callbackRef.current(), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, enabled]);
}
