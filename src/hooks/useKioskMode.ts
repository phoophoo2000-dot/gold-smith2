import { useState, useEffect, useCallback } from 'react';

// Extended Document & Element interfaces for cross-browser vendor prefixes
interface DocumentWithFullscreen extends Document {
  webkitFullscreenElement?: Element | null;
  mozFullScreenElement?: Element | null;
  msFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void>;
  mozCancelFullScreen?: () => Promise<void>;
  msExitFullscreen?: () => Promise<void>;
}

interface ElementWithFullscreen extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void>;
  mozRequestFullScreen?: () => Promise<void>;
  msRequestFullscreen?: () => Promise<void>;
}

export function useKioskMode() {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => {
    if (typeof document === 'undefined') return false;
    const doc = document as DocumentWithFullscreen;
    return !!(
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement
    );
  });

  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [isKioskLocked, setIsKioskLocked] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem('gold_shop_kiosk_lock') === 'true';
    } catch {
      return false;
    }
  });

  // Check support on mount
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const doc = document as DocumentWithFullscreen;
      const supported = !!(
        doc.fullscreenEnabled ||
        (doc as unknown as { webkitFullscreenEnabled?: boolean }).webkitFullscreenEnabled ||
        (doc as unknown as { mozFullScreenEnabled?: boolean }).mozFullScreenEnabled ||
        (doc as unknown as { msFullscreenEnabled?: boolean }).msFullscreenEnabled
      );
      setIsSupported(supported);
    }
  }, []);

  // Sync state on fullscreenchange events
  useEffect(() => {
    const handleFullscreenChange = () => {
      const doc = document as DocumentWithFullscreen;
      const active = !!(
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement
      );
      setIsFullscreen(active);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // Enter full-screen
  const enterKiosk = useCallback(async (): Promise<boolean> => {
    try {
      const elem = document.documentElement as ElementWithFullscreen;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) {
        await elem.webkitRequestFullscreen();
      } else if (elem.mozRequestFullScreen) {
        await elem.mozRequestFullScreen();
      } else if (elem.msRequestFullscreen) {
        await elem.msRequestFullscreen();
      } else {
        return false;
      }
      setIsFullscreen(true);
      return true;
    } catch (err) {
      console.warn('Fullscreen request failed or was denied:', err);
      return false;
    }
  }, []);

  // Exit full-screen
  const exitKiosk = useCallback(async (): Promise<boolean> => {
    try {
      const doc = document as DocumentWithFullscreen;
      if (doc.exitFullscreen) {
        await doc.exitFullscreen();
      } else if (doc.webkitExitFullscreen) {
        await doc.webkitExitFullscreen();
      } else if (doc.mozCancelFullScreen) {
        await doc.mozCancelFullScreen();
      } else if (doc.msExitFullscreen) {
        await doc.msExitFullscreen();
      } else {
        return false;
      }
      setIsFullscreen(false);
      return true;
    } catch (err) {
      console.warn('Exit fullscreen failed:', err);
      return false;
    }
  }, []);

  // Toggle
  const toggleKiosk = useCallback(async () => {
    if (isFullscreen) {
      return await exitKiosk();
    } else {
      return await enterKiosk();
    }
  }, [isFullscreen, enterKiosk, exitKiosk]);

  // Set kiosk lock preference
  const toggleKioskLock = useCallback(() => {
    setIsKioskLocked((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('gold_shop_kiosk_lock', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  return {
    isFullscreen,
    isSupported,
    isKioskLocked,
    enterKiosk,
    exitKiosk,
    toggleKiosk,
    toggleKioskLock,
  };
}
