import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Float } from "@react-three/drei";
import { useMemo, useRef } from "react";
import type { Group, Mesh, Points } from "three";
import { Color } from "three";

const STEEL = new Color("#c5ccd6");
const INK = new Color("#1a1e26");

function Ring() {
  const ref = useRef<Mesh>(null);
  useFrame((_, d) => {
    if (ref.current) ref.current.rotation.z += d * 0.12;
  });
  return (
    <mesh ref={ref} rotation={[Math.PI / 2.4, 0.15, 0]}>
      <torusGeometry args={[1.55, 0.018, 16, 96]} />
      <meshStandardMaterial color={STEEL} metalness={0.92} roughness={0.22} />
    </mesh>
  );
}

function Node({ index }: { index: number }) {
  const ref = useRef<Mesh>(null);
  const angle = (index / 5) * Math.PI * 2 - Math.PI / 2;
  const r = 1.55;
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    const pulse = 1 + Math.sin(t * 1.6 + index) * 0.04;
    ref.current.scale.setScalar(pulse);
  });
  return (
    <Float speed={1.2 + index * 0.1} rotationIntensity={0.4} floatIntensity={0.25}>
      <mesh ref={ref} position={[Math.cos(angle) * r, Math.sin(angle) * r * 0.55, Math.sin(angle) * 0.2]}>
        <icosahedronGeometry args={[0.14, 0]} />
        <meshStandardMaterial
          color={STEEL}
          emissive={STEEL}
          emissiveIntensity={0.18}
          metalness={0.7}
          roughness={0.28}
        />
      </mesh>
    </Float>
  );
}

function Core() {
  const ref = useRef<Mesh>(null);
  useFrame((_, d) => {
    if (!ref.current) return;
    ref.current.rotation.y += d * 0.25;
    ref.current.rotation.x += d * 0.08;
  });
  return (
    <mesh ref={ref}>
      <octahedronGeometry args={[0.38, 0]} />
      <meshStandardMaterial color={INK} metalness={0.85} roughness={0.18} emissive={STEEL} emissiveIntensity={0.08} />
    </mesh>
  );
}

function Dust() {
  const ref = useRef<Points>(null);
  const positions = useMemo(() => {
    const n = 140;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 9;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 5;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 7;
    }
    return arr;
  }, []);
  useFrame((_, d) => {
    if (ref.current) ref.current.rotation.y += d * 0.015;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.018} color="#9eb0c2" transparent opacity={0.4} depthWrite={false} />
    </points>
  );
}

function Scene() {
  const g = useRef<Group>(null);
  useFrame((state) => {
    if (!g.current) return;
    const t = state.clock.elapsedTime;
    g.current.rotation.y = Math.sin(t * 0.12) * 0.25;
    g.current.position.y = Math.sin(t * 0.4) * 0.05;
  });
  return (
    <group ref={g}>
      <Core />
      <Ring />
      {[0, 1, 2, 3, 4].map((i) => (
        <Node key={i} index={i} />
      ))}
      <Dust />
    </group>
  );
}

export function HeroScene() {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0.35, 5.2], fov: 38 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ width: "100%", height: "100%", background: "transparent" }}
    >
      <color attach="background" args={["#08090b"]} />
      <ambientLight intensity={0.35} />
      <hemisphereLight args={["#c5ccd6", "#08090b", 0.5]} />
      <directionalLight position={[3, 4, 2]} intensity={1.4} color="#e8ecef" />
      <directionalLight position={[-4, -1, -2]} intensity={0.35} color="#6f7d8c" />
      <Scene />
      <ContactShadows position={[0, -1.55, 0]} opacity={0.35} scale={8} blur={2.4} far={3} color="#000" />
    </Canvas>
  );
}
