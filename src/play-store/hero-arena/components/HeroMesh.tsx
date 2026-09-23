"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group, MeshStandardMaterial } from "three";
import type { Hero } from "../engine/types";

const LUNGE_DURATION = 0.55;

export default function HeroMesh({
  hero,
  position,
  facing,
  active,
  hp,
  attackSeq,
}: {
  hero: Hero;
  position: [number, number, number];
  facing: 1 | -1;
  active: boolean;
  hp: number;
  attackSeq: number;
}) {
  const group = useRef<Group>(null);
  const bodyMaterial = useRef<MeshStandardMaterial>(null);
  const elapsed = useRef(0);
  const hurt = useRef(0);
  const lastHp = useRef(hp);
  const attackStart = useRef(-1);
  const lastAttackSeq = useRef(attackSeq);

  useFrame((_, delta) => {
    const node = group.current;
    if (!node) {
      return;
    }

    elapsed.current += delta;

    if (hp < lastHp.current) {
      hurt.current = 1;
    }
    lastHp.current = hp;
    hurt.current = Math.max(0, hurt.current - delta * 1.8);

    if (attackSeq > lastAttackSeq.current) {
      lastAttackSeq.current = attackSeq;
      attackStart.current = elapsed.current;
    } else if (attackSeq < lastAttackSeq.current) {
      // The opponent acted, so this hero's token was reset: resync silently.
      lastAttackSeq.current = attackSeq;
    }

    let lunge = 0;
    if (attackStart.current >= 0) {
      const progress = (elapsed.current - attackStart.current) / LUNGE_DURATION;
      if (progress >= 1) {
        attackStart.current = -1;
      } else {
        lunge = Math.sin(Math.PI * Math.max(0, progress));
      }
    }

    const phase = facing > 0 ? 0 : Math.PI;
    const bob = Math.sin(elapsed.current * 2 + phase) * (active ? 0.09 : 0.05);
    const lean = active ? 0.08 : 0;

    node.position.x = position[0] + facing * (lean + lunge * 0.9);
    node.position.y = position[1] + bob - hurt.current * 0.06;
    node.rotation.y = facing * 0.4;
    node.rotation.z =
      hurt.current * facing * 0.12 - lunge * facing * 0.2;
    node.scale.setScalar(1 + hurt.current * 0.07 + lunge * 0.04);

    if (bodyMaterial.current) {
      bodyMaterial.current.emissiveIntensity =
        0.15 + hurt.current * 0.9 + lunge * 0.7;
    }
  });

  return (
    <group ref={group} position={position}>
      <mesh position={[0, 0.62, 0]} castShadow>
        <capsuleGeometry args={[0.3, 0.55, 6, 16]} />
        <meshStandardMaterial
          ref={bodyMaterial}
          color={hero.color}
          emissive={hero.accent}
          emissiveIntensity={0.15}
          roughness={0.5}
        />
      </mesh>

      <mesh position={[0, 1.28, 0]} castShadow>
        <sphereGeometry args={[0.24, 24, 24]} />
        <meshStandardMaterial color={hero.accent} roughness={0.4} />
      </mesh>

      <mesh position={[facing * 0.42, 0.78, 0]} castShadow>
        <boxGeometry args={[0.14, 0.5, 0.14]} />
        <meshStandardMaterial color="#d4d4d8" roughness={0.6} />
      </mesh>

      <mesh
        position={[facing * 0.62, 0.95, 0]}
        rotation={[0, 0, facing * -0.5]}
      >
        <boxGeometry args={[0.08, 0.72, 0.08]} />
        <meshStandardMaterial
          color={hero.color}
          emissive={hero.color}
          emissiveIntensity={0.4}
        />
      </mesh>
    </group>
  );
}
