import Image from "next/image";
import Link from "next/link";
import { InstallBlock } from "./InstallBlock";
import { TerminalDemo } from "./TerminalDemo";

export function Hero() {
  return (
    <section className="relative pt-24 pb-16 sm:pt-28 sm:pb-20">
      {/* Background glow */}
      <div
        className="absolute -top-40 left-1/2 -translate-x-1/2 w-200 h-150 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center top, rgba(249,115,22,0.15) 0%, rgba(249,115,22,0.06) 40%, transparent 70%)",
        }}
      />

      <div className="relative max-w-6xl mx-auto px-6 flex flex-col items-center text-center">
        {/* Logo */}
        <Image src="/icon.png" unoptimized alt="ripen" width={120} height={120} priority />

        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-4">
          <span className="bg-linear-to-r from-orange to-orange-light bg-clip-text text-transparent">ripen</span>
        </h1>

        {/* Tagline */}
        <p className="text-lg sm:text-xl text-text-muted max-w-xl mb-8 leading-relaxed">
          Interactive dependency updater for <span className="text-text font-medium">npm</span>,{" "}
          <span className="text-text font-medium">pnpm</span>, <span className="text-text font-medium">yarn</span>, and{" "}
          <span className="text-text font-medium">bun</span>
        </p>

        {/* CTA buttons */}
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          <Link
            href="/docs"
            className="px-6 py-2.5 bg-orange hover:bg-orange-light text-bg font-semibold text-sm rounded-lg transition-colors"
          >
            Get Started
          </Link>
          <a
            href="https://github.com/yusifaliyevpro/ripen"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-2.5 border border-border hover:border-border-bright text-text-muted hover:text-text font-medium text-sm rounded-lg transition-colors"
          >
            View on GitHub
          </a>
        </div>

        {/* Install block */}
        <div className="flex justify-center mb-16">
          <InstallBlock />
        </div>

        {/* Terminal demo */}
        <TerminalDemo />
      </div>
    </section>
  );
}
