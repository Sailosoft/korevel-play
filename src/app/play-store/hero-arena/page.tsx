import type { Metadata } from "next";
import Link from "next/link";
import HeroArena from "@/play-store/hero-arena";

export const metadata: Metadata = {
  title: "Hero Arena",
  description:
    "A dice-driven 1v1 hero duel: roll hidden initiative dice each round, then strike with attacks, elemental skills, ultimates, and passives.",
};

export default function HeroArenaPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      <nav className="flex items-center gap-2 text-sm" style={{ color: "var(--ftf-frost-dim)" }}>
        <Link href="/" className="transition hover:text-[var(--ftf-ice)]">
          Home
        </Link>
        <span style={{ color: "var(--ftf-steel-border)" }}>/</span>
        <Link href="/play-store" className="transition hover:text-[var(--ftf-ice)]">
          Play Store
        </Link>
        <span style={{ color: "var(--ftf-steel-border)" }}>/</span>
        <span style={{ color: "var(--ftf-ice)" }}>Hero Arena</span>
      </nav>

      <HeroArena />
    </main>
  );
}
