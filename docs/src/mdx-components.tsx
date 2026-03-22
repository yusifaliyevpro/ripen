import type { MDXComponents } from "mdx/types";
import { MdxCodeBlock } from "@/components/MdxCodeBlock";
import { MdxTable } from "@/components/MdxTable";

const components: MDXComponents = {
  h1: ({ children }) => (
    <h1 className="mt-2 mb-6 text-4xl font-bold tracking-tight text-text sm:text-5xl">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-12 mb-4 border-b border-border pb-3 text-2xl font-semibold text-text sm:text-3xl">{children}</h2>
  ),
  h3: ({ children }) => <h3 className="mt-8 mb-3 text-xl font-semibold text-text">{children}</h3>,
  h4: ({ children }) => <h4 className="mt-6 mb-2 text-lg font-medium text-text">{children}</h4>,
  p: ({ children }) => <p className="mb-4 leading-relaxed text-text-muted">{children}</p>,
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-orange underline decoration-orange/40 underline-offset-4 transition-colors hover:text-orange-light hover:decoration-orange"
    >
      {children}
    </a>
  ),
  strong: ({ children }) => <strong className="font-semibold text-text">{children}</strong>,
  em: ({ children }) => <em className="text-text-muted italic">{children}</em>,
  code: ({ children }) => (
    <code className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[0.875em] text-orange">
      {children}
    </code>
  ),
  pre: ({ children }) => <MdxCodeBlock>{children}</MdxCodeBlock>,
  ul: ({ children }) => <ul className="mb-6 ml-6 list-outside list-disc space-y-2 text-text-muted">{children}</ul>,
  ol: ({ children }) => <ol className="mb-6 ml-6 list-outside list-decimal space-y-2 text-text-muted">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  table: ({ children }) => <MdxTable>{children}</MdxTable>,
  blockquote: ({ children }) => (
    <blockquote className="my-6 border-l-3 border-orange pl-4 text-text-muted [&>p]:mb-0">{children}</blockquote>
  ),
  hr: () => <hr className="my-10 border-border" />,
};

export function useMDXComponents(): MDXComponents {
  return components;
}
