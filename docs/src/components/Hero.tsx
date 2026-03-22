import Image from "next/image";
import Link from "next/link";
import { InstallBlock } from "./InstallBlock";
import { TerminalDemo } from "./TerminalDemo";

export function Hero() {
  return (
    <section className="relative pt-24 pb-16 sm:pt-28 sm:pb-20">
      {/* Background glow */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-150 w-200 -translate-x-1/2"
        style={{
          background:
            "radial-gradient(ellipse at center top, rgba(249,115,22,0.15) 0%, rgba(249,115,22,0.06) 40%, transparent 70%)",
        }}
      />

      <div className="relative mx-auto flex max-w-6xl flex-col items-center px-6 text-center">
        {/* Logo */}
        <Image src="/icon.png" unoptimized alt="ripen" width={120} height={120} priority />

        {/* Headline */}
        <h1 className="mb-4 text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
          <span className="bg-linear-to-r from-orange to-orange-light bg-clip-text text-transparent">ripen</span>
        </h1>

        {/* Tagline */}
        <p className="mb-8 max-w-xl text-lg leading-relaxed text-text-muted sm:text-xl">
          Interactive dependency updater for <span className="font-medium text-text">npm</span>,{" "}
          <span className="font-medium text-text">pnpm</span>, <span className="font-medium text-text">yarn</span>, and{" "}
          <span className="font-medium text-text">bun</span>
        </p>

        {/* CTA buttons */}
        <div className="mb-10 flex flex-wrap justify-center gap-3">
          <Link
            href="/docs"
            className="rounded-lg bg-orange px-6 py-2.5 text-sm font-semibold text-bg transition-colors hover:bg-orange-light"
          >
            Get Started
          </Link>
          <a
            href="https://github.com/yusifaliyevpro/ripen"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-border px-6 py-2.5 text-sm font-medium text-text-muted transition-colors hover:border-border-bright hover:text-text"
          >
            View on GitHub
          </a>
        </div>

        {/* Install block */}
        <div className="mb-16 flex justify-center">
          <InstallBlock />
        </div>

        {/* Terminal demo */}
        <TerminalDemo />
      </div>
    </section>
  );
}
