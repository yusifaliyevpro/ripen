import { Text } from "ink";

type Segment = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
  code?: boolean;
  link?: string; // url — render as clickable OSC 8 hyperlink
};

/** Wrap text in an OSC 8 hyperlink so modern terminals make it clickable. */
function osc8(text: string, url: string): string {
  return `\x1b]8;;${url}\x07${text}\x1b]8;;\x07`;
}

function parseInline(raw: string, repoUrl?: string): Segment[] {
  const segments: Segment[] = [];
  // Order matters: ** before *, ~~ before bare ~, HTML tags use non-capturing groups (no backrefs)
  // Groups: 2=bold 3=italic 4=strike 5=code 6=linkText 7=linkUrl
  //         8=strong/b  9=em/i  10=del/s  11=code/samp/kbd  12=issueRef  13=mention  14=bareUrl
  const re =
    /(\*\*(.+?)\*\*|\*([^*\n]+)\*|~~([^~\n]+)~~|`([^`]+)`|\[([^\]]*)\]\(([^)]+)\)|<(?:strong|b)>(.+?)<\/(?:strong|b)>|<(?:em|i)>(.+?)<\/(?:em|i)>|<(?:del|s)>(.+?)<\/(?:del|s)>|<(?:code|samp|kbd)>(.+?)<\/(?:code|samp|kbd)>|(?<![/\w&#])#(\d+)|(?<!\w)@([a-zA-Z0-9][a-zA-Z0-9-]*)|(https?:\/\/[^\s)>\]]+))/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(raw)) !== null) {
    if (m.index > last) {
      segments.push({ text: raw.slice(last, m.index) });
    }
    if (m[2] !== undefined) {
      segments.push({ text: m[2]!, bold: true });
    } else if (m[3] !== undefined) {
      segments.push({ text: m[3]!, italic: true });
    } else if (m[4] !== undefined) {
      segments.push({ text: m[4]!, strikethrough: true });
    } else if (m[5] !== undefined) {
      segments.push({ text: m[5]!, code: true });
    } else if (m[6] !== undefined) {
      const linkText = m[6]!.trim() || m[7]!;
      segments.push({ text: linkText, link: m[7]! });
    } else if (m[8] !== undefined) {
      segments.push({ text: m[8]!, bold: true });
    } else if (m[9] !== undefined) {
      segments.push({ text: m[9]!, italic: true });
    } else if (m[10] !== undefined) {
      segments.push({ text: m[10]!, strikethrough: true });
    } else if (m[11] !== undefined) {
      segments.push({ text: m[11]!, code: true });
    } else if (m[12] !== undefined) {
      // #number — issue/PR reference
      const num = m[12]!;
      const url = repoUrl ? `${repoUrl}/issues/${num}` : undefined;
      segments.push(url ? { text: `#${num}`, link: url } : { text: `#${num}`, code: true });
    } else if (m[13] !== undefined) {
      // @mention
      const user = m[13]!;
      segments.push({ text: `@${user}`, link: `https://github.com/${user}` });
    } else if (m[14] !== undefined) {
      segments.push({ text: m[14]!, link: m[14]! });
    }
    last = m.index + m[0].length;
  }

  if (last < raw.length) {
    segments.push({ text: raw.slice(last) });
  }

  return segments;
}

function Segment({ s, baseColor }: { s: Segment; baseColor: string }) {
  if (s.link) {
    return (
      <Text color="blueBright" underline>
        {osc8(s.text, s.link)}
      </Text>
    );
  }
  if (s.code) return <Text color="cyan">{s.text}</Text>;
  if (s.bold)
    return (
      <Text bold color={baseColor as any}>
        {s.text}
      </Text>
    );
  if (s.italic)
    return (
      <Text italic color={baseColor as any}>
        {s.text}
      </Text>
    );
  if (s.strikethrough)
    return (
      <Text strikethrough color="gray">
        {s.text}
      </Text>
    );
  return <Text color={baseColor as any}>{s.text}</Text>;
}

type Props = {
  line: string;
  baseColor?: string;
  baseDim?: boolean;
  repoUrl?: string;
};

const HTML_ENTITIES: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
  "&mdash;": "—",
  "&ndash;": "–",
  "&hellip;": "…",
  "&laquo;": "«",
  "&raquo;": "»",
};

function decodeEntities(s: string): string {
  return s
    .replace(/&[a-z]+;/g, (e) => HTML_ENTITIES[e] ?? e)
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)));
}

export function MarkdownLine({ line, baseColor = "white", repoUrl }: Props) {
  const raw = decodeEntities(line);

  // Heading (h1–h6)
  const headingMatch = raw.match(/^(#{1,6})\s+(.*)/);
  if (headingMatch) {
    const level = headingMatch[1]!.length;
    const text = headingMatch[2]!;
    const color = level === 1 ? "whiteBright" : level === 2 ? "cyanBright" : level === 3 ? "cyan" : "gray";
    const bold = level <= 3;
    const prefix = "  " + "  ".repeat(Math.max(0, level - 3));
    const segments = parseInline(text, repoUrl);
    return (
      <Text bold={bold} color={color as any}>
        {prefix}
        {segments.map((s, i) => (
          <Segment key={i} s={s} baseColor={color} />
        ))}
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
    const segments = parseInline(content, repoUrl);
    return (
      <Text>
        {"  " + " ".repeat(indent) + "• "}
        {segments.map((s, i) => (
          <Segment key={i} s={s} baseColor={baseColor} />
        ))}
      </Text>
    );
  }

  // Horizontal rule
  if (/^[-*_]{3,}$/.test(raw.trim())) {
    return <Text color="gray">{"  ────────────────────"}</Text>;
  }

  // Empty line
  if (!raw.trim()) {
    return <Text> </Text>;
  }

  // Regular line with inline formatting
  const segments = parseInline(raw, repoUrl);
  return (
    <Text>
      {"  "}
      {segments.map((s, i) => (
        <Segment key={i} s={s} baseColor={baseColor} />
      ))}
    </Text>
  );
}
