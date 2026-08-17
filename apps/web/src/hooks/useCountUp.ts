import { useState, useEffect } from 'react';

/**
 * Hook for smooth count-up animation for KPI numbers without external libraries
 * Automatically respects prefers-reduced-motion
 */
export function useCountUp(endValue: number, durationMs: number = 800): number {
  const [count, setCount] = useState<number>(() => {
    // If reduced motion is preferred, jump straight to target value
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return endValue;
    }
    return 0;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setCount(endValue);
      return;
    }

    if (endValue === 0) {
      setCount(0);
      return;
    }

    let startTimestamp: number | null = null;
    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / durationMs, 1);
      // Ease out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentVal = Math.round(easeOut * endValue);
      setCount(currentVal);

      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(step);
      }
    };

    animationFrameId = window.requestAnimationFrame(step);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [endValue, durationMs]);

  return count;
}
