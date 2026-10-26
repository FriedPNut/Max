"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { StoryViewer } from "@/components/posts/story-viewer";
import type { StoryGroup, StoryViewer as StoryViewerProfile } from "@/lib/stories";

function seenStorageKey(viewerId: string, groupId: string) {
  return `max-stories-seen:v1:${viewerId}:${groupId}`;
}

function readSeen(viewerId: string, groupId: string) {
  try {
    const raw = window.localStorage.getItem(seenStorageKey(viewerId, groupId));

    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function StoryAvatar({
  src,
  initial,
  name,
}: {
  src: string | null;
  initial: string;
  name: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <span
        aria-hidden="true"
        className="flex h-16 w-16 select-none items-center justify-center rounded-full bg-surface-2 text-lg font-semibold text-text"
      >
        {initial}
      </span>
    );
  }

  return (
    <img
      draggable={false}
      src={src}
      alt={`${name}'s story`}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className="h-16 w-16 rounded-full bg-surface-2 object-cover"
    />
  );
}

function StoryRing({
  group,
  unseen,
}: {
  group: StoryGroup;
  unseen: boolean;
}) {
  return (
    <span
      className={`block rounded-full p-[3px] ${
        unseen ? "story-ring-unseen" : "story-ring-seen"
      }`}
    >
      <span className="block rounded-full bg-background p-[2px]">
        <StoryAvatar
          src={group.avatarUrl}
          initial={group.initial}
          name={group.name}
        />
      </span>
    </span>
  );
}

export function StoriesRow({
  groups,
  viewer,
}: {
  groups: StoryGroup[];
  viewer: StoryViewerProfile;
}) {
  const [seenByGroup, setSeenByGroup] = useState<Record<string, string[]>>({});
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);
  const groupsKey = groups.map((group) => group.id).join("|");

  useEffect(() => {
    const next: Record<string, string[]> = {};

    for (const group of groups) {
      next[group.id] = readSeen(viewer.id, group.id);
    }

    setSeenByGroup(next);
  }, [groups, groupsKey, viewer.id]);

  const closeViewer = useCallback(() => setOpenGroupId(null), []);

  const markSeen = useCallback(
    (groupId: string, storyId: string) => {
      setSeenByGroup((current) => {
        const seen = current[groupId] ?? [];

        if (seen.includes(storyId)) {
          return current;
        }

        const nextSeen = [...seen, storyId];

        try {
          window.localStorage.setItem(
            seenStorageKey(viewer.id, groupId),
            JSON.stringify(nextSeen)
          );
        } catch {
          // Private mode can refuse storage; the ring still updates this visit.
        }

        return { ...current, [groupId]: nextSeen };
      });
    },
    [viewer.id]
  );

  const ownGroup = groups.find((group) => group.isMine) ?? null;
  const otherGroups = groups.filter((group) => !group.isMine);
  const openGroup = groups.find((group) => group.id === openGroupId) ?? null;
  const openIndex = openGroup
    ? groups.findIndex((group) => group.id === openGroup.id)
    : -1;

  function hasUnseen(group: StoryGroup) {
    const seen = seenByGroup[group.id] ?? [];
    return group.stories.some((story) => !seen.includes(story.id));
  }

  return (
    <section aria-label="Stories">
      <div
        data-no-swipe
        className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="relative w-[74px] shrink-0">
          {ownGroup ? (
            <button
              type="button"
              onClick={() => setOpenGroupId(ownGroup.id)}
              aria-label={`Your story, ${hasUnseen(ownGroup) ? "unseen" : "seen"}`}
              className="block rounded-full"
            >
              <StoryRing group={ownGroup} unseen={hasUnseen(ownGroup)} />
            </button>
          ) : (
            <Link
              href="/feed/new"
              aria-label="Add to your story"
              className="block rounded-full"
            >
              <span className="block rounded-full p-[3px] story-ring-seen">
                <span className="block rounded-full bg-background p-[2px]">
                  <StoryAvatar
                    src={viewer.avatarUrl}
                    initial={viewer.initial}
                    name={viewer.name}
                  />
                </span>
              </span>
            </Link>
          )}

          <Link
            href="/feed/new"
            aria-label="Add to your story"
            className="absolute right-0 top-[30px] z-10 flex h-11 w-11 items-end justify-end"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-on-primary shadow-control">
              <Plus size={14} strokeWidth={2.5} aria-hidden="true" />
            </span>
          </Link>

          <p className="mt-1.5 w-[74px] truncate text-center text-xs font-semibold text-text">
            Your story
          </p>
        </div>

        {otherGroups.map((group) => (
          <button
            key={group.id}
            type="button"
            onClick={() => setOpenGroupId(group.id)}
            aria-label={`${group.name}'s story, ${
              hasUnseen(group) ? "unseen" : "seen"
            }`}
            className="w-[74px] shrink-0 text-center"
          >
            <StoryRing group={group} unseen={hasUnseen(group)} />
            <span className="mt-1.5 block w-[74px] truncate text-center text-xs font-semibold text-text">
              {group.name}
            </span>
          </button>
        ))}
      </div>

      {openGroup && openIndex >= 0 && (
        <StoryViewer
          key={openGroup.id}
          groups={groups}
          initialGroupIndex={openIndex}
          onStorySeen={markSeen}
          onClose={closeViewer}
        />
      )}
    </section>
  );
}
