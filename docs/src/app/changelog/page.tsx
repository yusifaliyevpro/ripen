import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const metadata: Metadata = {
  title: "Changelog",
  description: "Version history and release notes for ripen.",
};

const REPO = "yusifaliyevpro/ripen";

type Release = {
  tag_name: string;
  body: string | null;
  published_at: string | null;
  draft: boolean;
};

async function getReleases(): Promise<Release[]> {
  "use cache";
  // Cache for a long time and rely on tag-based invalidation: the publish
  // workflow pings /api/revalidate-changelog after each release.
  cacheLife("weeks");
  cacheTag("changelog");

  const res = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=100`, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!res.ok) return [];

  const releases: Release[] = await res.json();
  return releases.filter((release) => !release.draft);
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export default async function ChangelogPage() {
  const releases = await getReleases();

  if (releases.length === 0) {
    return <p className="text-text-muted">No releases yet.</p>;
  }

  return (
    <>
      {releases.map((release) => (
        <article key={release.tag_name} className="border-t border-border py-12 first:border-t-0 sm:py-16">
          <div className="flex flex-col gap-6 sm:flex-row sm:gap-12">
            {/* Left column — version + date */}
            <div className="shrink-0 sm:w-40">
              <span className="inline-block rounded-lg border border-border bg-surface px-3 py-1 font-mono text-sm text-text-muted">
                {release.tag_name}
              </span>
              <p className="mt-2 text-sm text-text-dim">{formatDate(release.published_at)}</p>
            </div>

            {/* Right column — release notes */}
            <div className="min-w-0 flex-1">
              <div className="prose max-w-none prose-invert prose-headings:font-bold prose-headings:tracking-tight prose-a:text-orange prose-a:no-underline hover:prose-a:underline prose-code:rounded prose-code:border prose-code:border-border prose-code:bg-surface prose-code:px-1.5 prose-code:py-0.5 prose-code:font-mono prose-code:text-xs prose-code:before:content-none prose-code:after:content-none">
                <Markdown remarkPlugins={[remarkGfm]}>{release.body || "_No release notes._"}</Markdown>
              </div>
            </div>
          </div>
        </article>
      ))}
    </>
  );
}
