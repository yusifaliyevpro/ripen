export default function ChangelogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      {/* Orange gradient extending behind navbar */}
      <div className="pointer-events-none absolute inset-x-0 -top-16 h-[650px] bg-gradient-to-b from-orange/10 via-orange/5 to-transparent" />

      {/* Heading */}
      <div className="relative mx-auto max-w-4xl px-6 pt-20 pb-12 sm:pt-28 sm:pb-16">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Changelog</h1>
      </div>

      {/* Entries */}
      <div className="relative mx-auto max-w-4xl px-6 pb-16">{children}</div>
    </div>
  );
}
