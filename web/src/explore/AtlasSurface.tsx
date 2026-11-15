import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { Bounds, GeoData, Sector } from "./geography";
import { coordinate, polygons, RAD } from "./geography";

interface Props {
  open: boolean;
  paused: boolean;
  reduced: boolean;
  bounds: Bounds;
  data: GeoData | null;
  bins: Sector[];
  points?: { lon: number; lat: number }[];
  anchors: {
    key: string;
    label: string;
    lon: number;
    lat: number;
    kind: "study" | "continent";
  }[];
  onAnchor: (key: string) => void;
  onPick: (lon: number, lat: number) => void;
  onZoom: (direction: number, at?: [number, number]) => void;
  onHover: (lon: number, lat: number) => void;
  variant: "unwrap" | "ellipsoid";
}
const geographicVertex = `
uniform float unfolding; uniform float meridian; uniform float radius; uniform float variant;
vec3 geographic(vec3 p) {
 float lon = p.x - meridian; float lat = p.y;
 vec3 globe = vec3(radius*cos(lat)*sin(lon),radius*sin(lat),radius*cos(lat)*cos(lon));
 float t = unfolding;
 if (variant > .5) { globe.x *= 1.0 + sin(t*3.14159265)*.35; }
 return mix(globe,vec3(p.xy,p.z),t);
}`;
export default function AtlasSurface(props: Props) {
  const host = useRef<HTMLDivElement>(null);
  const wakeRef = useRef<() => void>(() => {});
  const latest = useRef(props);
  latest.current = props;
  const labels = useRef(new Map<string, HTMLButtonElement>());
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!host.current) return;
    const el = host.current;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "low-power",
      });
    } catch {
      setFailed(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.65));
    renderer.setClearColor(0, 0);
    el.prepend(renderer.domElement);
    renderer.domElement.setAttribute("aria-hidden", "true");
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-4, 4, 2.25, -2.25, 0.01, 40);
    camera.position.set(0, 0, 10);
    const uniforms = {
      unfolding: { value: 0 },
      meridian: { value: 15 * RAD },
      radius: { value: 1.45 },
      variant: { value: props.variant === "ellipsoid" ? 1 : 0 },
    };
    const texture = new THREE.TextureLoader().load(
      "/assets/earth-blue-marble.jpg",
      () => wake(),
    );
    texture.colorSpace = THREE.SRGBColorSpace;
    const earthMaterial = new THREE.ShaderMaterial({
      uniforms: { ...uniforms, globeTexture: { value: texture } },
      vertexShader: `${geographicVertex} varying vec2 vUv; varying float light; void main(){ vUv=uv; vec3 p=geographic(position); light=.55+.45*max(0.0,cos(position.x-meridian)*cos(position.y)); gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.); }`,
      fragmentShader: `uniform sampler2D globeTexture; uniform float unfolding; varying vec2 vUv; varying float light; void main(){ vec3 tex=texture2D(globeTexture,vUv).rgb; vec3 globe=tex*light*1.25; vec3 atlas=mix(tex*.6,vec3(.14,.22,.19),.58); gl_FragColor=vec4(mix(globe,atlas,unfolding),1.); }`,
      side: THREE.FrontSide,
    });
    const earth = new THREE.Mesh(
      new THREE.PlaneGeometry(Math.PI * 2, Math.PI, 160, 80),
      earthMaterial,
    );
    scene.add(earth);
    function lineMaterial(color: string, opacity: number) {
      return new THREE.ShaderMaterial({
        uniforms: {
          ...uniforms,
          radius: { value: 1.455 },
          ink: { value: new THREE.Color(color) },
          alpha: { value: opacity },
        },
        transparent: true,
        depthWrite: false,
        vertexShader: `${geographicVertex} void main(){ gl_Position=projectionMatrix*modelViewMatrix*vec4(geographic(position),1.); }`,
        fragmentShader:
          "uniform vec3 ink; uniform float alpha; uniform float unfolding; void main(){gl_FragColor=vec4(ink,alpha*(.35+.65*unfolding));}",
      });
    }
    const lines: number[] = [];
    for (let lat = -60; lat <= 60; lat += 30)
      for (let lon = -180; lon < 180; lon += 3)
        lines.push(
          lon * RAD,
          lat * RAD,
          0.006,
          (lon + 3) * RAD,
          lat * RAD,
          0.006,
        );
    for (let lon = -180; lon <= 180; lon += 30)
      for (let lat = -87; lat < 87; lat += 3)
        lines.push(
          lon * RAD,
          lat * RAD,
          0.006,
          lon * RAD,
          (lat + 3) * RAD,
          0.006,
        );
    const grid = new THREE.LineSegments(
      new THREE.BufferGeometry().setAttribute(
        "position",
        new THREE.Float32BufferAttribute(lines, 3),
      ),
      lineMaterial("#c2d8cf", 0.16),
    );
    scene.add(grid);
    let borders: THREE.LineSegments | null = null,
      markers: THREE.Points | null = null;
    let lastData: GeoData | null = null,
      lastBins: Sector[] | null = null,
      lastPoints: Props["points"];
    function rebuild() {
      const p = latest.current;
      if (p.data && p.data !== lastData) {
        lastData = p.data;
        const coordinates: number[] = [];
        for (const country of p.data.features)
          for (const polygon of polygons(country))
            for (const ring of polygon)
              for (let i = 1; i < ring.length; i++) {
                const a = ring[i - 1],
                  b = ring[i];
                if (Math.abs(a[0] - b[0]) < 180)
                  coordinates.push(
                    a[0] * RAD,
                    a[1] * RAD,
                    0.012,
                    b[0] * RAD,
                    b[1] * RAD,
                    0.012,
                  );
              }
        borders = new THREE.LineSegments(
          new THREE.BufferGeometry().setAttribute(
            "position",
            new THREE.Float32BufferAttribute(coordinates, 3),
          ),
          lineMaterial("#c3d8c7", 0.45),
        );
        scene.add(borders);
      }
      if (p.bins !== lastBins || p.points !== lastPoints) {
        lastBins = p.bins;
        lastPoints = p.points;
        if (markers) {
          scene.remove(markers);
          markers.geometry.dispose();
          (markers.material as THREE.Material).dispose();
        }
        const items = p.points || p.bins;
        const geo = new THREE.BufferGeometry().setAttribute(
          "position",
          new THREE.Float32BufferAttribute(
            items.flatMap((o) => [o.lon * RAD, o.lat * RAD, 0.025]),
            3,
          ),
        );
        geo.setAttribute(
          "weight",
          new THREE.Float32BufferAttribute(
            items.map((o) =>
              p.points
                ? 2.6
                : Math.min(8, 1.8 + Math.log2((o as Sector).count + 1) * 0.7),
            ),
            1,
          ),
        );
        markers = new THREE.Points(
          geo,
          new THREE.ShaderMaterial({
            uniforms: {
              ...uniforms,
              radius: { value: 1.462 },
              pixelRatio: { value: renderer.getPixelRatio() },
            },
            transparent: true,
            depthWrite: false,
            vertexShader: `${geographicVertex} attribute float weight; uniform float pixelRatio; void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(geographic(position),1.);gl_PointSize=weight*pixelRatio;}`,
            fragmentShader:
              "void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;float a=smoothstep(.5,.22,d);gl_FragColor=vec4(1.,.59,.31,a*.9);}",
          }),
        );
        scene.add(markers);
      }
    }
    let width = 1,
      height = 1,
      visible = true,
      raf = 0,
      previous = 0,
      dirty = true;
    let currentBounds: Bounds = [-180, -90, 180, 90],
      lastBounds = props.bounds;
    let pan = { x: 0, y: 0 },
      targetZoom = 1,
      zoom = 1;
    let pointer: {
      x: number;
      y: number;
      initialX: number;
      initialY: number;
    } | null = null;
    const pointers = new Map<number, { x: number; y: number }>();
    let pinchDistance = 0;
    let pinched = false;
    const resize = new ResizeObserver(() => {
      width = el.clientWidth;
      height = el.clientHeight;
      renderer.setSize(width, height);
      dirty = true;
      wake();
    });
    resize.observe(el);
    const intersection = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      wake();
    });
    intersection.observe(el);
    function wake() {
      if (!raf && visible && !document.hidden)
        raf = requestAnimationFrame(draw);
    }
    function visibility() {
      wake();
    }
    document.addEventListener("visibilitychange", visibility);
    function draw(now: number) {
      raf = 0;
      if (!visible || document.hidden) return;
      const p = latest.current;
      rebuild();
      const dt = Math.min(50, now - (previous || now));
      previous = now;
      const desired = p.open ? 1 : 0;
      const rate = p.reduced ? 1 : 1 - Math.exp(-dt / 210);
      uniforms.unfolding.value += (desired - uniforms.unfolding.value) * rate;
      if (Math.abs(desired - uniforms.unfolding.value) < 0.001)
        uniforms.unfolding.value = desired;
      uniforms.variant.value = p.variant === "ellipsoid" ? 1 : 0;
      if (!p.open && !p.paused && !p.reduced && !pointer)
        uniforms.meridian.value += dt * 0.000018;
      if (p.bounds !== lastBounds) {
        lastBounds = p.bounds;
        pan = { x: 0, y: 0 };
        dirty = true;
      }
      currentBounds = currentBounds.map(
        (n, i) => n + (p.bounds[i] - n) * rate,
      ) as Bounds;
      const aspect = width / Math.max(1, height);
      const extentX = (currentBounds[2] - currentBounds[0]) * RAD;
      const extentY = (currentBounds[3] - currentBounds[1]) * RAD;
      const centerX = ((currentBounds[0] + currentBounds[2]) / 2) * RAD;
      const centerY = ((currentBounds[1] + currentBounds[3]) / 2) * RAD;
      const t = uniforms.unfolding.value;
      const frameH = Math.max(3.75, 6.7 / aspect);
      const flatH = Math.max(extentY * 1.22, (extentX / aspect) * 1.14, 0.03);
      const viewH = frameH * (1 - t) + flatH * t;
      targetZoom = 1;
      zoom += (targetZoom - zoom) * rate;
      camera.left = (-viewH * aspect) / 2;
      camera.right = (viewH * aspect) / 2;
      camera.top = viewH / 2;
      camera.bottom = -viewH / 2;
      camera.position.set(centerX * t + pan.x, centerY * t + pan.y, 10);
      camera.zoom = zoom;
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
      for (const a of p.anchors) {
        const node = labels.current.get(a.key);
        if (!node) continue;
        const xyz = coordinate(
          a.lon,
          a.lat,
          t,
          uniforms.meridian.value / RAD,
          1.47,
        );
        const vector = new THREE.Vector3(...xyz).project(camera);
        const front =
          t > 0.4 ||
          Math.cos(a.lon * RAD - uniforms.meridian.value) *
            Math.cos(a.lat * RAD) >
            0.1;
        const show =
          front && Math.abs(vector.x) < 0.94 && Math.abs(vector.y) < 0.9;
        node.style.transform = `translate(${((vector.x + 1) * width) / 2}px,${((1 - vector.y) * height) / 2}px)`;
        node.style.visibility = show ? "visible" : "hidden";
      }
      renderer.render(scene, camera);
      const moving =
        Math.abs(desired - t) > 0.001 ||
        currentBounds.some((n, i) => Math.abs(p.bounds[i] - n) > 0.005) ||
        (!p.open && !p.paused && !p.reduced);
      if (moving || dirty) {
        dirty = false;
        wake();
      }
    }
    function point(e: { clientX: number; clientY: number }) {
      const r = el.getBoundingClientRect();
      const x =
        ((((e.clientX - r.left) / width) * 2 - 1) *
          (camera.right - camera.left)) /
          2 +
        camera.position.x;
      const y =
        ((1 - ((e.clientY - r.top) / height) * 2) *
          (camera.top - camera.bottom)) /
          2 +
        camera.position.y;
      if (latest.current.open) return [x / RAD, y / RAD];
      const z = Math.sqrt(Math.max(0, 1.45 ** 2 - x * x - y * y));
      return [
        Math.atan2(x, z) / RAD + uniforms.meridian.value / RAD,
        Math.asin(Math.max(-1, Math.min(1, y / 1.45))) / RAD,
      ];
    }
    function down(e: PointerEvent) {
      if ((e.target as HTMLElement).closest("button")) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1) pinched = false;
      if (pointers.size === 2) {
        pinched = true;
        const [a, b] = [...pointers.values()];
        pinchDistance = Math.hypot(a.x - b.x, a.y - b.y);
      }
      pointer = {
        x: e.clientX,
        y: e.clientY,
        initialX: e.clientX,
        initialY: e.clientY,
      };
      el.setPointerCapture(e.pointerId);
      wake();
    }
    function move(e: PointerEvent) {
      if (pointers.has(e.pointerId))
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (Math.abs(d - pinchDistance) > 55) {
          latest.current.onZoom(
            d > pinchDistance ? 1 : -1,
            point({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 }) as [
              number,
              number,
            ],
          );
          pinchDistance = d;
        }
        return;
      }
      if (pointer) {
        const dx = e.clientX - pointer.x,
          dy = e.clientY - pointer.y;
        if (latest.current.open) {
          pan.x -= (dx / width) * (camera.right - camera.left);
          pan.y += (dy / height) * (camera.top - camera.bottom);
        } else uniforms.meridian.value -= dx * 0.006;
        pointer.x = e.clientX;
        pointer.y = e.clientY;
        dirty = true;
        wake();
      } else {
        const [lon, lat] = point(e);
        latest.current.onHover(lon, lat);
      }
    }
    function up(e: PointerEvent) {
      const click =
        !pinched &&
        pointer &&
        Math.hypot(e.clientX - pointer.initialX, e.clientY - pointer.initialY) <
          7 &&
        pointers.size < 2;
      pointers.delete(e.pointerId);
      if (pointers.size === 0) pointer = null;
      if (click) {
        const [lon, lat] = point(e);
        latest.current.onPick(lon, lat);
      }
      wake();
    }
    let lastWheel = 0;
    function wheel(e: WheelEvent) {
      e.preventDefault();
      if (performance.now() - lastWheel > 380) {
        latest.current.onZoom(
          e.deltaY < 0 ? 1 : -1,
          point(e) as [number, number],
        );
        lastWheel = performance.now();
      }
    }
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("wheel", wheel, { passive: false });
    wakeRef.current = () => {
      dirty = true;
      wake();
    };
    wake();
    return () => {
      cancelAnimationFrame(raf);
      wakeRef.current = () => {};
      resize.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("wheel", wheel);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        if (m.material)
          (Array.isArray(m.material) ? m.material : [m.material]).forEach((x) =>
            x.dispose(),
          );
      });
      texture.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);
  useEffect(() => wakeRef.current(), [props]);
  return (
    <div
      ref={host}
      className={`atlas-surface ${failed ? "has-failed" : ""}`}
      aria-label="Interactive geographic atlas"
      role="group"
    >
      {failed && (
        <div className="atlas-fallback">
          The 3D view is unavailable here. Use the geographic buttons and
          observation list below.
        </div>
      )}
      {props.anchors.map((a) => (
        <button
          className={`atlas-anchor atlas-anchor-${a.kind}`}
          key={a.key}
          ref={(node) => {
            if (node) labels.current.set(a.key, node);
            else labels.current.delete(a.key);
          }}
          onClick={() => props.onAnchor(a.key)}
        >
          <i />
          {a.label}
        </button>
      ))}
    </div>
  );
}
