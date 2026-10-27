/** Derive the 400px thumbnail from the full photo path; no DB column needed. */
export function photoThumbPath(path: string) {
  const clean = path.trim();

  if (!clean) return clean;

  const slash = clean.lastIndexOf("/");
  const dot = clean.lastIndexOf(".");
  const end = dot > slash ? dot : clean.length;

  return `${clean.slice(0, end)}_t.jpg`;
}
