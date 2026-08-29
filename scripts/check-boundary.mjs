#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const allowedPackageFile = (path) =>
  path === "LICENSE" || path === "README.md" || path === "package.json" || /^dist\/.+\.(?:js|d\.ts)$/.test(path);

function containsBundle(value) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(containsBundle);
  if (Array.isArray(value.stations) && ("generated" in value || value.stations.some((station) => station && "constituents" in station))) {
    return true;
  }
  return Object.values(value).some(containsBundle);
}

function checkFile(file) {
  if (/\b[0-9a-f]{24}\b/i.test(file.contents)) {
    throw new Error(`provider-minted station identifier: ${file.path}`);
  }
  if (!file.path.endsWith(".json")) return;
  try {
    if (containsBundle(JSON.parse(file.contents))) throw new Error(`generated CHS bundle: ${file.path}`);
  } catch (error) {
    if (error instanceof SyntaxError) return;
    throw error;
  }
}

export function checkBoundary(trackedFiles, packageFiles) {
  for (const file of [...trackedFiles, ...packageFiles]) checkFile(file);

  const unexpected = packageFiles.find((file) => !allowedPackageFile(file.path));
  if (unexpected) throw new Error(`unexpected npm package entry: ${unexpected.path}`);
}

function main() {
  const paths = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0").filter((path) => path && existsSync(path));
  const trackedFiles = paths.map((path) => ({ path, contents: readFileSync(path, "utf8") }));
  const pack = JSON.parse(execFileSync(
    "npm",
    ["pack", "--dry-run", "--json", "--cache", join(tmpdir(), "chs-constituents-npm-cache")],
    { encoding: "utf8" },
  ));
  const packageFiles = pack[0].files.map((file) => ({ path: file.path, contents: readFileSync(file.path, "utf8") }));
  checkBoundary(trackedFiles, packageFiles);
  console.log(`package boundary ok: ${paths.length} tracked files, ${pack[0].entryCount} packed files`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
