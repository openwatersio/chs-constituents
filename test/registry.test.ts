import { describe, it, expect } from "vitest";
import { normalizeName, registryOverlay, stationsFromApi } from "../src/registry.js";

describe("normalizeName", () => {
  it("folds case, punctuation and spacing so provider names match curated ones", () => {
    expect(normalizeName("DODD NARROWS")).toBe("dodd narrows");
    expect(normalizeName("Hole in the Wall")).toBe("hole in the wall");
    expect(normalizeName("Juan de Fuca - East")).toBe("juan de fuca east");
  });
});

describe("registryOverlay", () => {
  it("keys entries by normalized name and reads no id at all", () => {
    // No providerId field anywhere — proves the overlay is forward-compatible
    // with the registry dropping providerId in Phase 2.
    const overlay = registryOverlay(
      { "chs-dodd-narrows": { name: "Dodd Narrows", provider: "chs" } },
      "chs",
    );
    expect(overlay.get("dodd narrows")).toEqual({ key: "chs-dodd-narrows", label: "Dodd Narrows" });
  });

  it("only includes the requested provider", () => {
    const overlay = registryOverlay(
      { "chs-x": { name: "X", provider: "chs" }, "noaa-y": { name: "Y", provider: "noaa" } },
      "chs",
    );
    expect([...overlay.keys()]).toEqual(["x"]);
  });

  it("skips tide reference ports (kind !== current) so they can't read as name drift", () => {
    const overlay = registryOverlay(
      {
        "chs-x": { name: "X", provider: "chs" },
        "chs-victoria": { name: "Victoria", provider: "chs", kind: "tide" },
        "chs-y": { name: "Y", provider: "chs", kind: "current" },
      },
      "chs",
    );
    expect([...overlay.keys()].sort()).toEqual(["x", "y"]);
  });

  // A derived gate is derived precisely BECAUSE CHS publishes no current station
  // for it, so it can never match a live IWLS station. Carrying it in the overlay
  // made every build log "found no live IWLS station (name drift?)" for Malibu —
  // a warning that exists to catch real renames, fired on a station that is
  // missing by definition, which teaches the operator to ignore it.
  it("skips derived gates — they have no live station to drift from", () => {
    const overlay = registryOverlay(
      {
        "chs-x": { name: "X", provider: "chs" },
        "chs-malibu-rapids": {
          name: "Malibu Rapids", provider: "chs", kind: "current",
          derived: { reference: "chs-point-atkinson", hwLagMinutes: 25, lwLagMinutes: 35 },
        },
      },
      "chs",
    );
    expect([...overlay.keys()]).toEqual(["x"]);
  });

  it("the real bundled registry yields no derived gate", () => {
    expect([...registryOverlay().values()].find((v) => v.key === "chs-malibu-rapids")).toBeUndefined();
  });

  it("refuses an entry with an empty key or name", () => {
    expect(() => registryOverlay({ "": { name: "X", provider: "chs" } })).toThrow(/empty/);
    expect(() => registryOverlay({ "chs-x": { name: "", provider: "chs" } })).toThrow(/empty/);
  });

  it("includes the real bundled CHS gates (guards a silent rename)", () => {
    const overlay = registryOverlay();
    expect(overlay.get("dodd narrows")?.key).toBe("chs-dodd-narrows");
    expect(overlay.size).toBeGreaterThanOrEqual(19);
  });
});

describe("stationsFromApi", () => {
  const overlay = registryOverlay(
    { "chs-dodd-narrows": { name: "Dodd Narrows", provider: "chs" } },
    "chs",
  );

  it("takes id from the live station, key+label from the overlay when the name matches", () => {
    const refs = stationsFromApi(
      [{ id: "iwls-dodd-test", officialName: "DODD NARROWS", latitude: 49.1, longitude: -123.8, operating: true }],
      overlay,
    );
    expect(refs).toEqual([{ id: "iwls-dodd-test", label: "Dodd Narrows", key: "chs-dodd-narrows" }]);
  });

  it("falls back to the official name and no key when unmatched (pipeline slugs it)", () => {
    const refs = stationsFromApi(
      [{ id: "abc", officialName: "Somewhere New", latitude: 0, longitude: 0, operating: true }],
      overlay,
    );
    expect(refs).toEqual([{ id: "abc", label: "Somewhere New" }]);
  });
});
