import React from "react";
import { Text } from "ink";

interface Segment {
  text: string;
  bold?: boolean;
  code?: boolean;
  dim?: boolean;
}

function parseInline(raw: string): Segment[] {
  const segments: Segment[] = [];
  // patterns: **bold**, `code`, [text](url)
  const re = /(\*\*(.+?)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(raw)) !== null) {
    if (m.index > last) {
      segments.push({ text: raw.slice(last, m.index) });
    }
    if (m[2] !== undefined) {
      // **bold**
      segments.push({ text: m[2]!, bold: true });
    } else if (m[3] !== undefined) {
      // `code`
      segments.push({ text: m[3]!, code: true });
    } else if (m[4] !== undefined) {
      // [text](url) — show text, dim url
      segments.push({ text: m[4]! });
      segments.push({ text: ` (${m[5]})`, dim: true });
    }
    last = m.index + m[0].length;
  }

  if (last < raw.length) {
    segments.push({ text: raw.slice(last) });
  }

  return segments;
}

interface Props {
  line: string;
  baseColor?: string;
  baseDim?: boolean;
}

export function MarkdownLine({
  line,
  baseColor = "white",
  baseDim = false,
}: Props) {
  const raw = line;

  // Heading
  const headingMatch = raw.match(/^(#{1,3})\s+(.*)/);
  if (headingMatch) {
    const level = headingMatch[1]!.length;
    const text = headingMatch[2]!;
    const color = level === 1 ? "whiteBright" : level === 2 ? "white" : "gray";
    return (
      <Text bold color={color as any}>
        {"  "}
        {text}
      </Text>
    );
  }

  // Blockquote
  if (raw.startsWith("> ")) {
    return (
      <Text color="gray">
        {"  │ "}
        {raw.slice(2)}
      </Text>
    );
  }

  // List item
  const listMatch = raw.match(/^(\s*[-*+]|\s*\d+\.)\s+(.*)/);
  if (listMatch) {
    const indent = listMatch[1]!.match(/^\s*/)?.[0].length ?? 0;
    const content = listMatch[2]!;
    const segments = parseInline(content);
    return (
      <Text>
        {"  " + " ".repeat(indent) + "• "}
        {segments.map((s, i) => (
          <Text
            key={i}
            bold={s.bold}
            color={s.code ? "cyan" : s.dim ? "gray" : (baseColor as any)}
            dimColor={s.dim || baseDim}
          >
            {s.text}
          </Text>
        ))}
      </Text>
    );
  }

  // Horizontal rule
  if (/^[-*_]{3,}$/.test(raw.trim())) {
    return (
      <Text color="gray" dimColor>
        {"  ────────────────────"}
      </Text>
    );
  }

  // Empty line
  if (!raw.trim()) {
    return <Text> </Text>;
  }

  // Regular line with inline formatting
  const segments = parseInline(raw);
  return (
    <Text>
      {"  "}
      {segments.map((s, i) => (
        <Text
          key={i}
          bold={s.bold}
          color={s.code ? "cyan" : s.dim ? "gray" : (baseColor as any)}
          dimColor={s.dim || baseDim}
        >
          {s.text}
        </Text>
      ))}
    </Text>
  );
}
