"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending } from "three";
import type { Mesh, MeshBasicMaterial, PointLight } from "three";
import { ELEMENT_COLORS } from "../constants";
import type { ActionEvent } from "../engine/types";
import { HERO_POSITIONS } from "./arenaLayout";

const FLIGHT_START = 0.05;
const FLIGHT_DURATION = 0.45;
const SPLASH_DURATION = 0.6;
const MELEE_DELAY = 0.16;
const HAND_HEIGHT = 1.0;
const TARGET_HEIGHT = 0.85;

/**
 * Plays the arena effect for the action that just resolved: a melee burst for
 * basic attacks, or an element-coloured orb that flies across the arena and
 * splashes on impact for skills and ultimates.
 *
 * Remounted via `key={actionSeq}`, so the local timeline resets every action.
 */
export default function ActionEffect({ event }: { event: ActionEvent }) {
  const projectile = useRef<Mesh>(null);
  const projectileMaterial = useRef<MeshBasicMaterial>(null);
  const splash = useRef<Mesh>(null);
  const splashMaterial = useRef<MeshBasicMaterial>(null);
  const flash = useRef<PointLight>(null);
  const elapsed = useRef(0);

  const color = ELEMENT_COLORS[event.element];
  const from = HERO_POSITIONS[event.side];
  const to = HERO_POSITIONS[event.side === "p1" ? "p2" : "p1"];
  const isProjectile = event.action === "skill" || event.action === "ultimate";
  const impactAt = isProjectile ? FLIGHT_START + FLIGHT_DURATION : MELEE_DELAY;

  useFrame((_, delta) => {
    elapsed.current += delta;
    const time = elapsed.current;

    const projectileNode = projectile.current;
    const projectileColor = projectileMaterial.current;
    if (projectileNode && projectileColor) {
      const progress = (time - FLIGHT_START) / FLIGHT_DURATION;
      if (!isProjectile || progress < 0 || progress >= 1) {
        projectileNode.visible = false;
      } else {
        projectileNode.visible = true;
        projectileNode.position.set(
          from[0] + (to[0] - from[0]) * progress,
          HAND_HEIGHT +
            (TARGET_HEIGHT - HAND_HEIGHT) * progress +
            Math.sin(Math.PI * progress) * 0.7,
          0,
        );
        projectileNode.scale.setScalar(1 + Math.sin(Math.PI * progress) * 0.3);
        projectileColor.opacity =
          progress > 0.85 ? (1 - progress) / 0.15 : 1;
      }
    }

    const splashNode = splash.current;
    const splashColor = splashMaterial.current;
    if (splashNode && splashColor) {
      const burst = (time - impactAt) / SPLASH_DURATION;
      if (burst < 0 || burst >= 1) {
        splashNode.visible = false;
        if (flash.current) {
          flash.current.intensity = 0;
        }
      } else {
        splashNode.visible = true;
        splashNode.position.set(to[0], TARGET_HEIGHT, 0);
        splashNode.scale.setScalar(0.35 + burst * 2.1);
        splashNode.rotation.z = burst * 1.6;
        splashColor.opacity = 0.8 * (1 - burst) * (1 - burst);
        if (flash.current) {
          flash.current.intensity = 3 * (1 - burst);
        }
      }
    }
  });

  return (
    <>
      <mesh ref={projectile} visible={false}>
        <sphereGeometry args={[0.17, 16, 16]} />
        <meshBasicMaterial
          ref={projectileMaterial}
          color={color}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>

      <mesh ref={splash} visible={false}>
        <sphereGeometry args={[0.5, 20, 20]} />
        <meshBasicMaterial
          ref={splashMaterial}
          color={color}
          transparent
          opacity={0}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>

      <pointLight
        ref={flash}
        position={[to[0], TARGET_HEIGHT, 0]}
        color={color}
        intensity={0}
        distance={6}
      />
    </>
  );
}
