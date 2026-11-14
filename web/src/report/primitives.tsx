import { useEffect, useRef } from "react";
import { animate, useReducedMotion } from "motion/react";
import { integer } from "../data";
import { monthName } from "./report-data";
import type { Bucket } from "./report-data";
export function bucketName(b: Bucket) {
  return b.key.length === 4
    ? b.key
    : b.key.length === 7
      ? `${monthName(b.key, true)} ${b.key.slice(0, 4)}`
      : b.key.length === 10
        ? `${Number(b.key.slice(8))} ${monthName(b.key.slice(0, 7), true)}`
        : `${b.key.slice(11)}:00–${b.key.slice(11)}:59 UTC`;
}
export function readout(b: Bucket) {
  return b.value === null ? "No source data" : `${integer(b.value)} detections`;
}
export function Counter({
  value,
  className = "",
}: {
  value: number | null;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null),
    previous = useRef(0),
    reduced = useReducedMotion();
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (value === null) {
      node.textContent = "—";
      return;
    }
    if (reduced) {
      node.textContent = integer(value);
      previous.current = value;
      return;
    }
    const control = animate(previous.current, value, {
      duration: 0.85,
      ease: [0.2, 0.8, 0.2, 1],
      onUpdate: (n) => {
        node.textContent = integer(n);
        previous.current = n;
      },
    });
    return () => control.stop();
  }, [value, reduced]);
  return (
    <span
      className={`x-counter ${className}`}
      ref={ref}
      aria-label={value === null ? "Data unavailable" : integer(value)}
    >
      {value === null ? "—" : integer(value)}
    </span>
  );
}
