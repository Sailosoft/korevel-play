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
      <nav className="text-sm text-zinc-500">
        <Link href="/" className="hover:text-zinc-300">
          Home
        </Link>
        <span className="mx-2">/</span>
        <Link href="/play-store" className="hover:text-zinc-300">
          Play Store
        </Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-300">Hero Arena</span>
      </nav>

      <HeroArena />
    </main>
  );
}
