import { describe, expect, it } from "vitest";
import { checkBoundary } from "../scripts/check-boundary.mjs";

const packageFiles = ["LICENSE", "README.md", "package.json", "dist/index.js"]
  .map((path) => ({ path, contents: "" }));

describe("package boundary", () => {
  it("rejects a tracked generated CHS bundle", () => {
    expect(() => checkBoundary(
      [{ path: "my-currents.json", contents: '{"generated":"2026-08-28","stations":[]}' }],
      packageFiles,
    )).toThrow(/generated CHS bundle/);
  });

  it("rejects an unexpected npm tarball entry", () => {
    expect(() => checkBoundary([], [...packageFiles, { path: "currents.json", contents: "{}" }]))
      .toThrow(/unexpected npm package entry: currents\.json/);
  });

  it("rejects generated JSON hidden below dist", () => {
    expect(() => checkBoundary([], [
      ...packageFiles,
      { path: "dist/currents.json", contents: '{"generated":"2026-08-28","stations":[]}' },
    ])).toThrow(/dist\/currents\.json/);
  });

  it("scans the contents of packed code", () => {
    const stationId = "a".repeat(24);
    expect(() => checkBoundary([], [
      ...packageFiles,
      { path: "dist/leak.js", contents: `export const stationId = "${stationId}";` },
    ])).toThrow(/provider-minted station identifier/);
  });

  it("rejects a provider-minted station identifier", () => {
    const stationId = "a".repeat(24);
    expect(() => checkBoundary(
      [{ path: "test/fixture.ts", contents: `const stationId = "${stationId}";` }],
      packageFiles,
    )).toThrow(/provider-minted station identifier/);
  });

  it("rejects a generated CHS bundle nested in tracked JSON", () => {
    expect(() => checkBoundary(
      [{ path: "fixture.json", contents: '{"payload":{"generated":"2026-08-28","stations":[]}}' }],
      packageFiles,
    )).toThrow(/generated CHS bundle/);
  });

  it("accepts source metadata and compiled code", () => {
    expect(() => checkBoundary(
      [{ path: "package.json", contents: '{"name":"@sailingnaturali/chs-constituents"}' }],
      packageFiles,
    )).not.toThrow();
  });
});
