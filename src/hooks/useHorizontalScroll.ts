import { useRef, useEffect, useState, useCallback } from 'react';

/**
 * Hook to provide reference and scroll tracking for standard horizontal scroll containers.
 * Retains natural browser scrollbar behavior without hijacking wheel or mouse drag.
 */
export function useHorizontalScroll() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0); // 0 to 100

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(maxScroll > 4 && el.scrollLeft < maxScroll - 4);
    if (maxScroll > 0) {
      setScrollProgress(Math.min(100, Math.max(0, Math.round((el.scrollLeft / maxScroll) * 100))));
    } else {
      setScrollProgress(0);
    }
  }, []);

  const scrollLeft = useCallback((amount = 350) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -amount, behavior: 'smooth' });
    }
  }, []);

  const scrollRight = useCallback((amount = 350) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  }, []);

  const scrollToStart = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    }
  }, []);

  const scrollToEnd = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ left: scrollRef.current.scrollWidth, behavior: 'smooth' });
    }
  }, []);

  const scrollToPercentage = useCallback((pct: number) => {
    if (scrollRef.current) {
      const maxScroll = scrollRef.current.scrollWidth - scrollRef.current.clientWidth;
      scrollRef.current.scrollTo({ left: (pct / 100) * maxScroll, behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    checkScroll();
    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll, { passive: true });

    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [checkScroll]);

  return {
    scrollRef,
    canScrollLeft,
    canScrollRight,
    scrollProgress,
    scrollLeft,
    scrollRight,
    scrollToStart,
    scrollToEnd,
    scrollToPercentage,
    checkScroll,
  };
}
