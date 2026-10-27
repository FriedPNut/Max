#!/usr/bin/env node
/**
 * Prints JS sizes per route from the Turbopack analyzer snapshot.
 *
 * - initial KB: the scripts the browser runs before first paint, read from the
 *   built HTML (<script src="/_next/static/...">). This is what a tap waits on.
 * - total KB: every client chunk reachable from the route, including the ones
 *   that only load when a sheet or viewer opens.
 *
 * Run `npm run build` then `npx next analyze --output` first.
 */
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const analyze = path.join(
  root,
  ".next",
  "diagnostics",
  "analyze",
  "data",
  "route-summaries.json"
);

let rows;

try {
  rows = JSON.parse(await readFile(analyze, "utf8"));
} catch {
  console.error("No analyzer output. Run: npx next analyze --output");
  process.exit(1);
}

const htmlDir = path.join(root, ".next", "server", "app");
const chunkDir = path.join(root, ".next", "static", "chunks");

async function fileSize(file) {
  try {
    const info = await stat(file);
    return info.size;
  } catch {
    return 0;
  }
}

/** Sum of the unique entry scripts the built HTML loads. */
async function initialBytes(route) {
  const file = path.join(
    htmlDir,
    `${route === "/" ? "index" : route.replace(/^\//, "")}.html`
  );

  let html;

  try {
    html = await readFile(file, "utf8");
  } catch {
    return null;
  }

  const sources = new Set(
    [...html.matchAll(/src="\/_next\/static\/chunks\/([^"]+)"/g)].map(
      (match) => match[1]
    )
  );

  if (sources.size === 0) {
    return null;
  }

  let total = 0;

  for (const name of sources) {
    total += await fileSize(path.join(chunkDir, name));
  }

  return total;
}

const sized = [];

for (const row of rows) {
  if (!(row.client?.size > 0)) {
    continue;
  }

  sized.push({
    route: row.route,
    initial: await initialBytes(row.route),
    total: row.client.size,
    gzip: row.client.compressed_size,
  });
}

sized.sort((a, b) => (b.initial ?? 0) - (a.initial ?? 0));

console.table(
  sized.map((row) => ({
    route: row.route,
    "initial KB": row.initial === null ? "—" : Math.round(row.initial / 1024),
    "total KB": Math.round(row.total / 1024),
    "gzip KB": Math.round(row.gzip / 1024),
  }))
);

const measured = sized.filter((row) => row.initial !== null);

if (measured.length > 0) {
  const average =
    measured.reduce((sum, row) => sum + (row.initial ?? 0), 0) /
    measured.length / 1024;

  console.log(
    `\nAverage initial JS: ${Math.round(average)} KB across ${measured.length} pages`
  );
  console.log(
    `Heaviest: ${measured[0].route} (${Math.round((measured[0].initial ?? 0) / 1024)} KB)`
  );
}
