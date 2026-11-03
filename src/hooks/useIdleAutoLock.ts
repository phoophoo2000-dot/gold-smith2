import { useEffect, useRef, useCallback } from 'react';

interface UseIdleAutoLockOptions {
  timeoutMinutes?: number;
  isLocked: boolean;
  onLock: () => void;
}

const STORAGE_KEY = 'gshop_last_active_timestamp';

export const useIdleAutoLock = ({
  timeoutMinutes = 3,
  isLocked,
  onLock,
}: UseIdleAutoLockOptions) => {
  const onLockRef = useRef(onLock);
  onLockRef.current = onLock;

  const lastActivityRef = useRef<number>(Date.now());
  const throttleRef = useRef<number>(0);

  // Record active user action
  const recordActivity = useCallback(() => {
    const now = Date.now();
    // Throttle to update at most once per 1 second to minimize CPU/storage overhead
    if (now - throttleRef.current < 1000) {
      return;
    }
    throttleRef.current = now;
    lastActivityRef.current = now;
    try {
      sessionStorage.setItem(STORAGE_KEY, now.toString());
    } catch {
      // Ignore private mode or storage quota errors
    }
  }, []);

  // Function to check if idle timeout has expired
  const checkIdleTimeout = useCallback(() => {
    if (isLocked) return;
    if (!timeoutMinutes || timeoutMinutes <= 0) return;

    let lastActive = lastActivityRef.current;
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = Number(stored);
        if (!isNaN(parsed) && parsed > 0) {
          lastActive = Math.max(lastActive, parsed);
        }
      }
    } catch {
      // fallback to memory ref
    }

    const elapsedMs = Date.now() - lastActive;
    const limitMs = timeoutMinutes * 60 * 1000;

    if (elapsedMs >= limitMs) {
      // Timeout reached - trigger screen lock
      onLockRef.current();
    }
  }, [isLocked, timeoutMinutes]);

  useEffect(() => {
    // If already locked or auto-lock disabled (0), do nothing
    if (isLocked || !timeoutMinutes || timeoutMinutes <= 0) {
      return;
    }

    // Initialize last active timestamp
    recordActivity();

    // Check immediately in case tab was backgrounded for a long time
    checkIdleTimeout();

    // User interaction events to track
    const events = [
      'mousedown',
      'mousemove',
      'keydown',
      'touchstart',
      'pointerdown',
      'scroll',
      'wheel',
      'click',
    ];

    const handleUserInteraction = () => {
      recordActivity();
    };

    events.forEach((eventName) => {
      window.addEventListener(eventName, handleUserInteraction, { passive: true });
    });

    // Check on window focus and visibility change (e.g. user returns after being in another app/tab)
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        checkIdleTimeout();
        recordActivity();
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    // Heartbeat ticker runs every 1 second to accurately catch timeout
    const intervalId = setInterval(() => {
      checkIdleTimeout();
    }, 1000);

    return () => {
      events.forEach((eventName) => {
        window.removeEventListener(eventName, handleUserInteraction);
      });
      window.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      clearInterval(intervalId);
    };
  }, [isLocked, timeoutMinutes, recordActivity, checkIdleTimeout]);
};
