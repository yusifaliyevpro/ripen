export default function ChangelogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      {/* Orange gradient extending behind navbar */}
      <div className="absolute inset-x-0 -top-16 h-[650px] bg-gradient-to-b from-orange/10 via-orange/5 to-transparent pointer-events-none" />

      {/* Heading */}
      <div className="relative max-w-4xl mx-auto px-6 pt-20 pb-12 sm:pt-28 sm:pb-16">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">Changelog</h1>
      </div>

      {/* Entries */}
      <div className="relative max-w-4xl mx-auto px-6 pb-16">{children}</div>
    </div>
  );
}
