"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { SiNpm } from "react-icons/si";
import { VscClose, VscGithubInverted, VscMenu } from "react-icons/vsc";

const links = [
  { href: "/docs", label: "Docs" },
  { href: "/changelog", label: "Changelog" },
];

export function Nav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 right-0 left-0 z-50 border-b border-border/50 bg-bg/60 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="group flex items-center gap-1">
          <Image
            src="/icon.png"
            alt="ripen logo"
            width={50}
            height={50}
            unoptimized
            className="transition-transform group-hover:scale-110"
          />
          <span className="bg-linear-to-r from-orange to-orange-light bg-clip-text font-sans text-2xl font-bold tracking-tight text-transparent">
            ripen
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden flex-row items-center gap-20 sm:flex">
          <div className="flex items-center gap-7">
            {links.map((link) => {
              const isActive = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative py-1 text-sm font-medium transition-colors ${
                    isActive ? "text-orange" : "text-text-muted hover:text-text"
                  }`}
                >
                  {link.label}
                  {isActive && <span className="absolute right-0 -bottom-4.5 left-0 h-px bg-orange" />}
                </Link>
              );
            })}
          </div>
          <div className="flex flex-row items-center gap-6">
            <a
              href="https://github.com/yusifaliyevpro/ripen"
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-muted transition-colors hover:text-text"
              aria-label="GitHub"
            >
              <VscGithubInverted className="h-5 w-5" />
            </a>
            <a
              href="https://www.npmjs.com/package/ripencli"
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-muted transition-colors hover:text-text"
              aria-label="npm"
            >
              <SiNpm className="h-5 w-5" />
            </a>
          </div>
        </div>
        {/* Mobile toggle */}
        <button
          className="cursor-pointer text-text-muted transition-colors hover:text-text sm:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <VscClose className="h-5 w-5" /> : <VscMenu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="flex flex-col gap-3 border-t border-border bg-bg/95 px-6 py-4 backdrop-blur-xl sm:hidden">
          {links.map((link) => {
            const isActive = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`py-2 text-sm font-medium ${isActive ? "text-orange" : "text-text-muted"}`}
              >
                {link.label}
              </Link>
            );
          })}
          <a
            href="https://github.com/yusifaliyevpro/ripen"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 py-2 text-sm font-medium text-text-muted"
          >
            <VscGithubInverted className="h-4 w-4" />
            GitHub
          </a>
          <a
            href="https://www.npmjs.com/package/ripencli"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 py-2 text-sm font-medium text-text-muted"
          >
            <SiNpm className="h-4 w-4" />
            npm
          </a>
        </div>
      )}
    </nav>
  );
}
