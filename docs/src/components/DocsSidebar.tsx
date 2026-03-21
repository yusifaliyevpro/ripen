"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { VscMenu, VscClose } from "react-icons/vsc";

const navItems = [
  { href: "/docs", label: "Overview" },
  { href: "/docs/installation", label: "Installation" },
  { href: "/docs/usage", label: "Usage" },
  { href: "/docs/configuration", label: "Configuration" },
  { href: "/docs/package-managers", label: "Package Managers" },
];

export function DocsSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const navContent = (
    <ul className="space-y-1">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={() => setOpen(false)}
              className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "text-orange bg-orange/10"
                  : "text-text-muted hover:text-text hover:bg-surface"
              }`}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-56 shrink-0">
        <div className="sticky top-24">
          <p className="px-3 mb-3 text-xs font-semibold uppercase tracking-wider text-text-dim">
            Documentation
          </p>
          {navContent}
        </div>
      </aside>

      {/* Mobile toggle */}
      <div className="lg:hidden mb-6">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 text-sm text-text-muted hover:text-text transition-colors cursor-pointer"
        >
          {open ? (
            <VscClose className="w-4 h-4" />
          ) : (
            <VscMenu className="w-4 h-4" />
          )}
          Navigation
        </button>
        {open && <div className="mt-3 border border-border rounded-xl p-3 bg-surface">{navContent}</div>}
      </div>
    </>
  );
}
