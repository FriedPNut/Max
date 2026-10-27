"use client";

/**
 * One shared scroll lock for every overlay. Locks are counted, so two open
 * sheets never unlock each other, and the page is always released once the last
 * one closes — including after a route change, where the lock is reset outright.
 *
 * The shell scrolls inside `main`, so hiding the body alone would leave the
 * page behind moving.
 */

type LockState = {
  body: string;
  main: HTMLElement | null;
  mainOverflow: string;
};

let count = 0;
let state: LockState | null = null;

function restore() {
  if (!state) {
    return;
  }

  document.body.style.overflow = state.body;

  if (state.main) {
    state.main.style.overflow = state.mainOverflow;
  }

  state = null;
}

export function lockPageScroll() {
  if (typeof document === "undefined") {
    return () => {};
  }

  if (count === 0) {
    const main = document.querySelector<HTMLElement>("main");
    state = {
      body: document.body.style.overflow,
      main,
      mainOverflow: main?.style.overflow ?? "",
    };
    document.body.style.overflow = "hidden";

    if (main) {
      main.style.overflow = "hidden";
    }
  }

  count += 1;
  let released = false;

  return () => {
    if (released) {
      return;
    }

    released = true;
    count = Math.max(0, count - 1);

    if (count === 0) {
      restore();
    }
  };
}

/** Route changes drop every lock, so a page can never stay unscrollable. */
export function resetPageScrollLock() {
  count = 0;
  restore();
}
