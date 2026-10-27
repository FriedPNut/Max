"use client";

import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";

export type ShellProfile = {
  userId: string;
  name: string;
  initial: string;
  avatarUrl: string | null;
};

type ShellHeader = {
  pathname: string;
  actions: ReactNode | null;
};

// The shell is mounted once, above the pages, so the two things pages can still
// contribute to it (who I am, and the root header's action icons) live here.
let profile: ShellProfile | null = null;
let header: ShellHeader = { pathname: "", actions: null };
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getProfile() {
  return profile;
}

function getServerProfile() {
  return null;
}

/** The signed-in person, for the tab bar avatar and the unread heart. */
export function useShellProfile(): ShellProfile | null {
  return useSyncExternalStore(subscribe, getProfile, getServerProfile);
}

function getActionsSnapshot() {
  return header;
}

function getServerActions() {
  return header;
}

/**
 * The page's action icons for the root header. Keyed by pathname so an action
 * from the page you just left never shows on the page you just opened.
 */
export function useShellActions(pathname: string): ReactNode | null {
  const snapshot = useSyncExternalStore(
    subscribe,
    getActionsSnapshot,
    getServerActions
  );

  return snapshot.pathname === pathname ? snapshot.actions : null;
}

/** Publishes the signed-in person from a page's server render. */
export function ShellProfileSync({ next }: { next: ShellProfile }) {
  const { userId, name, initial, avatarUrl } = next;

  useEffect(() => {
    profile = { userId, name, initial, avatarUrl };
    emit();
  }, [avatarUrl, initial, name, userId]);

  return null;
}

/** Lets a tab root hand its action icons to the header in the shell. */
export function ShellActionsSync({ actions }: { actions: ReactNode | null }) {
  const pathname = usePathname();

  useEffect(() => {
    header = { pathname, actions };
    emit();
  }, [actions, pathname]);

  return null;
}
