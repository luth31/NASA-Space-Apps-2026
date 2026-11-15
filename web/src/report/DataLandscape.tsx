import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import * as THREE from "three";
import { RotateCcw, Move3D } from "lucide-react";
import type { Bucket } from "./report-data";
import { bucketName, readout } from "./primitives";

function CssLandscape({
  buckets,
  onSelect,
  front,
  reset,
}: {
  buckets: Bucket[];
  onSelect: (key: string) => void;
  front: boolean;
  reset: number;
}) {
  const [pose, setPose] = useState({ yaw: -28, tilt: -16 }),
    drag = useRef<{ x: number; y: number; distance: number } | null>(null),
    dragged = useRef(false),
    reduced = useReducedMotion();
  const max = Math.max(1, ...buckets.map((b) => b.value ?? 0));
  useEffect(() => {
    setPose(front ? { yaw: 0, tilt: 0 } : { yaw: -28, tilt: -16 });
  }, [front, reset]);
  return (
    <div
      className="css-landscape"
      role="group"
      tabIndex={0}
      aria-label="Interactive 3D detection skyline. Drag or use arrow keys to orbit. Each tower is also a keyboard-accessible period."
      onPointerDown={(e) => {
        drag.current = { x: e.clientX, y: e.clientY, distance: 0 };
        dragged.current = false;
      }}
      onPointerMove={(e) => {
        if (!drag.current) return;
        const dx = e.clientX - drag.current.x,
          dy = e.clientY - drag.current.y;
        drag.current.distance += Math.abs(dx) + Math.abs(dy);
        dragged.current = drag.current.distance > 7;
        setPose((p) => ({
          yaw: Math.max(-80, Math.min(80, p.yaw + dx * 0.4)),
          tilt: Math.max(-35, Math.min(25, p.tilt - dy * 0.2)),
        }));
        drag.current.x = e.clientX;
        drag.current.y = e.clientY;
      }}
      onPointerUp={() => {
        drag.current = null;
      }}
      onPointerCancel={() => {
        drag.current = null;
        dragged.current = true;
      }}
      onPointerLeave={() => {
        drag.current = null;
      }}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (
          ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)
        ) {
          e.preventDefault();
          setPose((p) => ({
            yaw: Math.max(
              -80,
              Math.min(
                80,
                p.yaw +
                  (e.key === "ArrowLeft" ? -8 : e.key === "ArrowRight" ? 8 : 0),
              ),
            ),
            tilt: Math.max(
              -35,
              Math.min(
                25,
                p.tilt +
                  (e.key === "ArrowUp" ? -5 : e.key === "ArrowDown" ? 5 : 0),
              ),
            ),
          }));
        }
      }}
    >
      <div
        className="css-skyline-world"
        style={{
          transform: `rotateX(${pose.tilt}deg) rotateY(${pose.yaw}deg)`,
        }}
      >
        <div className="css-skyline-ground" />
        {buckets.map((b, i) => (
          <motion.button
            key={b.key}
            className={`css-tower x-period ${b.value === null ? "missing" : ""}`}
            initial={{
              height: reduced
                ? Math.max(0.5, ((b.value ?? 0) / max) * 250)
                : 0.5,
            }}
            animate={{ height: Math.max(0.5, ((b.value ?? 0) / max) * 250) }}
            transition={{
              duration: reduced ? 0 : 0.8,
              delay: reduced ? 0 : i * 0.015,
            }}
            style={{
              left: `${3 + (i / Math.max(1, buckets.length - 1)) * 90}%`,
              width: `${Math.min(5.5, 68 / Math.max(1, buckets.length))}%`,
              transform: `translateZ(${(i % 2) * 12}px)`,
            }}
            aria-label={`Explore ${bucketName(b)} · ${readout(b)}`}
            title={`${bucketName(b)} · ${readout(b)}`}
            onClick={(e) => {
              if (!dragged.current || e.detail === 0) onSelect(b.key);
            }}
          >
            <i className="css-tower-front" />
            <i className="css-tower-side" />
            <i className="css-tower-top" />
            <span>{b.label}</span>
          </motion.button>
        ))}
      </div>
      <span className="css-skyline-hint">
        DRAG TO TURN THE SCULPTURE · CLICK A TOWER TO GO CLOSER
      </span>
    </div>
  );
}

export default function DataLandscape({
  buckets,
  onSelect,
  paused,
}: {
  buckets: Bucket[];
  onSelect: (key: string) => void;
  paused: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null),
    wake = useRef<() => void>(() => {}),
    reduced = useReducedMotion();
  const [error, setError] = useState(""),
    [hover, setHover] = useState<number | null>(null),
    [front, setFront] = useState(false),
    [reset, setReset] = useState(0);
  const cameraState = useRef({ yaw: 0, tilt: 0, front: false });
  cameraState.current.front = front;
  const state = useRef({ buckets, onSelect, paused, reduced });
  state.current = { buckets, onSelect, paused, reduced };
  useEffect(() => {
    const canvas = canvasRef.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      const context = canvas.getContext("webgl2", {
        alpha: true,
        antialias: true,
      });
      if (!context) {
        setError("css");
        return;
      }
      renderer = new THREE.WebGLRenderer({
        canvas,
        context,
        alpha: true,
        antialias: true,
        powerPreference: "low-power",
      });
    } catch {
      setError(
        "3D rendering is unavailable here. The exact-count controls below still work.",
      );
      return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
    renderer.setClearColor(0x0c151b, 0);
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x101c22, 0.018);
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
    camera.position.set(10, 10, 16);
    camera.lookAt(0, 2, 0);
    scene.add(new THREE.HemisphereLight(0xdce9ed, 0x20362d, 2.6));
    const light = new THREE.DirectionalLight(0xffd6aa, 4);
    light.position.set(2, 10, 8);
    scene.add(light);
    const cool = new THREE.PointLight(0x88baf0, 30, 30);
    cool.position.set(-5, 3, -4);
    scene.add(cool);
    const world = new THREE.Group();
    scene.add(world);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(19, 9),
      new THREE.MeshStandardMaterial({
        color: 0x172b2b,
        roughness: 0.65,
        metalness: 0.15,
        transparent: true,
        opacity: 0.65,
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.045;
    world.add(floor);
    const grid = new THREE.GridHelper(18, 24, 0x607c73, 0x304c43);
    grid.position.y = -0.025;
    grid.scale.z = 0.5;
    world.add(grid);
    const bars: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>[] =
      [];
    const heights: number[] = [];
    let signature = "",
      frame = 0,
      inView = true,
      drag: { x: number; y: number; distance: number } | null = null,
      lastHover = -1;
    const ray = new THREE.Raycaster(),
      pointer = new THREE.Vector2();
    function sync() {
      const next = state.current.buckets
        .map((b) => `${b.key}:${b.value}`)
        .join(",");
      if (next === signature) return;
      signature = next;
      bars.forEach((b) => {
        world.remove(b);
        b.geometry.dispose();
        b.material.dispose();
      });
      bars.length = 0;
      heights.length = 0;
      const max = Math.max(
        1,
        ...state.current.buckets.map((b) => b.value ?? 0),
      );
      state.current.buckets.forEach((b, i) => {
        const positive = b.value !== null && b.value > 0;
        const mat = new THREE.MeshStandardMaterial({
          color: positive
            ? new THREE.Color().setHSL(
                0.12 +
                  0.43 * (i / Math.max(1, state.current.buckets.length - 1)),
                0.3,
                0.56,
              )
            : 0x2f4543,
          metalness: 0.32,
          roughness: 0.42,
          emissive: positive ? 0x849b67 : 0x000000,
          emissiveIntensity: 0.12,
          transparent: !positive,
          opacity: positive ? 1 : 0.32,
          wireframe: b.value === null,
        });
        const bar = new THREE.Mesh(
          new THREE.BoxGeometry(
            Math.min(0.85, 11 / state.current.buckets.length),
            1,
            0.85,
          ),
          mat,
        );
        bar.position.set(
          (i / Math.max(1, state.current.buckets.length - 1) - 0.5) * 14,
          0.001,
          ((i % 2) - 0.5) * 0.5,
        );
        bar.scale.y = 0.001;
        bar.userData.index = i;
        bars.push(bar);
        heights.push(positive ? (b.value! / max) * 6 : 0.025);
        world.add(bar);
      });
    }
    function render() {
      frame = 0;
      sync();
      const s = state.current,
        pose = cameraState.current;
      bars.forEach((bar, i) => {
        const factor = s.reduced || s.paused ? 1 : 0.14;
        bar.scale.y += (heights[i] - bar.scale.y) * factor;
        bar.position.y = bar.scale.y / 2;
        bar.material.emissiveIntensity = lastHover === i ? 0.55 : 0.12;
      });
      world.rotation.y = pose.yaw;
      world.rotation.x = pose.tilt;
      const target = pose.front
        ? new THREE.Vector3(0, 4.5, 21)
        : new THREE.Vector3(10, 10, 16);
      target.multiplyScalar(Math.max(1, 1.5 / camera.aspect));
      camera.position.lerp(target, s.reduced || s.paused ? 1 : 0.12);
      camera.lookAt(0, 2, 0);
      renderer.render(scene, camera);
      if (!s.paused && !s.reduced && inView && !document.hidden)
        frame = requestAnimationFrame(render);
    }
    function start() {
      if (!frame && inView && !document.hidden)
        frame = requestAnimationFrame(render);
    }
    wake.current = start;
    const resize = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      start();
    });
    resize.observe(canvas);
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      if (inView) start();
      else {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    });
    observer.observe(canvas);
    const hit = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      pointer.set(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        (-(e.clientY - r.top) / r.height) * 2 + 1,
      );
      ray.setFromCamera(pointer, camera);
      return ray.intersectObjects(bars, false)[0]?.object.userData.index as
        | number
        | undefined;
    };
    const down = (e: PointerEvent) => {
      drag = { x: e.clientX, y: e.clientY, distance: 0 };
      canvas.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (drag) {
        const dx = e.clientX - drag.x,
          dy = e.clientY - drag.y;
        drag.distance += Math.abs(dx) + Math.abs(dy);
        cameraState.current.yaw += dx * 0.007;
        cameraState.current.tilt = THREE.MathUtils.clamp(
          cameraState.current.tilt + dy * 0.002,
          -0.12,
          0.35,
        );
        drag.x = e.clientX;
        drag.y = e.clientY;
        start();
      } else {
        const index = hit(e) ?? -1;
        if (index !== lastHover) {
          lastHover = index;
          setHover(index < 0 ? null : index);
          canvas.style.cursor = index < 0 ? "grab" : "pointer";
          start();
        }
      }
    };
    const up = (e: PointerEvent) => {
      if (drag && drag.distance < 7) {
        const index = hit(e);
        if (index !== undefined)
          state.current.onSelect(state.current.buckets[index].key);
      }
      drag = null;
    };
    const cancel = () => {
      drag = null;
    };
    const visibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(frame);
        frame = 0;
      } else start();
    };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", cancel);
    document.addEventListener("visibilitychange", visibility);
    start();
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      observer.disconnect();
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", cancel);
      document.removeEventListener("visibilitychange", visibility);
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments) {
          o.geometry.dispose();
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach((m) => m.dispose());
        }
      });
      renderer.dispose();
      renderer.forceContextLoss();
      wake.current = () => {};
    };
  }, []);
  useEffect(() => {
    wake.current();
  }, [buckets, paused, reduced, front]);
  return (
    <div className="landscape-scene">
      <div className="landscape-controls">
        <span>
          <Move3D size={14} /> Drag to orbit · click a tower to enter
        </span>
        <button onClick={() => setFront((v) => !v)} aria-pressed={front}>
          {front ? "Perspective view" : "Head-on view"}
        </button>
        <button
          aria-label="Reset 3D camera"
          onClick={() => {
            cameraState.current = { yaw: 0, tilt: 0, front: false };
            setFront(false);
            setReset((n) => n + 1);
            wake.current();
          }}
        >
          <RotateCcw size={14} />
        </button>
      </div>
      {error ? (
        <CssLandscape
          buckets={buckets}
          onSelect={onSelect}
          front={front}
          reset={reset}
        />
      ) : null}
      <canvas
        ref={canvasRef}
        className={error ? "landscape-unused-canvas" : ""}
        tabIndex={0}
        role="group"
        aria-label="3D detection skyline. Drag to orbit, or use arrow keys to rotate. Use the period buttons below for exact values and drilldown."
        onKeyDown={(e) => {
          if (
            ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)
          ) {
            e.preventDefault();
            if (e.key === "ArrowLeft") cameraState.current.yaw -= 0.15;
            if (e.key === "ArrowRight") cameraState.current.yaw += 0.15;
            if (e.key === "ArrowUp")
              cameraState.current.tilt = Math.max(
                -0.12,
                cameraState.current.tilt - 0.05,
              );
            if (e.key === "ArrowDown")
              cameraState.current.tilt = Math.min(
                0.35,
                cameraState.current.tilt + 0.05,
              );
            wake.current();
          }
        }}
      />
      <div className="landscape-tooltip" aria-live="polite">
        {hover !== null && buckets[hover] ? (
          <>
            <strong>{bucketName(buckets[hover])}</strong>
            <span>{readout(buckets[hover])}</span>
          </>
        ) : (
          <>
            <strong>Height = reported detections</strong>
            <span>
              Time runs left to right. Perspective changes appearance, not
              counts.
            </span>
          </>
        )}
      </div>
    </div>
  );
}
