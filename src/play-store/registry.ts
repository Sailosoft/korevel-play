import { heroArenaMeta } from "./hero-arena/meta";
import type { PlayStoreApp } from "./types";

export const PLAY_STORE_APPS: PlayStoreApp[] = [heroArenaMeta];

export function listApps(): PlayStoreApp[] {
  return [...PLAY_STORE_APPS];
}

export function getApp(slug: string): PlayStoreApp | undefined {
  return PLAY_STORE_APPS.find((app) => app.slug === slug);
}
