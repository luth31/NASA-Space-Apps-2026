import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { geoContains } from "d3-geo";
import { useReducedMotion } from "motion/react";
import { drawFire } from "./fireSymbol";
import type { Area } from "./geography";
import { integer } from "../data";

const position = (lon: number, lat: number, radius = 1) =>
  new THREE.Vector3(
    radius * Math.cos((lat * Math.PI) / 180) * Math.cos((lon * Math.PI) / 180),
    radius * Math.sin((lat * Math.PI) / 180),
    -radius * Math.cos((lat * Math.PI) / 180) * Math.sin((lon * Math.PI) / 180),
  );

export default function OrbitalEarth({
  areas,
  signals,
  onOpen,
  paused,
}: {
  areas: Area[];
  signals: Area[];
  onOpen: (area: Area) => void;
  paused: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const latest = useRef({ areas, onOpen, paused });
  latest.current = { areas, onOpen, paused };
  const [hover, setHover] = useState<{
    area: Area;
    x: number;
    y: number;
  } | null>(null);
  const [failed, setFailed] = useState(false);
  const reduced = useReducedMotion();
  useEffect(() => {
    const el = host.current!;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 50);
    camera.position.copy(position(19, 15, 3.3));
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      });
    } catch {
      setFailed(true);
      return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0, 0);
    el.appendChild(renderer.domElement);
    renderer.domElement.setAttribute(
      "aria-label",
      "Earth seen from space. Drag to turn it. Select land to explore that region.",
    );
    renderer.domElement.setAttribute("role", "img");
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.085;
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.rotateSpeed = 0.4;
    controls.autoRotateSpeed = 0.24;
    const texture = new THREE.TextureLoader().load(
      "/assets/earth-blue-marble.jpg",
    );
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const earth = new THREE.Mesh(
      new THREE.SphereGeometry(1, 96, 64),
      new THREE.MeshPhongMaterial({
        map: texture,
        shininess: 6,
        color: 0xdbe7e8,
      }),
    );
    scene.add(earth, new THREE.AmbientLight(0xe2edfa, 1.65));
    const sun = new THREE.DirectionalLight(0xffefdc, 2.4);
    scene.add(sun);
    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.012, 64, 48),
      new THREE.ShaderMaterial({
        transparent: true,
        side: THREE.BackSide,
        depthWrite: false,
        vertexShader:
          "varying vec3 normalView; varying vec3 eye; void main(){vec4 p=modelViewMatrix*vec4(position,1.);normalView=normalize(normalMatrix*normal);eye=normalize(-p.xyz);gl_Position=projectionMatrix*p;}",
        fragmentShader:
          "varying vec3 normalView;varying vec3 eye;void main(){float edge=pow(1.-abs(dot(normalView,eye)),3.);gl_FragColor=vec4(.18,.52,.85,edge*.38);}",
      }),
    );
    scene.add(atmosphere);
    const symbol = document.createElement("canvas");
    symbol.width = 64;
    symbol.height = 64;
    drawFire(symbol.getContext("2d")!, 9, 31, 44);
    const symbolTexture = new THREE.CanvasTexture(symbol);
    symbolTexture.colorSpace = THREE.SRGBColorSpace;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        signals.flatMap((a) =>
          position(a.point[0], a.point[1], 1.013).toArray(),
        ),
        3,
      ),
    );
    geometry.setAttribute(
      "weight",
      new THREE.Float32BufferAttribute(
        signals.map((a) =>
          Math.min(19, 9 + Math.log2(a.rows.length + 1) * 0.8),
        ),
        1,
      ),
    );
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        symbol: { value: symbolTexture },
        ratio: { value: renderer.getPixelRatio() },
      },
      vertexShader:
        "attribute float weight;uniform float ratio;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;gl_PointSize=weight*ratio*2.5/-mv.z;}",
      fragmentShader:
        "uniform sampler2D symbol;void main(){vec4 c=texture2D(symbol,vec2(gl_PointCoord.x,1.-gl_PointCoord.y));if(c.a<.08)discard;gl_FragColor=c;\n#include <colorspace_fragment>\n}",
    });
    const fires = new THREE.Points(geometry, material);
    scene.add(fires);
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let down = { x: 0, y: 0 };
    let interacted = false;
    let previousPaused = paused;
    let over = false;
    let lastHover = "";
    function pick(event: PointerEvent) {
      const rect = el.getBoundingClientRect();
      pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        1 - ((event.clientY - rect.top) / rect.height) * 2,
      );
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObject(earth)[0];
      if (!hit) return null;
      const p = hit.point.normalize();
      const lon = (Math.atan2(-p.z, p.x) * 180) / Math.PI,
        lat = (Math.asin(p.y) * 180) / Math.PI;
      return (
        latest.current.areas.find(
          (a) => a.geometry && geoContains(a.geometry, [lon, lat]),
        ) ?? null
      );
    }
    function onDown(e: PointerEvent) {
      down = { x: e.clientX, y: e.clientY };
      interacted = true;
      setHover(null);
    }
    function onMove(e: PointerEvent) {
      over = true;
      if (e.buttons) return;
      const area = pick(e);
      if (area?.id === lastHover) return;
      lastHover = area?.id ?? "";
      const rect = el.getBoundingClientRect();
      setHover(
        area
          ? {
              area,
              x: Math.min(
                rect.width - 245,
                Math.max(10, e.clientX - rect.left + 12),
              ),
              y: Math.max(
                10,
                Math.min(rect.height - 85, e.clientY - rect.top - 60),
              ),
            }
          : null,
      );
      renderer.domElement.style.cursor = area ? "pointer" : "grab";
    }
    function onUp(e: PointerEvent) {
      if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 7) return;
      const area = pick(e);
      if (area) latest.current.onOpen(area);
    }
    function leave() {
      over = false;
      lastHover = "";
      setHover(null);
    }
    const canvas = renderer.domElement;
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointerleave", leave);
    const resize = new ResizeObserver(() => {
      camera.aspect = el.clientWidth / Math.max(1, el.clientHeight);
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
    });
    resize.observe(el);
    let frame = 0,
      previous = performance.now();
    function render(now: number) {
      frame = requestAnimationFrame(render);
      if (previousPaused !== latest.current.paused) {
        if (!latest.current.paused) interacted = false;
        previousPaused = latest.current.paused;
      }
      controls.autoRotate =
        !reduced && !interacted && !over && !latest.current.paused;
      controls.update(Math.min(0.1, (now - previous) / 1000));
      previous = now;
      sun.position.copy(camera.position).add(new THREE.Vector3(-2.8, 2.5, 1));
      renderer.render(scene, camera);
    }
    frame = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      controls.dispose();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointerleave", leave);
      earth.geometry.dispose();
      earth.material.dispose();
      atmosphere.geometry.dispose();
      atmosphere.material.dispose();
      geometry.dispose();
      material.dispose();
      texture.dispose();
      symbolTexture.dispose();
      renderer.dispose();
      canvas.remove();
    };
  }, [signals, reduced]);
  return (
    <div className="orb-earth" ref={host}>
      {failed && (
        <p className="orb-earth-fallback">
          Use “Choose a place” to explore the satellite map on this device.
        </p>
      )}
      {hover && (
        <div className="orb-earth-tip" style={{ left: hover.x, top: hover.y }}>
          <strong>{hover.area.name}</strong>
          <span>
            {integer(hover.area.rows.length)} heat detections · Explore →
          </span>
        </div>
      )}
    </div>
  );
}
