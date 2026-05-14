
import Image from "next/image";

export function SecuritySection() {
  return (
    <section className="relative border-t border-border py-24 sm:py-32">
      {/* Subtle background glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(249,115,22,0.04) 0%, transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-6">
        {/* Logo lockup */}
        <div className="mb-10 flex items-center justify-center gap-4">
          <div className="flex items-center gap-2.5 p-3 rounded-xl border border-border bg-surface px-4 py-2.5 shadow-lg shadow-black/20">
            <Image src="/icon.png" alt="ripen" width={36} height={36} unoptimized />
            <span className="font-mono text-lg font-semibold text-text">ripen</span>
          </div>

          <span className="text-xl font-light text-text-dim">×</span>

          <div className="flex items-center rounded-xl border border-border bg-surface px-4 py-2.5 shadow-lg shadow-black/20">
            <Image src="/socket_logo.png" alt="Socket" width={108} height={28} unoptimized className="object-contain" />
          </div>
        </div>

        {/* Headline */}
        <h2 className="mb-5 text-center text-3xl font-bold tracking-tight sm:text-4xl">
          Security first, always
        </h2>

        {/* Description */}
        <p className="mx-auto mb-14 max-w-xl text-center text-lg leading-relaxed text-text-muted">
          In a world where supply chain attacks hide inside everyday dependency updates,{" "}
          <span className="font-medium text-text">ripen never runs a command for you.</span>{" "}
          Every update goes to your clipboard first. You review it, you run it. Pair it with{" "}
          <a
            href="https://socket.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-text underline-offset-4 hover:underline"
          >
            Socket
          </a>{" "}
          for deep supply chain analysis.
        </p>

        {/* Three pillars */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Pillar
            emoji="📋"
            title="Clipboard only"
            description="ripen never runs a single shell command on your behalf. Every install command is copied to your clipboard so you review it before it touches your system."
          />
          <Pillar
            emoji="🕐"
            title="Publish age awareness"
            description="See exactly how long ago each version was published. Fresh releases (under 24 hours) are highlighted — giving you time to let the community vet them first."
          />
          <Pillar
            emoji="🛡️"
            title="SFW Firewall"
            description="Enable the SFW Firewall setting to automatically prepend sfw to every generated command, routing installs through a sandboxed environment."
          />
        </div>
      </div>
    </section>
  );
}

function Pillar({
  emoji,
  title,
  description,
}: {
  emoji: string;
  title: string;
  description: string;
}) {
  return (
    <div className="group relative rounded-xl border border-border bg-surface p-6 transition-colors hover:border-border-bright">
      <div className="absolute top-6 bottom-6 left-0 w-0.5 rounded-full bg-orange/0 transition-colors group-hover:bg-orange" />
      <div className="mb-3 text-2xl">{emoji}</div>
      <h3 className="mb-2 font-semibold text-text">{title}</h3>
      <p className="text-sm leading-relaxed text-text-muted">{description}</p>
    </div>
  );
}
