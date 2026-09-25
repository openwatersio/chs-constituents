import { describe, it, expect } from "vitest";
import { CHS_SOURCE, normalizeName, registryOverlay, stationsFromApi } from "../src/registry.js";

const chs = { name: CHS_SOURCE };
const noaa = { name: "US National Oceanic and Atmospheric Administration" };

describe("normalizeName", () => {
  it("folds case, punctuation and spacing so provider names match curated ones", () => {
    expect(normalizeName("DODD NARROWS")).toBe("dodd narrows");
    expect(normalizeName("Hole in the Wall")).toBe("hole in the wall");
    expect(normalizeName("Juan de Fuca - East")).toBe("juan de fuca east");
  });
});

describe("registryOverlay", () => {
  it("keys entries by normalized name and reads no provider id at all", () => {
    const overlay = registryOverlay([
      { id: "chs-dodd-narrows", name: "Dodd Narrows", kind: "current", source: chs },
    ]);
    expect(overlay.get("dodd narrows")).toEqual({ key: "chs-dodd-narrows", label: "Dodd Narrows" });
  });

  it("only includes CHS records", () => {
    const overlay = registryOverlay([
      { id: "chs-x", name: "X", kind: "current", source: chs },
      { id: "noaa-boundary-pass", name: "Boundary Pass", kind: "current", source: noaa },
    ]);
    expect([...overlay.keys()]).toEqual(["x"]);
  });

  it("skips tide reference ports so they can't read as name drift", () => {
    const overlay = registryOverlay([
      { id: "chs-x", name: "X", kind: "current", source: chs },
      { id: "chs-victoria", name: "Victoria", kind: "tide", source: chs },
      { id: "chs-y", name: "Y", kind: "current", source: chs },
    ]);
    expect([...overlay.keys()].sort()).toEqual(["x", "y"]);
  });

  // A derived gate is derived precisely BECAUSE CHS publishes no current station
  // for it, so it can never match a live IWLS station. Carrying it in the overlay
  // made every build log "found no live IWLS station (name drift?)" for Malibu —
  // a warning that exists to catch real renames, fired on a station that is
  // missing by definition, which teaches the operator to ignore it.
  it("skips derived gates — they have no live station to drift from", () => {
    const overlay = registryOverlay([
      { id: "chs-x", name: "X", kind: "current", source: chs },
      {
        id: "chs-malibu-rapids",
        name: "Malibu Rapids",
        kind: "current",
        source: chs,
        current: {
          derived: { reference: "chs-point-atkinson", high_water_lag_minutes: 25, low_water_lag_minutes: 35 },
        },
      },
    ]);
    expect([...overlay.keys()]).toEqual(["x"]);
  });

  it("the real database yields no derived gate", () => {
    expect([...registryOverlay().values()].find((v) => v.key === "chs-malibu-rapids")).toBeUndefined();
  });

  it("refuses a record with an empty id or name", () => {
    expect(() => registryOverlay([{ id: "", name: "X", kind: "current", source: chs }])).toThrow(/empty/);
    expect(() => registryOverlay([{ id: "chs-x", name: "", kind: "current", source: chs }])).toThrow(/empty/);
  });

  it("includes the real CHS gates (guards a silent rename)", () => {
    const overlay = registryOverlay();
    expect(overlay.get("dodd narrows")?.key).toBe("chs-dodd-narrows");
    expect(overlay.size).toBeGreaterThanOrEqual(19);
  });
});

describe("stationsFromApi", () => {
  const overlay = registryOverlay([
    { id: "chs-dodd-narrows", name: "Dodd Narrows", kind: "current", source: chs },
  ]);

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
