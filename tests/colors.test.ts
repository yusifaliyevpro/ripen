import { describe, expect, it } from "vitest";
import { colors } from "../src/lib/colors";

describe("colors", () => {
  it("wraps text in the matching SGR codes", () => {
    expect(colors.green("x")).toBe("\x1b[32mx\x1b[39m");
    expect(colors.red("x")).toBe("\x1b[31mx\x1b[39m");
    expect(colors.yellow("x")).toBe("\x1b[33mx\x1b[39m");
    expect(colors.cyan("hi")).toBe("\x1b[36mhi\x1b[39m");
  });

  it("uses the correct reset code for bold and dim", () => {
    expect(colors.bold("x")).toBe("\x1b[1mx\x1b[22m");
    expect(colors.dim("x")).toBe("\x1b[2mx\x1b[22m");
  });
});
