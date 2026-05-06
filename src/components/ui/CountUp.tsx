"use client";

import { useEffect, useRef, useState } from "react";

interface CountUpProps {
  /** Target value to animate to. */
  value: number;
  /** Animation duration in ms. Default 700. */
  duration?: number;
  /** Decimal places to show. Default 0 (integers). */
  decimals?: number;
  /**
   * If true, the very first render animates from 0 to `value`. If false,
   * the first render shows `value` instantly and only subsequent updates
   * animate. Default true (broadcast entrance feel).
   */
  animateOnMount?: boolean;
}

/**
 * Tiny rAF-based count-up. No external deps. Animates with a cubic
 * ease-out from the previously-displayed number to the new one whenever
 * `value` changes. Used by the broadcast scoreboards.
 */
export default function CountUp({
  value,
  duration = 700,
  decimals = 0,
  animateOnMount = true,
}: CountUpProps) {
  const [display, setDisplay] = useState<number>(animateOnMount ? 0 : value);
  const lastTargetRef = useRef<number>(animateOnMount ? 0 : value);

  useEffect(() => {
    const from = lastTargetRef.current;
    const to = value;
    if (from === to) {
      setDisplay(to);
      return;
    }

    let raf = 0;
    let start: number | null = null;
    const step = (t: number) => {
      if (start === null) start = t;
      const elapsed = t - start;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = from + (to - from) * eased;
      setDisplay(current);
      if (progress < 1) raf = requestAnimationFrame(step);
      else lastTargetRef.current = to;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <>{display.toFixed(decimals)}</>;
}
