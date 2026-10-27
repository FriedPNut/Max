#!/usr/bin/env node
/**
 * Fails when a server page, layout, or loading file reads the clock directly.
 * Those files must get the time from `serverNow()` (src/lib/server-now.ts),
 * which awaits `connection()` first so the clock is never baked into prerendered
 * HTML. Client components are exempt: display-only time logic goes there.
 * Route handlers are exempt too: they only ever run per request.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = path.resolve("src/app");
const CLOCK_READ = /Date\.now\(\)|new Date\(\)/;
const SERVER_FILE = /(^|[\\/])(page|layout|loading|default)\.tsx?$/;

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else files.push(full);
  }
  return files;
}

const offenders = [];
for (const file of await walk(ROOT)) {
  if (!SERVER_FILE.test(file)) continue;
  const source = await readFile(file, "utf8");
  if (/^\s*["']use client["']/m.test(source.slice(0, 200))) continue;
  source.split("\n").forEach((line, index) => {
    if (CLOCK_READ.test(line)) {
      offenders.push(`${path.relative(process.cwd(), file)}:${index + 1}: ${line.trim()}`);
    }
  });
}

if (offenders.length > 0) {
  console.error("check:clock failed. Read the time with serverNow() instead:");
  for (const offender of offenders) console.error(`  ${offender}`);
  process.exit(1);
}

console.log("check:clock passed: no direct clock reads in server pages or layouts.");
