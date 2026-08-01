import { describe, expect, it } from "vitest";
import { decodeEntities, parseInline, prettyUrl, stripHtmlTags } from "../src/ui/markdown-line";

describe("prettyUrl", () => {
  it("shortens an issue URL to #number", () => {
    expect(prettyUrl("https://github.com/owner/repo/issues/123")).toBe("#123");
  });

  it("shortens a pull URL to #number", () => {
    expect(prettyUrl("https://github.com/owner/repo/pull/42")).toBe("#42");
  });

  it("shortens a commit URL to a 7-char SHA", () => {
    expect(prettyUrl("https://github.com/owner/repo/commit/abcdef1234567890")).toBe("abcdef1");
  });

  it("tolerates a trailing #anchor or ?query", () => {
    expect(prettyUrl("https://github.com/owner/repo/issues/7#issuecomment-1")).toBe("#7");
  });

  it("leaves an unrelated URL untouched", () => {
    expect(prettyUrl("https://example.com/foo")).toBe("https://example.com/foo");
  });
});

describe("stripHtmlTags", () => {
  it("removes tags but keeps inner text", () => {
    expect(stripHtmlTags("<samp>npm i</samp>")).toBe("npm i");
    expect(stripHtmlTags("a <b>bold</b> word")).toBe("a bold word");
  });

  it("leaves plain text unchanged", () => {
    expect(stripHtmlTags("no tags here")).toBe("no tags here");
  });
});

describe("decodeEntities", () => {
  it("decodes named entities", () => {
    expect(decodeEntities("a &amp; b &lt; c &gt; d")).toBe("a & b < c > d");
    expect(decodeEntities("&mdash;")).toBe("—");
  });

  it("decodes decimal and hex numeric entities", () => {
    expect(decodeEntities("&#65;&#66;")).toBe("AB");
    expect(decodeEntities("&#x41;&#x42;")).toBe("AB");
  });

  it("leaves unknown named entities intact", () => {
    expect(decodeEntities("&unknownentity;")).toBe("&unknownentity;");
  });
});

describe("parseInline", () => {
  it("returns a single plain segment for unformatted text", () => {
    expect(parseInline("just text")).toEqual([{ text: "just text" }]);
  });

  it("parses bold, italic, strikethrough, and code", () => {
    expect(parseInline("**b**")).toEqual([{ text: "b", bold: true }]);
    expect(parseInline("*i*")).toEqual([{ text: "i", italic: true }]);
    expect(parseInline("~~s~~")).toEqual([{ text: "s", strikethrough: true }]);
    expect(parseInline("`c`")).toEqual([{ text: "c", code: true }]);
  });

  it("parses HTML emphasis tags", () => {
    expect(parseInline("<b>x</b>")).toEqual([{ text: "x", bold: true }]);
    expect(parseInline("<code>y</code>")).toEqual([{ text: "y", code: true }]);
  });

  it("parses a markdown link and keeps its text", () => {
    expect(parseInline("[docs](https://example.com)")).toEqual([{ text: "docs", link: "https://example.com" }]);
  });

  it("turns an #issue reference into a repo link when repoUrl is known", () => {
    expect(parseInline("see #12", "https://github.com/o/r")).toEqual([
      { text: "see " },
      { text: "#12", link: "https://github.com/o/r/issues/12" },
    ]);
  });

  it("renders an #issue reference as code when no repoUrl is available", () => {
    expect(parseInline("see #12")).toEqual([{ text: "see " }, { text: "#12", code: true }]);
  });

  it("links a @mention to a GitHub profile", () => {
    expect(parseInline("thanks @octocat")).toEqual([
      { text: "thanks " },
      { text: "@octocat", link: "https://github.com/octocat" },
    ]);
  });

  it("shortens a bare GitHub URL while linking the full URL", () => {
    expect(parseInline("https://github.com/o/r/pull/9")).toEqual([
      { text: "#9", link: "https://github.com/o/r/pull/9" },
    ]);
  });

  it("preserves surrounding text around inline markup", () => {
    expect(parseInline("a **b** c")).toEqual([{ text: "a " }, { text: "b", bold: true }, { text: " c" }]);
  });
});
