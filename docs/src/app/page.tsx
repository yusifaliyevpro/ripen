import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";
import Link from "next/link";

export default function Home() {
  return (
    <>
      <Hero />
      <Features />
      <KeyboardShortcuts />

      {/* Bottom CTA */}
      <section className="py-24 sm:py-32 border-t border-border">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Ready to update?
          </h2>
          <p className="text-text-muted max-w-lg mx-auto mb-8">
            Install ripen and take control of your dependencies with an
            interactive, keyboard-driven workflow.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/docs/installation"
              className="px-6 py-2.5 bg-orange hover:bg-orange-light text-bg font-semibold text-sm rounded-lg transition-colors"
            >
              Installation Guide
            </Link>
            <Link
              href="/docs"
              className="px-6 py-2.5 border border-border hover:border-border-bright text-text-muted hover:text-text font-medium text-sm rounded-lg transition-colors"
            >
              Read the Docs
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
