import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type {
  Group,
  LineBasicMaterial,
  Mesh,
  MeshStandardMaterial,
} from "three";
import { Color, Vector3 } from "three";
import type { AgentOutput, SignalLabel } from "@/lib/types";

/* =========================================================
   QUORUM — AI WAR ROOM 3D ENGINE
   ========================================================= */

const OLIVE = new Color("#a5ad68");
const OLIVE_BRIGHT = new Color("#d0d69a");

const BLUE = new Color("#4da3ff");
const BLUE_BRIGHT = new Color("#9bd1ff");

const WHITE = new Color("#f5f5ed");

const UP = new Color("#a9c56a");
const DOWN = new Color("#d87878");
const WARN = new Color("#d6bd69");

const DARK = new Color("#080b08");

/* =========================================================
   SIGNAL COLOR
   ========================================================= */

function colorFor(signal?: SignalLabel) {
  if (!signal) return OLIVE;

  if (signal === "BUY" || signal === "STRONG_BUY") {
    return UP;
  }

  if (
    signal === "SELL" ||
    signal === "STRONG_SELL" ||
    signal === "AVOID"
  ) {
    return DOWN;
  }

  return WARN;
}

/* =========================================================
   DATA PARTICLE
   ========================================================= */

function DataParticle({
  index,
  running,
}: {
  index: number;
  running: boolean;
}) {
  const ref = useRef<Mesh>(null);

  const start = (index / 10) * Math.PI * 2;

  useFrame((state) => {
    if (!ref.current) return;

    const t = state.clock.elapsedTime;

    const speed = running ? 1.8 : 0.45;

    const angle = start + t * speed;

    const radius = running
      ? 1.35 + Math.sin(t * 2 + index) * 0.08
      : 1.3;

    ref.current.position.set(
      Math.cos(angle) * radius,
      Math.sin(angle) * radius * 0.52,
      Math.sin(angle * 1.4) * 0.18,
    );

    const scale = running
      ? 0.045 + Math.sin(t * 5 + index) * 0.015
      : 0.028;

    ref.current.scale.setScalar(scale);
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[1, 8, 8]} />

      <meshBasicMaterial
        color={BLUE}
        transparent
        opacity={running ? 0.9 : 0.35}
      />
    </mesh>
  );
}

/* =========================================================
   AGENT → CIO CONNECTION
   ========================================================= */

function Connection({
  index,
  running,
  active,
}: {
  index: number;
  running: boolean;
  active: boolean;
}) {
  const ref = useRef<LineBasicMaterial>(null);

  const angle =
    (index / 5) * Math.PI * 2 - Math.PI / 2;

  const start = useMemo(
    () =>
      new Vector3(
        Math.cos(angle) * 1.15,
        Math.sin(angle) * 1.15 * 0.55,
        Math.sin(angle) * 0.18,
      ),
    [angle],
  );

  const end = useMemo(
    () => new Vector3(0, 0, 0),
    [],
  );

  const points = useMemo(
    () => [start, end],
    [start, end],
  );

  useFrame((state) => {
    if (!ref.current) return;

    const t = state.clock.elapsedTime;

    ref.current.opacity = active
      ? 0.75 + Math.sin(t * 4 + index) * 0.2
      : running
        ? 0.35 + Math.sin(t * 2 + index) * 0.1
        : 0.16;
  });

  return (
    <line>
      <bufferGeometry
        attach="geometry"
        onUpdate={(geometry) => {
          geometry.setFromPoints(points);
        }}
      />

      <lineBasicMaterial
        ref={ref}
        color={active ? UP : OLIVE}
        transparent
        opacity={0.25}
      />
    </line>
  );
}

/* =========================================================
   AGENT NODE
   ========================================================= */

function Node({
  index,
  running,
  agent,
}: {
  index: number;
  running: boolean;
  agent?: AgentOutput;
}) {
  const group = useRef<Group>(null);
  const ref = useRef<Mesh>(null);
  const ring = useRef<Mesh>(null);

  const angle =
    (index / 5) * Math.PI * 2 - Math.PI / 2;

  const radius = 1.15;

  const position: [number, number, number] = [
    Math.cos(angle) * radius,
    Math.sin(angle) * radius * 0.55,
    Math.sin(angle) * 0.18,
  ];

  const color = colorFor(agent?.signal);

  useFrame((state) => {
    if (!group.current || !ref.current) return;

    const t = state.clock.elapsedTime;

    /* Floating movement */

    group.current.position.y =
      position[1] +
      Math.sin(t * 1.5 + index) *
        (running ? 0.08 : 0.035);

    group.current.rotation.y =
      t * (running ? 0.8 : 0.25);

    /* Node pulse */

    const pulse =
      running && !agent
        ? 1 + Math.sin(t * 5 + index) * 0.18
        : agent
          ? 1 + Math.sin(t * 2 + index) * 0.06
          : 1;

    ref.current.scale.setScalar(pulse);

    /* Safe material access */

    const material = ref.current.material;

    if (!Array.isArray(material)) {
      const standardMaterial =
        material as MeshStandardMaterial;

      standardMaterial.emissiveIntensity =
        running && !agent
          ? 0.8
          : agent
            ? 0.38
            : 0.1;
    }

    /* Orbit ring */

    if (ring.current) {
      ring.current.rotation.z =
        t * (running ? 1.8 : 0.35);

      ring.current.scale.setScalar(
        agent
          ? 1.05 +
              Math.sin(t * 2 + index) * 0.04
          : 1,
      );
    }
  });

  return (
    <group ref={group} position={position}>

      {/* Outer energy ring */}

      <mesh
        ref={ring}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <torusGeometry
          args={[0.24, 0.008, 8, 40]}
        />

        <meshBasicMaterial
          color={color}
          transparent
          opacity={
            agent
              ? 0.75
              : running
                ? 0.4
                : 0.12
          }
        />
      </mesh>

      {/* Main agent node */}

      <mesh ref={ref}>
        <icosahedronGeometry args={[0.16, 1]} />

        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.15}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* Node light */}

      <pointLight
        color={color}
        intensity={
          running
            ? 0.7
            : agent
              ? 0.35
              : 0.08
        }
        distance={0.7}
      />
    </group>
  );
}

/* =========================================================
   CENTRAL CIO
   ========================================================= */

function Core({
  running,
  agents,
}: {
  running: boolean;
  agents: AgentOutput[];
}) {
  const ref = useRef<Group>(null);
  const core = useRef<Mesh>(null);
  const ring1 = useRef<Mesh>(null);
  const ring2 = useRef<Mesh>(null);

  const completed = agents.length;

  useFrame((state, delta) => {
    if (!ref.current) return;

    const t = state.clock.elapsedTime;

    /* Core rotation */

    ref.current.rotation.y +=
      delta * (running ? 1.15 : 0.25);

    ref.current.rotation.x =
      Math.sin(t * 0.5) * 0.12;

    /* Core breathing */

    if (core.current) {
      const pulse = running
        ? 1 + Math.sin(t * 4) * 0.14
        : 1 + Math.sin(t * 1.4) * 0.035;

      core.current.scale.setScalar(pulse);

      const material = core.current.material;

      if (!Array.isArray(material)) {
        const standardMaterial =
          material as MeshStandardMaterial;

        standardMaterial.emissiveIntensity =
          running
            ? 0.8
            : completed
              ? 0.35
              : 0.1;
      }
    }

    /* First orbit */

    if (ring1.current) {
      ring1.current.rotation.z =
        t * (running ? 0.9 : 0.18);

      ring1.current.rotation.x =
        Math.sin(t * 0.5) * 0.3;
    }

    /* Second orbit */

    if (ring2.current) {
      ring2.current.rotation.z =
        -t * (running ? 0.65 : 0.12);

      ring2.current.rotation.x =
        Math.cos(t * 0.4) * 0.25;
    }
  });

  return (
    <group ref={ref}>

      {/* Intelligence aura */}

      <pointLight
        color={running ? BLUE : OLIVE}
        intensity={
          running
            ? 2.2
            : completed
              ? 0.8
              : 0.2
        }
        distance={2.5}
      />

      {/* Main CIO core */}

      <mesh ref={core}>
        <octahedronGeometry args={[0.28, 1]} />

        <meshStandardMaterial
          color={DARK}
          emissive={running ? BLUE : OLIVE}
          emissiveIntensity={0.2}
          metalness={0.95}
          roughness={0.12}
        />
      </mesh>

      {/* Inner energy */}

      <mesh scale={0.38}>
        <sphereGeometry args={[0.5, 16, 16]} />

        <meshBasicMaterial
          color={
            running
              ? BLUE_BRIGHT
              : OLIVE_BRIGHT
          }
          transparent
          opacity={running ? 0.35 : 0.14}
        />
      </mesh>

      {/* Main orbit */}

      <mesh
        ref={ring1}
        rotation={[
          Math.PI / 2.3,
          0.1,
          0,
        ]}
      >
        <torusGeometry
          args={[0.58, 0.008, 8, 64]}
        />

        <meshBasicMaterial
          color={running ? BLUE : OLIVE}
          transparent
          opacity={running ? 0.55 : 0.2}
        />
      </mesh>

      {/* Secondary orbit */}

      <mesh
        ref={ring2}
        rotation={[0.7, 0.9, 0]}
      >
        <torusGeometry
          args={[0.43, 0.006, 8, 64]}
        />

        <meshBasicMaterial
          color={WHITE}
          transparent
          opacity={running ? 0.28 : 0.08}
        />
      </mesh>
    </group>
  );
}

/* =========================================================
   COMPLETE SCENE
   ========================================================= */

function Scene({
  running,
  agents,
}: {
  running: boolean;
  agents: AgentOutput[];
}) {
  const g = useRef<Group>(null);

  const byName = useMemo(
    () =>
      Object.fromEntries(
        agents.map((a) => [
          a.agentName,
          a,
        ]),
      ),
    [agents],
  );

  const names = [
    "Momentum",
    "Flow",
    "Filing",
    "Sentiment",
    "Risk",
  ];

  useFrame((state) => {
    if (!g.current) return;

    const t = state.clock.elapsedTime;

    g.current.rotation.y =
      Math.sin(t * 0.16) * 0.18;

    g.current.rotation.x =
      Math.sin(t * 0.12) * 0.04;
  });

  return (
    <group ref={g}>

      {/* Agent connections */}

      {names.map((name, index) => (
        <Connection
          key={`connection-${name}`}
          index={index}
          running={running}
          active={Boolean(byName[name])}
        />
      ))}

      {/* CIO */}

      <Core
        running={running}
        agents={agents}
      />

      {/* Agents */}

      {names.map((name, index) => (
        <Node
          key={name}
          index={index}
          running={running}
          agent={byName[name]}
        />
      ))}

      {/* Data particles */}

      {Array.from({ length: 10 }).map(
        (_, index) => (
          <DataParticle
            key={`particle-${index}`}
            index={index}
            running={running}
          />
        ),
      )}
    </group>
  );
}

/* =========================================================
   CANVAS
   ========================================================= */

export function WarRoomScene({
  running,
  agents,
}: {
  running: boolean;
  agents: AgentOutput[];
}) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{
        position: [0, 0.25, 3.6],
        fov: 40,
      }}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      }}
      style={{
        width: "100%",
        height: "100%",
        background: "transparent",
      }}
    >
      {/* Ambient */}

      <ambientLight intensity={0.28} />

      {/* Main light */}

      <directionalLight
        position={[2, 3, 2]}
        intensity={1.2}
      />

      {/* Blue rim light */}

      <directionalLight
        position={[-3, -1, -2]}
        intensity={0.35}
        color={BLUE}
      />

      {/* CIO light */}

      <pointLight
        position={[0, 0, 1]}
        intensity={running ? 1.5 : 0.35}
        color={running ? BLUE : OLIVE}
      />

      <Scene
        running={running}
        agents={agents}
      />
    </Canvas>
  );
}