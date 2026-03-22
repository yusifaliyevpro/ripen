"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { SiNpm } from "react-icons/si";
import { VscGithubInverted, VscMenu, VscClose } from "react-icons/vsc";

const links = [
  { href: "/docs", label: "Docs" },
  { href: "/changelog", label: "Changelog" },
];

export function Nav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-bg/60 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-1 group">
          <Image
            src="/icon.svg"
            alt="ripen logo"
            width={50}
            height={50}
            className="group-hover:scale-110 transition-transform"
          />
          <span className="font-sans font-bold text-2xl bg-linear-to-r from-orange to-orange-light bg-clip-text text-transparent tracking-tight">
            ripen
          </span>
        </Link>

        {/* Desktop links */}
        <div className="flex flex-row items-center gap-20">
          <div className="hidden sm:flex items-center gap-7">
            {links.map((link) => {
              const isActive = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm font-medium transition-colors relative py-1 ${
                    isActive ? "text-orange" : "text-text-muted hover:text-text"
                  }`}
                >
                  {link.label}
                  {isActive && <span className="absolute -bottom-4.5 left-0 right-0 h-px bg-orange" />}
                </Link>
              );
            })}
          </div>
          <div className="flex flex-row items-center gap-6">
            <a
              href="https://github.com/yusifaliyevpro/ripen"
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-muted hover:text-text transition-colors"
              aria-label="GitHub"
            >
              <VscGithubInverted className="w-5 h-5" />
            </a>
            <a
              href="https://www.npmjs.com/package/ripencli"
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-muted hover:text-text transition-colors"
              aria-label="npm"
            >
              <SiNpm className="w-5 h-5" />
            </a>
          </div>

          {/* Mobile toggle */}
          <button
            className="sm:hidden text-text-muted hover:text-text transition-colors cursor-pointer"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <VscClose className="w-5 h-5" /> : <VscMenu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="sm:hidden border-t border-border bg-bg/95 backdrop-blur-xl px-6 py-4 flex flex-col gap-3">
          {links.map((link) => {
            const isActive = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`text-sm font-medium py-2 ${isActive ? "text-orange" : "text-text-muted"}`}
              >
                {link.label}
              </Link>
            );
          })}
          <a
            href="https://github.com/yusifaliyevpro/ripen"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-text-muted py-2 flex items-center gap-2"
          >
            <VscGithubInverted className="w-4 h-4" />
            GitHub
          </a>
          <a
            href="https://www.npmjs.com/package/ripencli"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-text-muted py-2 flex items-center gap-2"
          >
            <SiNpm className="w-4 h-4" />
            npm
          </a>
        </div>
      )}
    </nav>
  );
}
