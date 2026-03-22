"use client";

import { Table } from "@heroui/react";
import { Children, type ReactElement, type ReactNode, isValidElement } from "react";

function getChildArray(node: ReactNode): ReactNode[] {
  if (!isValidElement(node)) return [];
  return Children.toArray((node as ReactElement<{ children?: ReactNode }>).props.children);
}

function getCellContent(node: ReactNode): ReactNode {
  if (!isValidElement(node)) return node;
  return (node as ReactElement<{ children?: ReactNode }>).props.children;
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
    <div className="mb-6">
      <Table>
        <Table.ScrollContainer>
          <Table.Content aria-label="Table">
            <Table.Header>
              {headerCells.map((cell, i) => (
                <Table.Column key={i} isRowHeader={i === 0}>
                  {cell}
                </Table.Column>
              ))}
            </Table.Header>
            <Table.Body>
              {bodyRows.map((row, i) => (
                <Table.Row key={i}>
                  {row.map((cell, j) => (
                    <Table.Cell key={j}>{cell}</Table.Cell>
                  ))}
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table>
    </div>
  );
}
