import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import "./globals.css";
import { BASE_URL } from "@/lib/constants";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "ripen - Interactive Dependency Updater",
    template: "%s - ripen",
  },
  description:
    "Interactive TUI for updating npm, pnpm, yarn, and bun dependencies with a keyboard-driven workflow. Version picker, changelog viewer, scope grouping, frequency sorting, and multi-manager support.",
  metadataBase: new URL(BASE_URL),
  keywords: [
    "ripen",
    "dependency updater",
    "npm",
    "pnpm",
    "yarn",
    "bun",
    "TUI",
    "CLI",
    "interactive",
    "outdated packages",
    "version picker",
    "changelog viewer",
  ],
  authors: [{ name: "Yusif Aliyev", url: "https://yusifaliyevpro.com" }],
  creator: "Yusif Aliyev",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "ripen",
    title: "ripen - Interactive Dependency Updater",
    description:
      "Update npm, pnpm, yarn, and bun dependencies interactively from your terminal. Version picker, changelog viewer, and smart grouping.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "ripen - Interactive Dependency Updater" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ripen - Interactive Dependency Updater",
    description: "Update npm, pnpm, yarn, and bun dependencies interactively from your terminal.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "ripen - Interactive Dependency Updater" }],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-bg text-text">
        <Nav />
        <main className="flex-1 pt-16">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
