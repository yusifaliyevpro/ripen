import { Children, type ReactNode, isValidElement } from "react";

function getChildArray(node: ReactNode): ReactNode[] {
  if (!isValidElement<{ children?: ReactNode }>(node)) return [];
  return Children.toArray(node.props.children);
}

function getCellContent(node: ReactNode): ReactNode {
  if (!isValidElement<{ children?: ReactNode }>(node)) return node;
  return node.props.children;
}

export function MdxTable({ children }: { children: ReactNode }) {
  const sections = Children.toArray(children);

  let headerCells: ReactNode[] = [];
  const bodyRows: ReactNode[][] = [];

  for (const section of sections) {
    if (!isValidElement(section)) continue;
    const type = section.type;

    if (type === "thead") {
      const trs = getChildArray(section);
      if (trs.length > 0 && isValidElement(trs[0])) {
        headerCells = getChildArray(trs[0]).map(getCellContent);
      }
    } else if (type === "tbody") {
      const trs = getChildArray(section);
      for (const tr of trs) {
        if (isValidElement(tr)) {
          const cells = getChildArray(tr).map(getCellContent);
          bodyRows.push(cells);
        }
      }
    }
  }

  return (
    <div className="mb-6 overflow-x-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-surface">
            {headerCells.map((cell, i) => (
              <th key={i} scope="col" className="px-4 py-3 font-semibold whitespace-nowrap text-text">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bodyRows.map((row, i) => (
            <tr key={i} className="border-b border-border last:border-b-0 hover:bg-surface-hover">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3 align-top text-text-muted">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
