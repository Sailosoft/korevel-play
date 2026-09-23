"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import type { CombatState } from "../engine/types";
import ActionEffect from "./ActionEffect";
import { HERO_FACING, HERO_POSITIONS } from "./arenaLayout";
import HeroMesh from "./HeroMesh";

export default function ArenaScene({ state }: { state: CombatState }) {
  const lastAction = state.lastAction;
  const action = lastAction?.action;

  return (
    <Canvas camera={{ position: [0, 2.4, 6.4], fov: 42 }} dpr={[1, 2]} shadows>
      <color attach="background" args={["#09090b"]} />
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[4, 7, 5]}
        intensity={1.4}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight
        position={[-4, 3, -3]}
        intensity={0.7}
        color={state.p1.hero.color}
      />
      <pointLight
        position={[4, 3, -3]}
        intensity={0.7}
        color={state.p2.hero.color}
      />

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.02, 0]}
        receiveShadow
      >
        <circleGeometry args={[5, 64]} />
        <meshStandardMaterial color="#131316" roughness={0.9} />
      </mesh>
      <gridHelper args={[10, 20, "#3f3f46", "#26262b"]} />

      <HeroMesh
        hero={state.p1.hero}
        position={HERO_POSITIONS.p1}
        facing={HERO_FACING.p1}
        active={state.phase === "acting" && state.turn === "p1"}
        hp={state.p1.hp}
        attackSeq={
          lastAction?.side === "p1" && action !== "defend" ? state.actionSeq : 0
        }
      />
      <HeroMesh
        hero={state.p2.hero}
        position={HERO_POSITIONS.p2}
        facing={HERO_FACING.p2}
        active={state.phase === "acting" && state.turn === "p2"}
        hp={state.p2.hp}
        attackSeq={
          lastAction?.side === "p2" && action !== "defend" ? state.actionSeq : 0
        }
      />

      {lastAction && action !== "defend" ? (
        <ActionEffect key={state.actionSeq} event={lastAction} />
      ) : null}

      <OrbitControls
        enablePan={false}
        minDistance={4}
        maxDistance={11}
        minPolarAngle={0.6}
        maxPolarAngle={1.4}
        target={[0, 0.8, 0]}
      />
    </Canvas>
  );
}
