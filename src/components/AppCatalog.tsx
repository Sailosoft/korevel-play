import Link from "next/link";
import type { AppStatus, PlayStoreApp } from "@/play-store/types";

const STATUS_STYLES: Record<AppStatus, string> = {
  available: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  beta: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  "coming-soon": "bg-zinc-500/15 text-zinc-300 border-zinc-500/40",
};

const STATUS_LABELS: Record<AppStatus, string> = {
  available: "Available",
  beta: "Beta",
  "coming-soon": "Coming soon",
};

function AppCard({ app }: { app: PlayStoreApp }) {
  const isPlayable = app.status !== "coming-soon";

  const body = (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-semibold text-zinc-100">{app.name}</h2>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[app.status]}`}
        >
          {STATUS_LABELS[app.status]}
        </span>
      </div>
      <p className="flex-1 text-sm leading-6 text-zinc-400">{app.description}</p>
      <ul className="flex flex-wrap gap-2">
        {app.tags.map((tag) => (
          <li
            key={tag}
            className="rounded-md bg-white/5 px-2 py-0.5 text-xs text-zinc-400"
          >
            {tag}
          </li>
        ))}
      </ul>
    </div>
  );

  const cardClasses =
    "group flex h-full flex-col rounded-2xl border border-white/10 bg-zinc-900/60 p-5 transition";

  if (!isPlayable) {
    return (
      <div className={`${cardClasses} opacity-70`} aria-disabled="true">
        {body}
      </div>
    );
  }

  return (
    <Link
      href={app.href}
      className={`${cardClasses} hover:-translate-y-0.5 hover:border-indigo-400/60 hover:bg-zinc-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400`}
    >
      {body}
      <span className="mt-1 text-sm font-medium text-indigo-300 group-hover:text-indigo-200">
        Play &rarr;
      </span>
    </Link>
  );
}

export default function AppCatalog({ apps }: { apps: PlayStoreApp[] }) {
  if (apps.length === 0) {
    return (
      <p className="text-sm text-zinc-400">
        No apps registered yet. Add one to{" "}
        <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs">
          src/play-store/registry.ts
        </code>
        .
      </p>
    );
  }

  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {apps.map((app) => (
        <li key={app.slug} className="h-full">
          <AppCard app={app} />
        </li>
      ))}
    </ul>
  );
}
