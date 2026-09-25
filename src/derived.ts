import { allStations } from "@slackwater/database";
import { chsStations, type GateStation } from "./registry.js";

/**
 * Derived gates: passes with NO current station of their own. Slack is a
 * reference tide port's high/low water shifted by a fixed lag. The database
 * carries the whole spec under `current.derived`; this reads it out and
 * resolves the reference port's display name so the build can fit that tide
 * offline.
 *
 * No CHS-derived data here — just identifiers and lags from the unified database.
 */
export interface DerivedGateSpec {
  key: string;
  name: string;
  referenceKey: string;
  referenceName: string;
  hwLagMinutes: number;
  lwLagMinutes: number;
}

/**
 * The bundle record for a derived gate: no constituents and no speed — a
 * consumer predicts the referenced tide port and derives slack from its HW/LW.
 * `tide-derived` (not `chs-derived`) marks that this record itself holds no CHS
 * data, only a pointer and the lags.
 */
export interface DerivedSlackRecord {
  id: string;
  name: string;
  type: "derived-slack";
  source: "tide-derived";
  reference: string;
  hwLagMinutes: number;
  lwLagMinutes: number;
}

export function derivedSlackRecord(spec: DerivedGateSpec): DerivedSlackRecord {
  return {
    id: spec.key,
    name: spec.name,
    type: "derived-slack",
    source: "tide-derived",
    reference: spec.referenceKey,
    hwLagMinutes: spec.hwLagMinutes,
    lwLagMinutes: spec.lwLagMinutes,
  };
}

export function derivedGates(stations: Iterable<GateStation> = allStations): DerivedGateSpec[] {
  const chs = chsStations(stations);
  const byId = new Map(chs.map((s) => [s.id, s]));
  const gates: DerivedGateSpec[] = [];
  for (const { id, name, current } of chs) {
    const derived = current?.derived;
    if (!derived) continue;
    const ref = byId.get(derived.reference);
    if (!ref) {
      throw new Error(
        `derived gate ${id} references ${derived.reference}, which is not a CHS record in the database`,
      );
    }
    gates.push({
      key: id,
      name,
      referenceKey: derived.reference,
      referenceName: ref.name,
      hwLagMinutes: derived.high_water_lag_minutes,
      lwLagMinutes: derived.low_water_lag_minutes,
    });
  }
  return gates;
}
