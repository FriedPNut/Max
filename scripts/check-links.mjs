#!/usr/bin/env node
/**
 * Fails the build when a literal internal link points at a page that does not
 * exist under src/app. Template paths such as `/u/${username}` are treated as
 * one dynamic segment, so they match `/u/[username]`.
 *
 * Anything the scanner cannot resolve should be added to IGNORE below.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

// Exact targets (already normalized) that are not app pages.
const IGNORE = new Set([
  "/sw.js",
  "/manifest.webmanifest",
]);

const ROUTE_FILES = new Set(["page.tsx", "route.ts", "page.js", "route.js"]);

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const full = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await walk(full)));
    } else {
      files.push(full);
    }
  }

  return files;
}

function routeForFile(root, file) {
  const relative = path.relative(root, file).split(path.sep);
  const directory = relative.slice(0, -1);

  if (relative.at(-1) !== "page.tsx" && relative.at(-1) !== "page.js") {
    // Route handlers still exist, so links to them are valid.
    if (!ROUTE_FILES.has(relative.at(-1))) return null;
  }

  const segments = directory.filter(
    (segment) => !segment.startsWith("_") && !/^\(.*\)$/.test(segment)
  );

  return `/${segments.join("/")}`.replace(/\/$/, "") || "/";
}

function segmentsOf(value) {
  return value.split("/").filter(Boolean);
}

function normalizeTarget(raw) {
  let value = raw.trim();

  if (!value.startsWith("/") || value.startsWith("//")) return null;

  value = value.split("#")[0];
  if (!value) return null;

  value = value.split("?")[0] || "/";
  value = value.replace(/\$\{[^}]*\}/g, "__DYNAMIC__");
  value = value.length > 1 ? value.replace(/\/+$/, "") || "/" : value;

  return value;
}

function matches(route, target) {
  const routeSegments = segmentsOf(route);
  const targetSegments = segmentsOf(target);

  if (routeSegments.length !== targetSegments.length) return false;

  return routeSegments.every((segment, index) => {
    const targetSegment = targetSegments[index];

    if (segment.startsWith("[") && segment.endsWith("]")) {
      return targetSegment.length > 0;
    }

    if (targetSegment === "__DYNAMIC__") {
      return true;
    }

    return segment === targetSegment;
  });
}

const TARGET_PATTERNS = [
  // href="/path", href='/path', href={"/path"}, href={`/path`}
  /href\s*=\s*(?:"([^"]*)"|'([^']*)'|\{\s*"([^"]*)"\s*\}|\{\s*'([^']*)'\s*\}|\{\s*`([^`]*)`\s*\})/g,
  // router.push("/path"), router.replace(`/path`)
  /(?:router\.(?:push|replace)|permanentRedirect|redirect)\(\s*(?:"([^"]*)"|'([^']*)'|`([^`]*)`)\s*[,)]/g,
];

function scanSource(source) {
  const targets = [];

  for (const pattern of TARGET_PATTERNS) {
    pattern.lastIndex = 0;

    for (const match of source.matchAll(pattern)) {
      const raw = match.slice(1).find((value) => value !== undefined);
      if (!raw) continue;

      const line = source.slice(0, match.index).split("\n").length;
      targets.push({ raw, line });
    }
  }

  return targets;
}

const appRoot = path.join(process.cwd(), "src", "app");
const sourceRoot = path.join(process.cwd(), "src");
const appFiles = await walk(appRoot);
const routes = appFiles.map((file) => routeForFile(appRoot, file)).filter(Boolean);
const sourceFiles = (await walk(sourceRoot)).filter((file) =>
  /\.(?:tsx?|jsx?)$/.test(file)
);

const problems = [];

for (const file of sourceFiles) {
  const source = await readFile(file, "utf8");

  for (const { raw, line } of scanSource(source)) {
    const target = normalizeTarget(raw);

    if (!target || IGNORE.has(target)) continue;

    if (!routes.some((route) => matches(route, target))) {
      problems.push(
        `${path.relative(process.cwd(), file)}:${line}  ${raw}  (${target})`
      );
    }
  }
}

if (problems.length > 0) {
  console.error(`\ncheck:links found ${problems.length} dead internal link(s):\n`);
  for (const problem of problems) console.error(`  ${problem}`);
  console.error("\nAdd real routes under src/app, fix the targets, or extend IGNORE.\n");
  process.exit(1);
}

console.log(`check:links passed (${routes.length} routes).`);
