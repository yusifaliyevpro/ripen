import Link from "next/link";
import { Features } from "@/components/Features";
import { Hero } from "@/components/Hero";
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";

export default function Home() {
  return (
    <>
      <Hero />
      <Features />
      <KeyboardShortcuts />

      {/* Bottom CTA */}
      <section className="border-t border-border py-32 sm:py-44">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">Ready to update?</h2>
          <p className="mx-auto mb-10 max-w-lg text-text-muted">
            Install ripen and take control of your dependencies with an interactive, keyboard-driven workflow.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/docs/installation"
              className="rounded-lg bg-orange px-6 py-2.5 text-sm font-semibold text-bg transition-colors hover:bg-orange-light"
            >
              Installation Guide
            </Link>
            <Link
              href="/docs"
              className="rounded-lg border border-border px-6 py-2.5 text-sm font-medium text-text-muted transition-colors hover:border-border-bright hover:text-text"
            >
              Read the Docs
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
