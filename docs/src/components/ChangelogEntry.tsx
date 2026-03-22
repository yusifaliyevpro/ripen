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
    <article className="py-12 sm:py-16 border-t border-border first:border-t-0">
      <div className="flex flex-col sm:flex-row gap-6 sm:gap-12">
        {/* Left column — version + date */}
        <div className="shrink-0 sm:w-40">
          <span className="inline-block bg-surface border border-border rounded-lg px-3 py-1 text-sm font-mono text-text-muted">
            v {version}
          </span>
          <p className="mt-2 text-sm text-text-dim">{date}</p>
        </div>

        {/* Right column — title + description */}
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
            {title}
          </h2>
          <div className="text-text-muted leading-relaxed space-y-3">
            {children}
          </div>
        </div>
      </div>

      {/* Optional banner image */}
      {image && (
        <div className="mt-8 sm:mt-10 sm:ml-52">
          <div className="relative rounded-xl overflow-hidden border border-border shadow-lg shadow-orange-glow/20">
            <Image
              src={image}
              alt={`${title} screenshot`}
              width={900}
              height={500}
              className="w-full h-auto"
            />
          </div>
        </div>
      )}
    </article>
  );
}
