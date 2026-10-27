/**
 * Where each page was left. Module memory only: a refresh starts clean, and a
 * push navigation always opens at the top. Used to restore back and forward.
 */
const positions = new Map<string, number>();

export function rememberPageScroll(pathname: string, scroll: number) {
  positions.set(pathname, Math.max(0, Math.round(scroll)));
}

export function pageScroll(pathname: string) {
  return positions.get(pathname) ?? 0;
}

export function forgetPageScroll(pathname: string) {
  positions.delete(pathname);
}
