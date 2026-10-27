/**
 * Dev-only timing for server data loads. Production builds compile the calls
 * away to nothing, so this never ships work to users.
 */
export function startDataTimer(): number | null {
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  return performance.now();
}

export function logDataLoad(route: string, startedAt: number | null) {
  if (startedAt === null) {
    return;
  }

  console.debug(
    `[perf] data ${route} ${(performance.now() - startedAt).toFixed(0)}ms`
  );
}
