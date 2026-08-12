#!/usr/bin/env node
import { parseArgs } from "node:util";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { buildBundle } from "./build.js";

export async function main(argv = process.argv.slice(2)): Promise<number> {
  const { values } = parseArgs({
    args: argv,
    options: {
      help: { type: "boolean", default: false },
      stations: { type: "string" },
      output: { type: "string", default: "currents.json" },
      "training-days": { type: "string", default: "210" },
      "training-start": { type: "string", default: "2025-07-01" },
      "validate-from": { type: "string" },
      "validate-days": { type: "string", default: "7" },
      "cache-dir": { type: "string", default: ".cache" },
      "request-interval": { type: "string", default: "2.5" },
      "user-agent": { type: "string" },
      only: { type: "string", multiple: true, default: [] },
    },
  });

  if (values.help) {
    console.log(
      `chs-constituents — fit tidal-current constituents from CHS IWLS predictions.

You must run this yourself; the output cannot be redistributed. See README.md.

  --stations <path>       JSON list of {id, label} to fit instead of the live
                          IWLS index (default: every live CHS current station,
                          names improved via @sailingnaturali/station-corrections)
  --output <path>         Bundle path (default: currents.json)
  --training-days <n>     Series length (default: 210 — see Rayleigh note in pipeline.ts)
  --training-start <date> UTC start, YYYY-MM-DD (default: 2025-07-01)
  --validate-from <date>  UTC date to begin out-of-sample validation
  --validate-days <n>     Validation window (default: 7)
  --cache-dir <path>      Where to cache fetched chunks (default: .cache)
  --request-interval <s>  Seconds between requests (default: 2.5)
  --user-agent <string>   User-Agent header (default: chs-constituents/1.0;
                          CHS sometimes refuses non-browser UAs — see README)
  --only <text>           Only stations whose label contains this (repeatable)`,
    );
    return 0;
  }

  let bundle: Record<string, unknown>;
  try {
    bundle = await buildBundle({
      stationsFile: values.stations,
      only: values.only.map((w) => w.toLowerCase()),
      trainingDays: Number(values["training-days"]),
      trainingStart: values["training-start"],
      validateFrom: values["validate-from"],
      validateDays: Number(values["validate-days"]),
      cacheDir: values["cache-dir"],
      requestIntervalMs: Number(values["request-interval"]) * 1000,
      userAgent: values["user-agent"],
      onProgress: (message) => console.error(message),
    });
  } catch (e) {
    const msg = (e as Error).message;
    console.error(
      msg === "No stations were fitted"
        ? "No stations were fitted — leaving the existing output untouched"
        : msg,
    );
    return 1;
  }

  await writeFile(values.output, JSON.stringify(bundle, null, 2));
  console.error(`\nwrote ${values.output} — ${(bundle.stations as unknown[]).length} stations`);
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().then(
    (code) => process.exit(code),
    (error) => {
      // parseArgs throws here on an unknown or malformed flag.
      console.error((error as Error).message);
      process.exit(1);
    },
  );
}
