import { useEffect, useMemo, useRef } from "react";
import { useReducedMotion } from "motion/react";
import { particleLayout } from "./particle-layout";
import type { FireParticle, ParticleShape } from "./particle-layout";
import type { Bucket } from "./report-data";

export default function FireField({
  buckets,
  shape,
  active = -1,
  paused = false,
}: {
  buckets: Bucket[];
  shape: ParticleShape;
  active?: number;
  paused?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const targets = useMemo(
    () => particleLayout(buckets, shape),
    [buckets, shape],
  );
  const settings = useRef({
    targets,
    active,
    paused,
    reduced,
    shape,
    count: buckets.length,
  });
  settings.current = {
    targets,
    active,
    paused,
    reduced,
    shape,
    count: buckets.length,
  };
  const wake = useRef<() => void>(() => {});
  useEffect(() => {
    const canvas = canvasRef.current!;
    const context = canvas.getContext("2d");
    if (!context) return;
    const ctx = context;
    let width = 1,
      height = 1,
      frame = 0,
      inView = true,
      last = 0;
    let points: (FireParticle & { alpha: number })[] = [];
    const pointer = { x: -1000, y: -1000 };
    const sprite = document.createElement("canvas");
    sprite.width = 40;
    sprite.height = 40;
    const sc = sprite.getContext("2d")!;
    const gradient = sc.createRadialGradient(20, 20, 0, 20, 20, 20);
    gradient.addColorStop(0, "rgba(255,248,208,1)");
    gradient.addColorStop(0.12, "rgba(255,204,131,.95)");
    gradient.addColorStop(0.3, "rgba(255,113,54,.35)");
    gradient.addColorStop(1, "rgba(255,83,36,0)");
    sc.fillStyle = gradient;
    sc.fillRect(0, 0, 40, 40);
    function render(now: number) {
      frame = 0;
      const state = settings.current;
      const moving = !state.paused && !state.reduced;
      const dt = Math.min(2, (now - last) / 16.67 || 1);
      last = now;
      ctx.clearRect(0, 0, width, height);
      const ratio = width / height;
      const square = Math.min(width, height);
      const offsetX = (width - square) / 2;
      const convert = (p: FireParticle) =>
        state.shape === "orbit"
          ? { x: offsetX + p.x * square, y: p.y * height }
          : { x: p.x * width, y: p.y * height };
      // The orbit guide and wave axis keep the particle sculpture legible as data.
      ctx.strokeStyle = "rgba(224,179,132,.13)";
      ctx.lineWidth = 1;
      if (state.shape === "orbit") {
        [0.23, 0.35, 0.46].forEach((r) => {
          ctx.beginPath();
          ctx.arc(width / 2, height / 2, square * r, 0, Math.PI * 2);
          ctx.stroke();
        });
        for (let i = 0; i < state.count; i++) {
          const a = (i / state.count) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(
            width / 2 + Math.cos(a) * square * 0.225,
            height / 2 + Math.sin(a) * square * 0.225,
          );
          ctx.lineTo(
            width / 2 + Math.cos(a) * square * 0.46,
            height / 2 + Math.sin(a) * square * 0.46,
          );
          ctx.stroke();
        }
      } else {
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(width * 0.05, height * (0.2 + i * 0.21));
          ctx.lineTo(width * 0.95, height * (0.2 + i * 0.21));
          ctx.stroke();
        }
      }
      const length = Math.max(points.length, state.targets.length);
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < length; i++) {
        const target = state.targets[i];
        if (!points[i] && target) {
          points[i] = {
            ...target,
            x: 0.5 + Math.cos(i * 2.4) * 0.48,
            y: 0.5 + Math.sin(i * 2.4) * 0.48,
            alpha: 0,
          };
        }
        const p = points[i];
        if (!p) continue;
        const ease = moving ? 1 - Math.pow(0.91, dt) : 1;
        if (target) {
          p.x += (target.x - p.x) * ease;
          p.y += (target.y - p.y) * ease;
          p.alpha += (1 - p.alpha) * ease;
          p.group = target.group;
          p.size = target.size;
        } else p.alpha += (0 - p.alpha) * ease;
        const pos = convert(p);
        let x = pos.x,
          y = pos.y;
        const highlighted = state.active < 0 || p.group === state.active;
        if (moving) {
          x += Math.sin(now * 0.00035 + p.phase) * 2.5;
          y += Math.cos(now * 0.00042 + p.phase) * 2;
          const dx = x - pointer.x,
            dy = y - pointer.y,
            d = Math.hypot(dx, dy);
          if (d < 70 && d > 0) {
            x += (dx / d) * (70 - d) * 0.17;
            y += (dy / d) * (70 - d) * 0.17;
          }
        }
        const glow = (highlighted ? 1 : 0.14) * p.alpha;
        ctx.globalAlpha =
          glow *
          (moving ? 0.72 + Math.sin(now * 0.001 + p.phase) * 0.18 : 0.85);
        const size = p.size * (highlighted ? 9 : 6) * (ratio < 0.8 ? 0.85 : 1);
        ctx.drawImage(sprite, x - size / 2, y - size / 2, size, size);
      }
      let retained = points.length;
      while (
        retained > state.targets.length &&
        points[retained - 1].alpha <= 0.01
      )
        retained--;
      points = points.slice(0, retained);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      if (moving && inView && !document.hidden)
        frame = requestAnimationFrame(render);
    }
    function start() {
      if (!frame && inView && !document.hidden)
        frame = requestAnimationFrame(render);
    }
    wake.current = start;
    const resize = new ResizeObserver((entries) => {
      width = entries[0].contentRect.width;
      height = entries[0].contentRect.height;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      start();
    });
    resize.observe(canvas);
    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        if (inView) start();
        else {
          cancelAnimationFrame(frame);
          frame = 0;
        }
      },
      { threshold: 0.01 },
    );
    observer.observe(canvas);
    const visibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(frame);
        frame = 0;
      } else start();
    };
    const move = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
    };
    const leave = () => {
      pointer.x = -1000;
      pointer.y = -1000;
    };
    document.addEventListener("visibilitychange", visibility);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerleave", leave);
    start();
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerleave", leave);
      wake.current = () => {};
    };
  }, []);
  useEffect(() => {
    wake.current();
  }, [targets, active, paused, reduced, shape]);
  return <canvas ref={canvasRef} className="fire-field" aria-hidden="true" />;
}
