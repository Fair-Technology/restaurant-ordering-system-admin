import { useEffect, useState } from 'react';

type WakeLockState = 'on' | 'off' | 'unsupported';

export function useWakeLock(active: boolean): WakeLockState {
  const supported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;
  const [held, setHeld] = useState(false);

  useEffect(() => {
    if (!supported || !active) return;
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = () => {
      if (document.visibilityState !== 'visible') return;
      navigator.wakeLock
        .request('screen')
        .then((s) => {
          if (cancelled) {
            void s.release();
            return;
          }
          sentinel = s;
          setHeld(true);
          s.addEventListener('release', () => {
            if (!cancelled) setHeld(false);
          });
        })
        .catch(() => {
          if (!cancelled) setHeld(false);
        });
    };

    acquire();
    document.addEventListener('visibilitychange', acquire);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', acquire);
      void sentinel?.release();
    };
  }, [supported, active]);

  if (!supported) return 'unsupported';
  return active && held ? 'on' : 'off';
}
