import type { MDXComponents } from "mdx/types";

const components: MDXComponents = {
  h1: ({ children }) => (
    <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-text mt-2 mb-6">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-2xl sm:text-3xl font-semibold text-text mt-12 mb-4 pb-3 border-b border-border">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-xl font-semibold text-text mt-8 mb-3">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-lg font-medium text-text mt-6 mb-2">{children}</h4>
  ),
  p: ({ children }) => (
    <p className="text-text-muted leading-relaxed mb-4">{children}</p>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-orange hover:text-orange-light underline underline-offset-4 decoration-orange/40 hover:decoration-orange transition-colors"
    >
      {children}
    </a>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-text">{children}</strong>
  ),
  em: ({ children }) => <em className="text-text-muted italic">{children}</em>,
  code: ({ children }) => (
    <code className="bg-surface border border-border px-1.5 py-0.5 rounded text-[0.875em] font-mono text-orange">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="bg-surface border border-border rounded-xl p-4 overflow-x-auto mb-6 text-sm font-mono leading-relaxed">
      {children}
    </pre>
  ),
  ul: ({ children }) => (
    <ul className="list-disc list-outside ml-6 space-y-2 mb-6 text-text-muted">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-outside ml-6 space-y-2 mb-6 text-text-muted">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="leading-relaxed">{children}</li>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto mb-6 rounded-xl border border-border">
      <table className="w-full text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-surface">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="text-left px-4 py-3 text-text font-semibold text-xs uppercase tracking-wider">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-4 py-3 border-t border-border text-text-muted">
      {children}
    </td>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-3 border-orange pl-4 my-6 text-text-muted [&>p]:mb-0">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="border-border my-10" />,
};

export function useMDXComponents(): MDXComponents {
  return components;
}
