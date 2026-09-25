import { describe, it, expect } from "vitest";
import { derivedGates } from "../src/derived.js";
import { CHS_SOURCE, type GateStation } from "../src/registry.js";

// A derived gate has no current station of its own: slack is the reference tide
// port's high/low water shifted by a fixed lag. The database record carries a
// `current.derived` block naming the reference and the HW/LW lags.
const chs = { name: CHS_SOURCE };
const STATIONS: GateStation[] = [
  {
    id: "chs-malibu-rapids",
    name: "Malibu Rapids",
    kind: "current",
    source: chs,
    current: {
      derived: { reference: "chs-point-atkinson", high_water_lag_minutes: 25, low_water_lag_minutes: 35 },
    },
  },
  { id: "chs-point-atkinson", name: "Point Atkinson", kind: "tide", source: chs },
  { id: "chs-dodd-narrows", name: "Dodd Narrows", kind: "current", source: chs, current: {} },
];

describe("derivedGates", () => {
  it("reads derived-gate specs and resolves the reference port's name", () => {
    expect(derivedGates(STATIONS)).toEqual([
      {
        key: "chs-malibu-rapids",
        name: "Malibu Rapids",
        referenceKey: "chs-point-atkinson",
        referenceName: "Point Atkinson",
        hwLagMinutes: 25,
        lwLagMinutes: 35,
      },
    ]);
  });

  it("ignores non-derived records", () => {
    expect(derivedGates([STATIONS[2]!])).toEqual([]);
  });

  it("refuses a derived gate whose reference is not a CHS record", () => {
    expect(() =>
      derivedGates([
        {
          id: "chs-x",
          name: "X",
          kind: "current",
          source: chs,
          current: { derived: { reference: "chs-nope", high_water_lag_minutes: 1, low_water_lag_minutes: 2 } },
        },
      ]),
    ).toThrow(/chs-nope/);
  });

  it("the real database yields Malibu Rapids off Point Atkinson", () => {
    expect(derivedGates()).toEqual([
      expect.objectContaining({ key: "chs-malibu-rapids", referenceKey: "chs-point-atkinson", referenceName: "Point Atkinson" }),
    ]);
  });
});
