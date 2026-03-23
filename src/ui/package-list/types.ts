import type { OutdatedPackage } from "../../types";

// ── Display row types ────────────────────────────────────────────────

export type DisplayRow =
  | {
      kind: "header";
      groupType: OutdatedPackage["type"];
      label: string;
      packages: OutdatedPackage[];
      packageIndices: number[];
    }
  | {
      kind: "scope-header";
      groupType: OutdatedPackage["type"];
      scope: string;
      packageIndices: number[];
      packages: OutdatedPackage[];
    }
  | { kind: "package"; pkg: OutdatedPackage; packageIndex: number; indented: boolean; scopeKey: string | null };

export type GroupItem = {
  row: DisplayRow;
  visibleIndex: number;
};

export type PackageGroup = {
  type: OutdatedPackage["type"];
  label: string;
  allPackages: OutdatedPackage[];
  items: GroupItem[];
  headerVisibleIndex: number;
};

// ── Constants ────────────────────────────────────────────────────────

export const TYPE_COLORS: Record<string, string> = {
  dependencies: "cyan",
  devDependencies: "magenta",
  global: "yellow",
};

export const GROUP_LABELS: Record<string, string> = {
  dependencies: "Dependencies",
  devDependencies: "Dev Dependencies",
  global: "Global Packages",
};

export const GROUP_ORDER = ["dependencies", "devDependencies", "global"];

/** Header (1) + controls (1) + margin (1) + footer (1) + group headers/borders overhead */
export const CHROME_LINES = 8;
/** Column header inside each bordered box + scroll indicator lines */
export const GROUP_CHROME = 5; // border top + column header + scroll-up + scroll-down + border bottom
