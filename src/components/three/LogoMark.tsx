import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";

function Mark() {
  const g = useRef<Group>(null);
  useFrame((_, d) => {
    if (g.current) g.current.rotation.y += d * 0.6;
  });
  return (
    <group ref={g}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.7, 0.045, 12, 64]} />
        <meshStandardMaterial color="#c5ccd6" metalness={0.9} roughness={0.2} />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.7, 0, Math.sin(a) * 0.7]}>
            <sphereGeometry args={[0.09, 12, 12]} />
            <meshStandardMaterial color="#ecece8" metalness={0.6} roughness={0.3} />
          </mesh>
        );
      })}
    </group>
  );
}

export function LogoMark({ className }: { className?: string }) {
  return (
    <div className={className}>
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0.9, 2.2], fov: 40 }} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[2, 3, 2]} intensity={1.2} />
        <Mark />
      </Canvas>
    </div>
  );
}
