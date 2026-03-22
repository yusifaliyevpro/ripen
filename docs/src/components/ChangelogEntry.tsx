import Image from "next/image";
import type { ReactNode } from "react";

export function ChangelogEntry({
  version,
  date,
  title,
  children,
  image,
}: {
  version: string;
  date: string;
  title: string;
  children: ReactNode;
  image?: string;
}) {
  return (
    <article className="border-t border-border py-12 first:border-t-0 sm:py-16">
      <div className="flex flex-col gap-6 sm:flex-row sm:gap-12">
        {/* Left column — version + date */}
        <div className="shrink-0 sm:w-40">
          <span className="inline-block rounded-lg border border-border bg-surface px-3 py-1 font-mono text-sm text-text-muted">
            v {version}
          </span>
          <p className="mt-2 text-sm text-text-dim">{date}</p>
        </div>

        {/* Right column — title + description */}
        <div className="min-w-0 flex-1">
          <h2 className="mb-3 text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
          <div className="space-y-3 leading-relaxed text-text-muted">{children}</div>
        </div>
      </div>

      {/* Optional banner image */}
      {image && (
        <div className="mt-8 sm:mt-10 sm:ml-52">
          <div className="relative overflow-hidden rounded-xl border border-border shadow-lg shadow-orange-glow/20">
            <Image src={image} alt={`${title} screenshot`} width={900} height={500} className="h-auto w-full" />
          </div>
        </div>
      )}
    </article>
  );
}
