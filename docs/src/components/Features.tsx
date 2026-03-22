import {
  VscTerminal,
  VscPackage,
  VscTag,
  VscGitCommit,
  VscFolderOpened,
  VscWarning,
  VscGlobe,
  VscSync,
} from "react-icons/vsc";
import type { IconType } from "react-icons";

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
];

export function Features() {
  return (
    <section className="py-24 sm:py-32">
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-center mb-4">
          Everything you need to manage dependencies
        </h2>
        <p className="text-text-muted text-center max-w-2xl mx-auto mb-16">
          A complete toolkit for keeping your projects up to date, right from the terminal.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group relative bg-surface border border-border rounded-xl p-6 hover:border-border-bright transition-colors"
            >
              {/* Left accent */}
              <div className="absolute left-0 top-6 bottom-6 w-0.5 bg-orange/0 group-hover:bg-orange transition-colors rounded-full" />

              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-orange/10 text-orange shrink-0">
                  <feature.icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-text mb-1">{feature.title}</h3>
                  <p className="text-sm text-text-muted leading-relaxed">{feature.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
