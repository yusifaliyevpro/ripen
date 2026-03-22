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
              className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive ? "bg-orange/10 text-orange" : "text-text-muted hover:bg-surface hover:text-text"
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
      <aside className="hidden w-56 shrink-0 lg:block">
        <div className="sticky top-24">
          <p className="mb-3 px-3 text-xs font-semibold tracking-wider text-text-dim uppercase">Documentation</p>
          {navContent}
        </div>
      </aside>

      {/* Mobile menu */}
      <div className="lg:hidden">
        <button
          onClick={() => setOpen(!open)}
          className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-border bg-surface/50 px-4 py-3 text-sm font-medium text-text-muted transition-colors hover:text-text"
        >
          <span>Menu</span>
          <svg
            className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {open && <div className="mt-2 rounded-xl border border-border bg-surface/50 p-3">{navContent}</div>}
      </div>
    </>
  );
}
