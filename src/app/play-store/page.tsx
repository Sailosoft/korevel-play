import type { Metadata } from "next";
import Link from "next/link";
import AppCatalog from "@/components/AppCatalog";
import { listApps } from "@/play-store/registry";

export const metadata: Metadata = {
  title: "Play Store",
  description: "Browse every app in the Korevel Play catalog.",
};

export default function PlayStorePage() {
  const apps = listApps();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-16">
      <nav className="text-sm text-zinc-500">
        <Link href="/" className="hover:text-zinc-300">
          Home
        </Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-300">Play Store</span>
      </nav>

      <header className="flex flex-col gap-3">
        <h1 className="text-4xl font-semibold tracking-tight text-zinc-50">
          Play Store
        </h1>
        <p className="max-w-2xl text-lg leading-8 text-zinc-400">
          Everything registered in the catalog. New apps appear here as soon as
          they are added to the registry.
        </p>
      </header>

      <AppCatalog apps={apps} />
    </main>
  );
}
