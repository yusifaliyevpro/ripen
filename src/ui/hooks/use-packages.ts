import { useState, useCallback } from "react";
import type { OutdatedPackage } from "../../types";

export function usePackages() {
  const [packages, setPackages] = useState<OutdatedPackage[]>([]);

  const toggleOne = useCallback((index: number) => {
    setPackages((prev) => prev.map((p, i) => (i === index ? { ...p, selected: !p.selected } : p)));
  }, []);

  const toggleMany = useCallback((indices: number[]) => {
    setPackages((prev) => {
      const allSelected = indices.every((i) => prev[i]?.selected);
      return prev.map((p, i) => (indices.includes(i) ? { ...p, selected: !allSelected } : p));
    });
  }, []);

  const chooseVersion = useCallback((activeIndex: number, version: string) => {
    setPackages((prev) =>
      prev.map((p, i) => (i === activeIndex ? { ...p, targetVersion: version, selected: true } : p)),
    );
  }, []);

  return { packages, setPackages, toggleOne, toggleMany, chooseVersion };
}
