import type { Side } from "../engine/types";

/** Where each hero stands in the arena, and which way it faces. */
export const HERO_POSITIONS: Record<Side, [number, number, number]> = {
  p1: [-1.5, 0, 0],
  p2: [1.5, 0, 0],
};

export const HERO_FACING: Record<Side, 1 | -1> = {
  p1: 1,
  p2: -1,
};
