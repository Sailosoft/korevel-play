import Link from "next/link";
import AppCatalog from "@/components/AppCatalog";
import { listApps } from "@/play-store/registry";

export default function Home() {
  const apps = listApps();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-6 py-16">
      <header className="flex flex-col gap-4">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-indigo-400">
          Korevel Play
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-zinc-50 sm:text-5xl">
          Small, self-contained browser games.
        </h1>
        <p className="max-w-2xl text-lg leading-8 text-zinc-400">
          A growing catalog of experiments built with Next.js, Tailwind, and
          Three.js. Pick an app below, or browse the full{" "}
          <Link
            href="/play-store"
            className="font-medium text-indigo-300 underline-offset-4 hover:underline"
          >
            play store
          </Link>
          .
        </p>
      </header>

      <section className="flex flex-col gap-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Apps ({apps.length})
        </h2>
        <AppCatalog apps={apps} />
      </section>
    </main>
  );
}
