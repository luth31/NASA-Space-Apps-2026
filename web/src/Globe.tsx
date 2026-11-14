import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { useReducedMotion } from "motion/react";
import type { Observation } from "./data";

const location = (lon: number, lat: number, r = 1) =>
  new THREE.Vector3(
    r * Math.cos((lat * Math.PI) / 180) * Math.cos((lon * Math.PI) / 180),
    r * Math.sin((lat * Math.PI) / 180),
    -r * Math.cos((lat * Math.PI) / 180) * Math.sin((lon * Math.PI) / 180),
  );
interface Props {
  observations: Observation[];
  onSelect: (o: Observation) => void;
  onCase: () => void;
  focus?: Observation | null;
  destination?: [number, number];
  zoom: number;
  reset: number;
}
export default function Globe({
  observations,
  onSelect,
  onCase,
  focus,
  destination,
  zoom,
  reset,
}: Props) {
  const [hover, setHover] = useState<{
    x: number;
    y: number;
    label: string;
    detail: string;
  } | null>(null);
  const host = useRef<HTMLDivElement>(null);
  const marker = useRef<HTMLButtonElement>(null);
  const latest = useRef({ onSelect, onCase, focus, destination, zoom, reset });
  latest.current = { onSelect, onCase, focus, destination, zoom, reset };
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!host.current) return;
    const el = host.current;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(37, 1, 0.1, 100);
    camera.position.copy(location(24, 19, 3.5));
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      el.dataset.failed = "true";
      return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    renderer.setClearColor(0, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);
    renderer.domElement.setAttribute(
      "aria-label",
      "Interactive Earth with NASA hotspot detections. Drag to rotate, scroll to zoom. Observations are also available in the list.",
    );
    renderer.domElement.setAttribute("role", "img");
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.enablePan = false;
    controls.minDistance = 1.45;
    controls.maxDistance = 5;
    controls.rotateSpeed = 0.45;
    controls.zoomSpeed = 0.7;
    controls.autoRotate = !reduced;
    controls.autoRotateSpeed = 0.14;
    const texture = new THREE.TextureLoader().load(
      "/assets/earth-blue-marble.jpg",
    );
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const earth = new THREE.Mesh(
      new THREE.SphereGeometry(1, 96, 64),
      new THREE.MeshPhongMaterial({
        map: texture,
        shininess: 3,
        color: 0x95a6a5,
      }),
    );
    scene.add(earth);
    scene.add(new THREE.AmbientLight(0xc3d2de, 1.5));
    const sun = new THREE.DirectionalLight(0xfff2df, 2);
    sun.position.set(4, 3, 3);
    scene.add(sun);
    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.016, 72, 48),
      new THREE.ShaderMaterial({
        transparent: true,
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {},
        vertexShader:
          "varying vec3 vNormal; varying vec3 vView; void main(){ vec4 p=modelViewMatrix*vec4(position,1.0);vNormal=normalize(normalMatrix*normal);vView=normalize(-p.xyz);gl_Position=projectionMatrix*p;}",
        fragmentShader:
          "varying vec3 vNormal;varying vec3 vView;void main(){float rim=pow(1.0-abs(dot(vNormal,vView)),4.0);gl_FragColor=vec4(0.33,0.54,0.62,rim*0.55);}",
      }),
    );
    scene.add(atmosphere);
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(observations.length * 3);
    const colors = new Float32Array(observations.length * 3);
    observations.forEach((o, i) => {
      const v = location(o.lon, o.lat, 1.006);
      positions.set([v.x, v.y, v.z], i * 3);
      const c = new THREE.Color(
        o.frp !== null && o.frp > 100 ? "#fff0cd" : "#ff9255",
      );
      colors.set([c.r, c.g, c.b], i * 3);
    });
    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const points = new THREE.Points(
      geom,
      new THREE.ShaderMaterial({
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        uniforms: { pointSize: { value: 2.4 * renderer.getPixelRatio() } },
        vertexShader:
          "varying vec3 vColor;uniform float pointSize;void main(){vColor=color;vec4 mv=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(pointSize*2.5/-mv.z,1.4,9.0);}",
        fragmentShader:
          "varying vec3 vColor;void main(){float d=length(gl_PointCoord-0.5);if(d>0.5)discard;float a=smoothstep(0.5,0.12,d);gl_FragColor=vec4(vColor,a*0.92);\n#include <colorspace_fragment>\n}",
      }),
    );
    scene.add(points);
    const grouped = new Map<
      string,
      { lon: number; lat: number; count: number; representative: Observation }
    >();
    observations.forEach((o) => {
      const key = Math.floor(o.lon / 1.5) + ":" + Math.floor(o.lat / 1.5);
      const previous = grouped.get(key);
      if (previous) {
        previous.lon += o.lon;
        previous.lat += o.lat;
        previous.count++;
        if ((o.frp ?? 0) > (previous.representative.frp ?? 0))
          previous.representative = o;
      } else
        grouped.set(key, {
          lon: o.lon,
          lat: o.lat,
          count: 1,
          representative: o,
        });
    });
    const clusters = [...grouped.values()].map((c) => ({
      ...c,
      lon: c.lon / c.count,
      lat: c.lat / c.count,
    }));
    const cg = new THREE.BufferGeometry();
    cg.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        clusters.flatMap((c) => location(c.lon, c.lat, 1.009).toArray()),
        3,
      ),
    );
    cg.setAttribute(
      "weight",
      new THREE.Float32BufferAttribute(
        clusters.map(
          (c) =>
            Math.min(16, 3 + Math.log2(c.count + 1) * 1.4) *
            renderer.getPixelRatio(),
        ),
        1,
      ),
    );
    const clusterPoints = new THREE.Points(
      cg,
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        vertexShader:
          "attribute float weight;void main(){vec4 mv=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*mv;gl_PointSize=weight*2.5/-mv.z;}",
        fragmentShader:
          "void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;float rim=smoothstep(.5,.38,d);float center=smoothstep(.23,.08,d);gl_FragColor=vec4(1.0,.65,.35,rim*(.2+.65*center));}",
      }),
    );
    scene.add(clusterPoints);

    const graticule = new THREE.Group();
    for (let lat = -60; lat <= 60; lat += 30) {
      const a = [];
      for (let l = -180; l <= 180; l += 2) a.push(location(l, lat, 1.001));
      graticule.add(
        new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(a),
          new THREE.LineBasicMaterial({
            color: 0xc5d1cd,
            transparent: true,
            opacity: 0.05,
          }),
        ),
      );
    }
    scene.add(graticule);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.013, 0.017, 40),
      new THREE.MeshBasicMaterial({
        color: "#ffe4c8",
        side: THREE.DoubleSide,
        transparent: true,
      }),
    );
    ring.visible = false;
    scene.add(ring);
    const raycaster = new THREE.Raycaster();
    raycaster.params.Points.threshold = 0.013;
    const pointer = new THREE.Vector2();
    let down = { x: 0, y: 0 };
    function pointerDown(e: PointerEvent) {
      down = { x: e.clientX, y: e.clientY };
      controls.autoRotate = false;
    }
    function pick(e: PointerEvent) {
      const rect = el.getBoundingClientRect();
      pointer.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        (-(e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      const clustered = camera.position.length() > 2.6;
      const hit = raycaster
        .intersectObject(clustered ? clusterPoints : points)
        .find((h) => {
          if (h.index === undefined) return false;
          const o = clustered ? clusters[h.index] : observations[h.index];
          return location(o.lon, o.lat).dot(camera.position) > 0.9;
        });
      if (hit?.index === undefined) return null;
      const o = clustered
        ? clusters[hit.index].representative
        : observations[hit.index];
      return { o, count: clustered ? clusters[hit.index].count : 1 };
    }
    function pointerUp(e: PointerEvent) {
      if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return;
      const hit = pick(e);
      if (hit) latest.current.onSelect(hit.o);
    }
    let hoverTime = 0;
    function pointerMove(e: PointerEvent) {
      if (e.buttons || performance.now() - hoverTime < 100) return;
      hoverTime = performance.now();
      const hit = pick(e);
      const rect = el.getBoundingClientRect();
      setHover(
        hit
          ? {
              x: e.clientX - rect.left,
              y: e.clientY - rect.top,
              label:
                hit.count > 1
                  ? hit.count.toLocaleString() + " detections in this cluster"
                  : "Satellite hotspot",
              detail:
                hit.count > 1
                  ? "Click to inspect and zoom in"
                  : hit.o.lat.toFixed(3) + "°, " + hit.o.lon.toFixed(3) + "°",
            }
          : null,
      );
      renderer.domElement.style.cursor = hit ? "pointer" : "grab";
    }
    function pointerLeave() {
      setHover(null);
    }
    renderer.domElement.addEventListener("pointerdown", pointerDown);
    renderer.domElement.addEventListener("pointerup", pointerUp);
    renderer.domElement.addEventListener("pointermove", pointerMove);
    renderer.domElement.addEventListener("pointerleave", pointerLeave);
    const resize = new ResizeObserver(() => {
      const w = el.clientWidth,
        h = el.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resize.observe(el);
    let frame = 0;
    let lastFocus = "";
    let lastZoom = zoom;
    let lastReset = reset;
    let target: THREE.Vector3 | null = null;
    let flightKey = "";
    let flight: {
      from: THREE.Vector3;
      to: THREE.Vector3;
      time: number;
    } | null = null;
    function animate() {
      frame = requestAnimationFrame(animate);
      const f = latest.current.focus;
      const dest = latest.current.destination;
      if (dest && dest.join(",") !== flightKey) {
        flightKey = dest.join(",");
        flight = {
          from: camera.position.clone(),
          to: location(dest[0], dest[1], 1.22),
          time: performance.now(),
        };
        controls.autoRotate = false;
        controls.enabled = false;
        controls.minDistance = 1.05;
        target = null;
      }
      if (flight) {
        const t = Math.min(1, (performance.now() - flight.time) / 1550);
        const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        const rotation = new THREE.Quaternion().setFromUnitVectors(
          flight.from.clone().normalize(),
          flight.to.clone().normalize(),
        );
        const direction = flight.from
          .clone()
          .normalize()
          .applyQuaternion(new THREE.Quaternion().slerp(rotation, e));
        camera.position.copy(
          direction.multiplyScalar(
            THREE.MathUtils.lerp(flight.from.length(), 1.22, e),
          ),
        );
        camera.lookAt(0, 0, 0);
        if (t === 1) flight = null;
      }
      if (!dest && flightKey) {
        flightKey = "";
        flight = null;
        controls.enabled = true;
        controls.minDistance = 1.45;
      }
      if (f && f.id !== lastFocus) {
        target = location(f.lon, f.lat, 2.45);
        lastFocus = f.id;
        controls.autoRotate = false;
        ring.position.copy(location(f.lon, f.lat, 1.012));
        ring.lookAt(location(f.lon, f.lat, 2));
        ring.visible = true;
      }
      if (!f) {
        ring.visible = false;
        lastFocus = "";
      }
      if (lastZoom !== latest.current.zoom) {
        target = camera.position
          .clone()
          .normalize()
          .multiplyScalar(
            THREE.MathUtils.clamp(
              camera.position.length() *
                (latest.current.zoom > lastZoom ? 0.8 : 1.25),
              1.45,
              5,
            ),
          );
        lastZoom = latest.current.zoom;
      }
      if (lastReset !== latest.current.reset) {
        target = location(24, 19, 3.5);
        lastReset = latest.current.reset;
        controls.autoRotate = !reduced;
      }
      if (target) {
        camera.position.lerp(target, reduced ? 1 : 0.065);
        if (camera.position.distanceTo(target) < 0.005) target = null;
      }
      if (!dest) controls.update();
      points.visible = camera.position.length() <= 2.6;
      clusterPoints.visible = !points.visible;
      const pos = location(26.05, 41.025, 1.03);
      const visible = pos.dot(camera.position) > 1.1;
      pos.project(camera);
      if (marker.current) {
        marker.current.style.transform = `translate(${((pos.x + 1) / 2) * el.clientWidth}px,${((1 - pos.y) / 2) * el.clientHeight}px)`;
        marker.current.style.opacity = visible ? "1" : "0";
        marker.current.style.visibility =
          visible && !dest ? "visible" : "hidden";
        marker.current.style.pointerEvents = visible ? "auto" : "none";
      }
      renderer.render(scene, camera);
    }
    animate();
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener("pointerdown", pointerDown);
      renderer.domElement.removeEventListener("pointerup", pointerUp);
      renderer.domElement.removeEventListener("pointermove", pointerMove);
      renderer.domElement.removeEventListener("pointerleave", pointerLeave);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        if (m.material) {
          (Array.isArray(m.material) ? m.material : [m.material]).forEach((x) =>
            x.dispose(),
          );
        }
      });
      texture.dispose();
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
  }, [observations, reduced]);
  return (
    <div className="globe-wrap">
      <div className="globe-canvas" ref={host}>
        <div className="webgl-fallback">
          The interactive globe requires WebGL. All observations remain
          available in the list.
        </div>
      </div>
      <button
        ref={marker}
        className="globe-callout"
        onClick={onCase}
        tabIndex={0}
      >
        <span className="pin" />
        <span className="callout-line" />
        <span className="callout-label">
          <span className="mono">FEATURED INVESTIGATION</span>
          <strong>
            Evros, Greece <span>↗</span>
          </strong>
          <small>22 AUG 2023 · OPEN CASE</small>
        </span>
      </button>
      {hover && (
        <div
          className="globe-tooltip"
          style={{ left: hover.x + 15, top: hover.y + 15 }}
        >
          <strong>{hover.label}</strong>
          <span>{hover.detail}</span>
        </div>
      )}
      <div className="orbital-label mono">
        NASA BLUE MARBLE · AUG 2004 COMPOSITE
      </div>
    </div>
  );
}
