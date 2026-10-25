export const LIST_KINDS = ["food", "movies", "places", "general"] as const;
export type ListKind = (typeof LIST_KINDS)[number];

export const LIST_KIND_LABELS: Record<ListKind, string> = {
  food: "Food",
  movies: "Movies",
  places: "Places",
  general: "General",
};

export const LIST_TITLE_MAX = 60;
export const ITEM_TITLE_MAX = 120;
export const ITEM_NOTE_MAX = 280;

export function isListKind(value: string): value is ListKind {
  return (LIST_KINDS as readonly string[]).includes(value);
}

export function cleanLink(value: string | null | undefined) {
  const raw = String(value ?? "").trim();

  if (!raw) {
    return null;
  }

  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  try {
    const url = new URL(withScheme);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export type ListRecord = {
  id: string;
  title: string;
  kind: ListKind;
  created_by: string;
};

export type ListItemRecord = {
  id: string;
  list_id: string;
  title: string;
  note: string | null;
  url: string | null;
  added_by: string;
  done: boolean;
  done_at: string | null;
  done_by: string | null;
  event_idea_id: string | null;
  created_at: string;
};
