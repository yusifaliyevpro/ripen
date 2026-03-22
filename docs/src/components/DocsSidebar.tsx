"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

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

      {/* Mobile menu */}
      <div className="lg:hidden">
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between py-3 px-4 text-sm font-medium text-text-muted hover:text-text border border-border rounded-xl bg-surface/50 transition-colors cursor-pointer"
        >
          <span>Menu</span>
          <svg
            className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {open && (
          <div className="mt-2 border border-border rounded-xl p-3 bg-surface/50">
            {navContent}
          </div>
        )}
      </div>
    </>
  );
}
