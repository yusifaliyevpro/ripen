// Extract release notes from the changelog page for a given version.
// Usage: node scripts/extract-release-notes.js <version> <output-file>

const fs = require("fs");

const version = process.argv[2];
const outputFile = process.argv[3];

if (!version || !outputFile) {
  console.error("Usage: node scripts/extract-release-notes.js <version> <output-file>");
  process.exit(1);
}

const src = fs.readFileSync("docs/src/app/changelog/page.tsx", "utf-8");

// Match the ChangelogEntry for this version
const versionEscaped = version.replace(/\./g, "\\.");
const entryRegex = new RegExp(
  '<ChangelogEntry[^>]*version="' + versionEscaped + '"[^>]*title="([^"]+)"[^>]*>([\\s\\S]*?)</ChangelogEntry>',
  "m",
);
const match = src.match(entryRegex);

if (!match) {
  console.error(`Could not find changelog entry for version ${version}`);
  process.exit(1);
}

const title = match[1];
let body = match[2];

// Strip JSX tags and convert to markdown
body = body
  .replace(/<p[^>]*>/g, "")
  .replace(/<\/p>/g, "\n")
  .replace(/<strong>/g, "**")
  .replace(/<\/strong>/g, "**")
  .replace(/<code[^>]*>/g, "`")
  .replace(/<\/code>/g, "`")
  .replace(/<ul[^>]*>/g, "")
  .replace(/<\/ul>/g, "")
  .replace(/<li[^>]*>/g, "- ")
  .replace(/<\/li>/g, "\n")
  .replace(/<br\s*\/?>/g, "\n")
  .replace(/\{" "\}/g, " ")
  .replace(/\{"\\n"\}/g, "\n")
  .replace(/<[^>]+>/g, "")
  // Collapse JSX indentation: trim each line, remove empty duplicates
  .split("\n")
  .map((line) => line.replace(/\s+/g, " ").trim())
  .filter((line, i, arr) => !(line === "" && arr[i - 1] === ""))
  .join("\n")
  // Join continuation lines: if a line doesn't start a new block (-, ##, empty), merge with previous
  .replace(/\n(?![-#\n])/g, " ")
  .replace(/ {2,}/g, " ")
  .replace(/\n{3,}/g, "\n\n")
  .trim();

const notes = `## ${title}\n\n${body}`;
fs.writeFileSync(outputFile, notes);
console.log("Release notes extracted successfully:");
console.log(notes);
