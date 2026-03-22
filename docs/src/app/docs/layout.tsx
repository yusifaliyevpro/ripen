import { DocsSidebar } from "@/components/DocsSidebar";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-12 sm:py-16 lg:flex-row lg:gap-12">
      <DocsSidebar />
      <article className="max-w-3xl min-w-0 flex-1">{children}</article>
    </div>
  );
}
