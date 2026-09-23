"use client";

import { useCallback, useEffect, useReducer, useState } from "react";
import { chooseAiAction } from "../engine/ai";
import { duelReducer } from "../engine/combat";
import type { ActionId, Hero } from "../engine/types";

export type DuelMode = "ai" | "both";

export interface DuelSetup {
  p1: Hero;
  p2: Hero;
  mode: DuelMode;
}

const AI_ACTION_DELAY_MS = 800;

export function useDuel() {
  const [setup, setSetup] = useState<DuelSetup | null>(null);
  const [state, dispatch] = useReducer(duelReducer, null);

  const start = useCallback((next: DuelSetup) => {
    setSetup(next);
    dispatch({
      type: "start",
      p1: next.p1,
      p2: next.p2,
      seed: Date.now() >>> 0,
    });
  }, []);

  const roll = useCallback(() => {
    dispatch({ type: "roll" });
  }, []);

  const act = useCallback((action: ActionId) => {
    dispatch({ type: "action", action });
  }, []);

  const rematch = useCallback(() => {
    if (!setup) {
      return;
    }
    dispatch({
      type: "start",
      p1: setup.p1,
      p2: setup.p2,
      seed: Date.now() >>> 0,
    });
  }, [setup]);

  const quit = useCallback(() => {
    setSetup(null);
  }, []);

  const isAiTurn = Boolean(
    setup?.mode === "ai" &&
      state?.phase === "acting" &&
      state.turn === "p2",
  );

  useEffect(() => {
    if (!setup || setup.mode !== "ai" || !state) {
      return;
    }
    if (state.phase !== "acting" || state.turn !== "p2") {
      return;
    }
    const action = chooseAiAction(state, "p2");
    const timer = setTimeout(() => {
      dispatch({ type: "action", action });
    }, AI_ACTION_DELAY_MS);
    return () => clearTimeout(timer);
  }, [setup, state]);

  return { setup, state, start, roll, act, rematch, quit, isAiTurn };
}
