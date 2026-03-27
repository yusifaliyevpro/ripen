import type { IconType } from "react-icons";
import {
  VscFolderOpened,
  VscGitCommit,
  VscGlobe,
  VscListFlat,
  VscPackage,
  VscSync,
  VscTag,
  VscTerminal,
  VscWarning,
} from "react-icons/vsc";

const features: { icon: IconType; title: string; description: string }[] = [
  {
    icon: VscTerminal,
    title: "Interactive TUI",
    description:
      "Navigate, select, and update packages with a beautiful keyboard-driven terminal interface built with Ink.",
  },
  {
    icon: VscPackage,
    title: "Multi-Package Manager",
    description:
      "Auto-detects your package manager from lock files. Works with npm, pnpm, yarn, and bun out of the box.",
  },
  {
    icon: VscTag,
    title: "Version Picker",
    description:
      "Choose any specific version from the npm registry — not just the latest. Pre-release filtering included.",
  },
  {
    icon: VscGitCommit,
    title: "Changelog Viewer",
    description: "Read GitHub release notes directly in the terminal before updating. Know what changed.",
  },
  {
    icon: VscFolderOpened,
    title: "Smart Grouping",
    description: "Group scoped packages together and sort by update frequency. Surface what matters most.",
  },
  {
    icon: VscWarning,
    title: "Major Warnings",
    description: "Highlights potentially breaking major version bumps so you can update with confidence.",
  },
  {
    icon: VscGlobe,
    title: "Global Packages",
    description: "Check and update globally installed packages across npm, pnpm, and yarn in parallel with -g.",
  },
  {
    icon: VscSync,
    title: "Self-Update",
    description: "Automatically notifies you when a newer version of ripen is available and can update itself.",
  },
  {
    icon: VscListFlat,
    title: "Show All Packages",
    description: "Run with --all to list every dependency, not just outdated ones. Great for browsing changelogs or downgrading.",
  },
];

export function Features() {
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="mb-4 text-center text-3xl font-bold tracking-tight sm:text-4xl">
          Everything you need to manage dependencies
        </h2>
        <p className="mx-auto mb-16 max-w-2xl text-center text-text-muted">
          A complete toolkit for keeping your projects up to date, right from the terminal.
        </p>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group relative rounded-xl border border-border bg-surface p-6 transition-colors hover:border-border-bright"
            >
              {/* Left accent */}
              <div className="absolute top-6 bottom-6 left-0 w-0.5 rounded-full bg-orange/0 transition-colors group-hover:bg-orange" />

              <div className="flex items-start gap-4">
                <div className="shrink-0 rounded-lg bg-orange/10 p-2 text-orange">
                  <feature.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="mb-1 font-semibold text-text">{feature.title}</h3>
                  <p className="text-sm leading-relaxed text-text-muted">{feature.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
