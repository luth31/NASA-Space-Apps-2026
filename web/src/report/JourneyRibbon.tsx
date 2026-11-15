import { useEffect, useMemo, useRef } from "react";
import { useReducedMotion } from "motion/react";
import { ribbonParticles } from "./journey-data";
import type { FireParticle } from "./particle-layout";
import type { Bucket } from "./report-data";

export interface RibbonOrigin {
  key: string;
  index: number;
  fraction: number;
  serial: number;
}

/** Selected-period particles seed the next cloud, so drilling visibly expands that period. */
export default function JourneyRibbon({
  buckets,
  paused,
  active,
  origin,
  reduceMotion = false,
}: {
  buckets: Bucket[];
  paused: boolean;
  active: number;
  origin: RibbonOrigin | null;
  reduceMotion?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prefersReduced = useReducedMotion();
  const reduced = prefersReduced || reduceMotion;
  const targets = useMemo(() => ribbonParticles(buckets), [buckets]);
  const state = useRef({ targets, paused, active, reduced, origin });
  state.current = { targets, paused, active, reduced, origin };
  const wake = useRef(() => {});
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let width = 1,
      height = 1,
      frame = 0,
      visible = true,
      last = 0;
    let points: FireParticle[] = [],
      previousTargets: FireParticle[] | null = null,
      usedOrigin = -1;
    const draw = (now: number) => {
      frame = 0;
      const s = state.current;
      const moving = !s.paused && !s.reduced && visible && !document.hidden;
      if (previousTargets !== s.targets) {
        const source = s.origin;
        if (source && source.serial !== usedOrigin && points.length) {
          const selected = points.filter((p) => p.group === source.index);
          const seeds = selected.length
            ? selected
            : [{ x: source.fraction, y: 0.83, size: 1, group: 0, phase: 0 }];
          points = s.targets.map((_, i) => ({ ...seeds[i % seeds.length] }));
          usedOrigin = source.serial;
        } else points = s.targets.map((t, i) => points[i] ?? { ...t, y: 0.83 });
        previousTargets = s.targets;
      }
      const dt = Math.min(2, (now - last) / 16.67 || 1);
      last = now;
      ctx.clearRect(0, 0, width, height);
      const ease = moving ? 1 - Math.pow(0.9, dt) : 1;
      ctx.globalCompositeOperation = "lighter";
      points.forEach((p, i) => {
        const t = s.targets[i];
        if (!t) return;
        p.x += (t.x - p.x) * ease;
        p.y += (t.y - p.y) * ease;
        p.group = t.group;
        const selected = s.active < 0 || s.active === t.group;
        const shimmer = moving
          ? 0.75 + Math.sin(now / 1300 + t.phase) * 0.25
          : 0.85;
        ctx.globalAlpha = shimmer * (selected ? 0.9 : 0.22);
        ctx.fillStyle =
          i % 7 === 0 ? "#fff2c7" : i % 3 === 0 ? "#f4bf77" : "#e9864d";
        ctx.beginPath();
        ctx.arc(
          p.x * width,
          p.y * height,
          t.size * (selected ? 1 : 0.7),
          0,
          Math.PI * 2,
        );
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      if (moving && visible && !document.hidden)
        frame = requestAnimationFrame(draw);
    };
    const start = () => {
      // Paint a still frame immediately after resize or data changes, including
      // reduced motion. Only ambient frames depend on page visibility.
      cancelAnimationFrame(frame);
      frame = 0;
      draw(performance.now());
    };
    wake.current = start;
    const resize = new ResizeObserver(([entry]) => {
      width = entry.contentRect.width;
      height = entry.contentRect.height;
      const dpr = Math.min(2, devicePixelRatio || 1);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      start();
    });
    resize.observe(canvas);
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
      else {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    });
    observer.observe(canvas);
    const visibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(frame);
        frame = 0;
      } else start();
    };
    document.addEventListener("visibilitychange", visibility);
    start();
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      wake.current = () => {};
    };
  }, []);
  useEffect(() => wake.current(), [targets, paused, reduced, active, origin]);
  return (
    <canvas
      ref={canvasRef}
      className="jy-particles"
      data-particles={targets.length}
      aria-hidden="true"
    />
  );
}
