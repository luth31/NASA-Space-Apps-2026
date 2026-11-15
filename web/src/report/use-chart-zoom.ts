import { useEffect, useRef } from "react";
import type { RefObject } from "react";

export function zoomDirection(ratio: number) {
  return ratio > 1.22 ? 1 : ratio < 0.8 ? -1 : 0;
}

/** Native two-finger pinch keeps one-finger page scrolling available on phones. */
export function useChartZoom(
  ref: RefObject<HTMLDivElement | null>,
  enabled: boolean,
  onZoom: (direction: number, fraction: number) => void,
) {
  const callback = useRef(onZoom);
  callback.current = onZoom;
  useEffect(() => {
    const element = ref.current;
    if (!element || !enabled) return;
    let wheelTotal = 0,
      lastWheel = 0,
      lockedUntil = 0,
      distance = 0,
      midpoint = 0.5;
    const fraction = (x: number) => {
      const r = element.getBoundingClientRect();
      return Math.max(0, Math.min(1, (x - r.left) / r.width));
    };
    const commit = (direction: number, x: number) => {
      if (performance.now() < lockedUntil) return;
      lockedUntil = performance.now() + 1000;
      callback.current(direction, x);
    };
    const wheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      e.preventDefault();
      const now = performance.now();
      if (now - lastWheel > 180) wheelTotal = 0;
      lastWheel = now;
      wheelTotal += e.deltaY;
      if (Math.abs(wheelTotal) >= (e.ctrlKey ? 15 : 75)) {
        commit(wheelTotal < 0 ? 1 : -1, fraction(e.clientX));
        wheelTotal = 0;
      }
    };
    const touchStart = (e: TouchEvent) => {
      if (e.touches.length !== 2) return;
      const [a, b] = Array.from(e.touches);
      distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      midpoint = fraction((a.clientX + b.clientX) / 2);
    };
    const touchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || !distance) return;
      e.preventDefault();
      const [a, b] = Array.from(e.touches);
      const direction = zoomDirection(
        Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) / distance,
      );
      if (direction) {
        commit(direction, midpoint);
        distance = 0;
      }
    };
    const touchEnd = () => {
      distance = 0;
    };
    element.addEventListener("wheel", wheel, { passive: false });
    element.addEventListener("touchstart", touchStart, { passive: true });
    element.addEventListener("touchmove", touchMove, { passive: false });
    element.addEventListener("touchend", touchEnd);
    return () => {
      element.removeEventListener("wheel", wheel);
      element.removeEventListener("touchstart", touchStart);
      element.removeEventListener("touchmove", touchMove);
      element.removeEventListener("touchend", touchEnd);
    };
  }, [ref, enabled]);
}
