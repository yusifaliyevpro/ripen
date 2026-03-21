import { DocsSidebar } from "@/components/DocsSidebar";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-6xl mx-auto px-6 py-12 sm:py-16 flex gap-12">
      <DocsSidebar />
      <article className="min-w-0 flex-1 max-w-3xl">{children}</article>
    </div>
  );
}
