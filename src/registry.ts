import { allStations } from "@slackwater/database";
import type { StationRef } from "./pipeline.js";
import type { IwlsStation } from "./client.js";

/**
 * The database as a name/metadata overlay, not the station id source.
 *
 * Station ids come live from the IWLS index (`IwlsClient.stations`); the
 * unified database supplies only the stable public id and the curated display
 * name, matched to a live station by normalized name. No provider-minted
 * identifier is read here — the database carries none for these records, and
 * nothing in this repo may depend on one.
 *
 * No CHS-derived data is involved: these are identifiers and hand-written
 * names, not predictions or constituents.
 */

/** The `source.name` the database gives every curated CHS record. */
export const CHS_SOURCE = "Canadian Hydrographic Service";

/** The slice of a database station this repo reads. */
export interface GateStation {
  id: string;
  name: string;
  kind: "tide" | "current";
  source?: { name?: string };
  current?: {
    derived?: { reference: string; high_water_lag_minutes: number; low_water_lag_minutes: number };
  };
}

/** Every curated CHS record — current gates, derived gates and tide reference ports. */
export function chsStations(stations: Iterable<GateStation> = allStations): GateStation[] {
  return [...stations].filter((s) => s.source?.name === CHS_SOURCE);
}

/** Fold case, punctuation and spacing so "DODD NARROWS" matches "Dodd Narrows". */
export function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export interface OverlayEntry {
  key: string;
  label: string;
}

/**
 * Build a `normalizedName -> {key, label}` overlay of the CHS current gates
 * that have a live IWLS station to match. Reads only `id` and `name`; an empty
 * id or name is refused at the source rather than silently detaching a gate
 * from its live station.
 *
 * Tide reference ports (`kind: "tide"`) are not gates. A derived gate is
 * derived precisely because CHS publishes no current station for it, so it can
 * never match a live station; carrying it here made every build warn that
 * Malibu had drifted from a station it never had.
 */
export function registryOverlay(
  stations: Iterable<GateStation> = allStations,
): Map<string, OverlayEntry> {
  const overlay = new Map<string, OverlayEntry>();
  for (const { id, name, kind, current } of chsStations(stations)) {
    if (kind !== "current" || current?.derived) continue;
    if (!id?.trim() || !name?.trim()) {
      throw new Error(`database station ${JSON.stringify(id)} has an empty id or name`);
    }
    overlay.set(normalizeName(name), { key: id, label: name });
  }
  return overlay;
}

/**
 * Resolve live IWLS current stations to StationRefs. The id is the live IWLS
 * handle (used only to fetch, never emitted); a name match in the overlay
 * upgrades the label to the curated name and supplies the stable key. An
 * unmatched station keeps its official name and no key, so `fitStation`
 * derives a slug from the label.
 */
export function stationsFromApi(
  stations: IwlsStation[],
  overlay: Map<string, OverlayEntry>,
): StationRef[] {
  return stations.map((s) => {
    const hit = overlay.get(normalizeName(s.officialName));
    return hit ? { id: s.id, label: hit.label, key: hit.key } : { id: s.id, label: s.officialName };
  });
}
