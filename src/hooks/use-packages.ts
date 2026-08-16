import { useState, useCallback } from "react";
import type { OutdatedPackage } from "../types";

export function usePackages() {
  const [packages, setPackages] = useState<OutdatedPackage[]>([]);

  const toggleOne = useCallback((index: number) => {
    setPackages((prev) => prev.map((p, i) => (i === index ? { ...p, selected: !p.selected } : p)));
  }, []);

  const toggleMany = useCallback((indices: number[]) => {
    setPackages((prev) => {
      // Set membership keeps this O(n) instead of O(n·m) — `indices.includes`
      // inside `map` is quadratic when selecting a large group.
      const targeted = new Set(indices);
      const allSelected = indices.every((i) => prev[i]?.selected);
      return prev.map((p, i) => (targeted.has(i) ? { ...p, selected: !allSelected } : p));
    });
  }, []);

  const chooseVersion = useCallback((activeIndex: number, version: string, publishedAt?: string) => {
    setPackages((prev) =>
      prev.map((p, i) =>
        i === activeIndex ? { ...p, targetVersion: version, targetPublishedAt: publishedAt, selected: true } : p,
      ),
    );
  }, []);

  return { packages, setPackages, toggleOne, toggleMany, chooseVersion };
}
