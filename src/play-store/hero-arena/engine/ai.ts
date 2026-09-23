import {
  combatantFor,
  effectiveMpCost,
  estimateMinDamage,
  opponentFor,
} from "./combat";
import type { ActionId, CombatState, Side } from "./types";

/** Fraction of max HP below which the AI prefers to heal. */
export const AI_HEAL_THRESHOLD = 0.55;

/**
 * Heuristic opponent, used when the AI wins the initiative roll: finish when
 * possible, otherwise use the strongest ready ability, heal when low, brace
 * when out of MP, and fall back to a basic attack.
 */
export function chooseAiAction(state: CombatState, side: Side): ActionId {
  const self = combatantFor(state, side);
  const foe = opponentFor(state, side);
  const { hero } = self;

  const ready = (id: "skill" | "ultimate") => self.cooldowns[id] <= 0;
  const affordable = (ability: typeof hero.skill) =>
    self.mp >= effectiveMpCost(self, ability);
  const lethal = (ability: typeof hero.skill) =>
    ability.mode === "damage" &&
    estimateMinDamage(self, foe, ability.mult) >= foe.hp;

  if (affordable(hero.ultimate) && ready("ultimate") && lethal(hero.ultimate)) {
    return "ultimate";
  }
  if (affordable(hero.skill) && ready("skill") && lethal(hero.skill)) {
    return "skill";
  }
  if (estimateMinDamage(self, foe, 1) >= foe.hp) {
    return "attack";
  }

  if (
    hero.skill.mode === "heal" &&
    self.hp / hero.maxHp <= AI_HEAL_THRESHOLD &&
    affordable(hero.skill) &&
    ready("skill")
  ) {
    return "skill";
  }

  if (
    affordable(hero.ultimate) &&
    ready("ultimate") &&
    hero.ultimate.mode === "damage"
  ) {
    return "ultimate";
  }
  if (affordable(hero.skill) && ready("skill")) {
    if (hero.skill.mode === "damage" || self.hp < hero.maxHp) {
      return "skill";
    }
  }

  if (self.mp < 1) {
    return "defend";
  }

  return "attack";
}
