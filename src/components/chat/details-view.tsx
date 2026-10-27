"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronRight,
  MoreHorizontal,
  Search,
  X,
} from "lucide-react";
import { Avatar, Button, Input, Sheet, Switch, Toast } from "@/components/ui";
import { buttonStyles } from "@/components/ui/button";
import { ChatColorPicker } from "@/components/chat/chat-color-picker";
import {
  addPeopleAction,
  deleteChatForMeAction,
  leaveConversationChatAction,
  openConversationWithMemberAction,
  removeConversationMemberAction,
  renameConversationGroupAction,
  setConversationMutedAction,
  setConversationNicknameAction,
  setConversationPhotoAction,
} from "@/app/actions/chat-details";
import {
  GROUP_NAME_MAX_LENGTH,
  NICKNAME_MAX_LENGTH,
  addedNamesToast,
  memberSubtitle,
} from "@/lib/chat-details";
import { useChatColor } from "@/lib/use-chat-color";
import {
  MAX_UPLOAD_BYTES,
  resizeImageSquare,
  uploadPhotoWithThumbnail,
} from "@/lib/client-image";
import { PHOTO_BUCKET } from "@/lib/photo-urls";
import { createClient } from "@/lib/supabase/client";

export type DetailsMember = {
  id: string;
  name: string;
  fullName: string;
  username: string | null;
  initial: string;
  avatarUrl: string | null;
  nickname: string | null;
  isCreator: boolean;
  isMe: boolean;
};

export type DetailsFriend = {
  id: string;
  name: string;
  username: string | null;
  initial: string;
  avatarUrl: string | null;
};

type SheetName =
  | "name"
  | "color"
  | "pins"
  | "add"
  | "nicknames"
  | "member"
  | "leave"
  | "delete"
  | null;

const LEAVE_NOTE =
  "You won't be able to send or receive messages unless someone adds you back to the chat. No one will be notified that you left the chat.";

const DELETE_NOTE =
  "This removes the chat from your list and clears your history. It stays for everyone else.";

function Row({
  label,
  trailing,
  onClick,
}: {
  label: string;
  trailing?: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex min-h-11 w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors duration-200 ease-out hover:bg-surface-2"
      >
        <span className="text-[15px] text-text">{label}</span>
        <span className="flex shrink-0 items-center gap-2">
          {trailing}
          <ChevronRight
            size={18}
            strokeWidth={1.75}
            aria-hidden="true"
            className="text-muted"
          />
        </span>
      </button>
    </li>
  );
}

function SheetHeading({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="pb-1">
      <h2 className="text-[20px] font-bold text-text">{title}</h2>
      {description ? (
        <p className="mt-1 text-[13px] text-muted">{description}</p>
      ) : null}
    </div>
  );
}

export function ChatDetailsView({
  conversationId,
  isGroup,
  isCreator,
  title,
  photoUrl,
  muted,
  bubbleColor,
  pinnedMessages,
  members: initialMembers,
  friends: initialFriends,
  dmUsername,
  loadError,
  currentUserId,
}: {
  conversationId: string;
  isGroup: boolean;
  isCreator: boolean;
  title: string;
  photoUrl: string | null;
  muted: boolean;
  bubbleColor: string | null;
  pinnedMessages: { id: string; body: string | null }[];
  members: DetailsMember[];
  friends: DetailsFriend[];
  dmUsername: string | null;
  loadError: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [name, setName] = useState(title);
  const [photo, setPhoto] = useState(photoUrl);
  const [members, setMembers] = useState(initialMembers);
  const [friends, setFriends] = useState(initialFriends);
  const [isMuted, setIsMuted] = useState(muted);
  const [sheet, setSheet] = useState<SheetName>(null);
  const [activeMemberId, setActiveMemberId] = useState<string | null>(null);
  const [nicknameFocus, setNicknameFocus] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [nameDraft, setNameDraft] = useState(title);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [leaveCreatorNotice, setLeaveCreatorNotice] = useState(false);
  const localPhoto = useRef<string | null>(null);

  const { color, choose, error: colorError, reset } = useChatColor(bubbleColor);

  // A refreshed server photo wins over the local preview.
  useEffect(() => {
    setPhoto(photoUrl);

    if (localPhoto.current) {
      URL.revokeObjectURL(localPhoto.current);
      localPhoto.current = null;
    }
  }, [photoUrl]);

  const activeMember = members.find((member) => member.id === activeMemberId) ?? null;
  const initial = name.trim().charAt(0).toUpperCase() || "G";

  function closeSheet() {
    setSheet(null);
    setActiveMemberId(null);
    setConfirmRemove(false);
    setLeaveCreatorNotice(false);
    setNicknameFocus(null);
    setError(null);
  }

  async function changeName() {
    const clean = nameDraft.trim();

    if (!clean || busy) {
      return;
    }

    setBusy(true);
    setError(null);
    const previous = name;
    setName(clean);
    const result = await renameConversationGroupAction(conversationId, clean);
    setBusy(false);

    if (result.error) {
      setName(previous);
      setError(result.error);
      return;
    }

    setToast("Group name changed");
    closeSheet();
    router.refresh();
  }

  async function toggleMute() {
    const next = !isMuted;
    setIsMuted(next);
    setError(null);
    const result = await setConversationMutedAction(conversationId, next);

    if (result.error) {
      setIsMuted(!next);
      setError(result.error);
    }
  }

  async function pickPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || uploading) {
      return;
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      setError("That photo is too big. Pick one under 30MB.");
      return;
    }

    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      const square = await resizeImageSquare(file, 1600, 0.85);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setError("You're signed out. Refresh and try again.");
        return;
      }

      const path = `conversations/${currentUserId}/${Date.now()}.jpg`;

      await uploadPhotoWithThumbnail({
        file: square,
        bucket: PHOTO_BUCKET,
        path,
        token: session.access_token,
        onProgress: setProgress,
      });

      const result = await setConversationPhotoAction(conversationId, path);

      if (result.error) {
        setError(result.error);
        return;
      }

      const preview = URL.createObjectURL(square);
      localPhoto.current = preview;
      setPhoto(preview);
      setToast("Photo updated");
      router.refresh();
    } catch {
      setError("Couldn't upload that photo. Try again.");
    } finally {
      setUploading(false);
    }
  }

  async function saveNickname(member: DetailsMember, value: string) {
    const clean = value.trim().slice(0, NICKNAME_MAX_LENGTH);
    const previous = members;
    setMembers((current) =>
      current.map((item) =>
        item.id === member.id
          ? {
              ...item,
              nickname: clean || null,
              name: clean || item.fullName,
              initial: (clean || item.fullName).charAt(0).toUpperCase() || "?",
            }
          : item
      )
    );

    const result = await setConversationNicknameAction(
      conversationId,
      member.id,
      clean
    );

    if (result.error) {
      setMembers(previous);
      setError(result.error);
    }
  }

  async function removeMember(member: DetailsMember) {
    if (busy) {
      return;
    }

    setBusy(true);
    setError(null);
    const previous = members;
    setMembers((current) => current.filter((item) => item.id !== member.id));
    const result = await removeConversationMemberAction(
      conversationId,
      member.id
    );
    setBusy(false);

    if (result.error) {
      setMembers(previous);
      setError(result.error);
      return;
    }

    setConfirmRemove(false);
    closeSheet();
    setToast(`${member.name} removed`);
    router.refresh();
  }

  async function messageMember(member: DetailsMember) {
    setBusy(true);
    const result = await openConversationWithMemberAction(member.id);
    setBusy(false);

    if (result.error || !result.conversationId) {
      setError(result.error ?? "Couldn't open that chat. Try again.");
      return;
    }

    router.push(`/chat/${result.conversationId}`);
  }

  async function addPeople(ids: string[], groupName: string) {
    if (busy || ids.length === 0) {
      return;
    }

    setBusy(true);
    setError(null);
    const added = friends.filter((friend) => ids.includes(friend.id));
    const previousMembers = members;

    if (isGroup) {
      setMembers((current) => [
        ...current,
        ...added.map((friend) => ({
          id: friend.id,
          name: friend.name,
          fullName: friend.name,
          username: friend.username,
          initial: friend.initial,
          avatarUrl: friend.avatarUrl,
          nickname: null,
          isCreator: false,
          isMe: false,
        })),
      ]);
    }

    setFriends((current) => current.filter((friend) => !ids.includes(friend.id)));

    const result = await addPeopleAction({
      conversationId,
      userIds: ids,
      groupName,
    });
    setBusy(false);

    if (result.error) {
      // Keep the sheet open so the error sits next to the Add button.
      setMembers(previousMembers);
      setFriends(initialFriends);
      setError(result.error);
      return;
    }

    closeSheet();
    setToast(addedNamesToast(added.map((friend) => friend.name)));

    if (!isGroup && result.conversationId) {
      const target = `/chat/${result.conversationId}`;
      window.setTimeout(() => router.push(target), 700);
      return;
    }

    router.refresh();
  }

  async function leaveChat() {
    if (busy) {
      return;
    }

    setBusy(true);
    setError(null);
    const result = await leaveConversationChatAction(conversationId);
    setBusy(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    router.push("/chat");
  }

  async function deleteForMe() {
    if (busy) {
      return;
    }

    setBusy(true);
    setError(null);
    const result = await deleteChatForMeAction(conversationId);
    setBusy(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    router.push("/chat");
  }

  const addPeopleSheet = (
    <AddPeopleSheet
      isGroup={isGroup}
      friends={friends}
      busy={busy}
      error={error}
      onClose={closeSheet}
      onAdd={addPeople}
    />
  );

  return (
    <section className="space-y-8">
      <div className="flex flex-col items-center gap-3 pt-1">
        <Avatar
          src={photo}
          initial={initial}
          name={name}
          size={96}
        />

        <h1 className="max-w-full break-words text-center text-[20px] font-bold leading-tight text-text">
          {name}
        </h1>

        {isGroup ? (
          <>
            <label
              className={`cursor-pointer text-[15px] font-semibold text-link ${
                uploading ? "opacity-60" : ""
              }`}
            >
              {uploading ? `Uploading ${progress}%` : "Change photo"}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={uploading}
                onChange={(event) => void pickPhoto(event)}
              />
            </label>
            {uploading ? (
              <span
                aria-hidden="true"
                className="h-1 w-24 overflow-hidden rounded-full bg-surface-2"
              >
                <span
                  className="block h-full rounded-full bg-primary transition-[width] duration-200"
                  style={{ width: `${progress}%` }}
                />
              </span>
            ) : null}
          </>
        ) : (
          <>
            {dmUsername ? (
              <p className="text-[13px] text-muted">@{dmUsername}</p>
            ) : null}
            {dmUsername ? (
              <Link
                href={`/u/${encodeURIComponent(dmUsername)}`}
                className={buttonStyles({ variant: "secondary", size: "sm" })}
              >
                View profile
              </Link>
            ) : null}
          </>
        )}
      </div>

      {loadError ? (
        <p role="alert" className="text-[13px] text-danger">
          Some of this didn&apos;t load. Refresh and try again.
        </p>
      ) : null}

      <ul className="divide-y divide-line overflow-hidden rounded-card bg-surface">
        {isGroup ? (
          <Row
            label="Change group name"
            trailing={
              <span className="text-[13px] font-semibold text-link">
                Change
              </span>
            }
            onClick={() => {
              setNameDraft(name);
              setSheet("name");
            }}
          />
        ) : null}

        <li className="px-4">
          <Switch
            checked={isMuted}
            onChange={() => void toggleMute()}
            label="Mute messages"
          >
            Mute messages
          </Switch>
        </li>

        <li>
          <Link
            href={`/chat/${conversationId}/search`}
            className="flex min-h-11 items-center justify-between gap-3 px-4 py-3 transition-colors duration-200 ease-out hover:bg-surface-2"
          >
            <span className="text-[15px] text-text">Search in conversation</span>
            <ChevronRight
              size={18}
              strokeWidth={1.75}
              aria-hidden="true"
              className="text-muted"
            />
          </Link>
        </li>

        <Row
          label="Chat color"
          trailing={
            <span
              aria-hidden="true"
              className="h-5 w-5 rounded-full ring-1 ring-line"
              style={{ backgroundColor: color }}
            />
          }
          onClick={() => setSheet("color")}
        />

        {pinnedMessages.length > 0 ? (
          <Row
            label={`Pinned messages (${pinnedMessages.length})`}
            onClick={() => setSheet("pins")}
          />
        ) : null}

        {!isGroup ? (
          <Row label="Add people" onClick={() => setSheet("add")} />
        ) : null}
      </ul>

      {isGroup ? (
        <section className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[16px] font-semibold text-text">Members</h2>
            <button
              type="button"
              onClick={() => setSheet("add")}
              className="min-h-11 text-[15px] font-semibold text-link"
            >
              Add people
            </button>
          </div>

          <p className="text-[13px] text-muted">
            {members.length} {members.length === 1 ? "member" : "members"}
          </p>

          <ul className="divide-y divide-line overflow-hidden rounded-card bg-surface">
            {members.map((member) => (
              <li
                key={member.id}
                className="flex min-h-14 items-center gap-3 px-3 py-2"
              >
                <Avatar
                  src={member.avatarUrl}
                  initial={member.initial}
                  name={member.name}
                  size={48}
                />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold text-text">
                    {member.name}
                    {member.isMe ? (
                      <span className="font-normal text-muted"> (you)</span>
                    ) : null}
                  </p>
                  <p className="truncate text-[13px] text-muted">
                    {memberSubtitle({
                      isCreator: member.isCreator,
                      username: member.username,
                      fullName: member.fullName,
                    })}
                  </p>
                </div>

                {member.isMe ? null : (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMemberId(member.id);
                      setSheet("member");
                    }}
                    aria-label={`Options for ${member.name}`}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted transition-colors duration-200 ease-out hover:bg-surface-2 hover:text-text"
                  >
                    <MoreHorizontal
                      size={22}
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <ul className="divide-y divide-line overflow-hidden rounded-card bg-surface">
        <Row
          label="Nicknames"
          onClick={() => {
            setNicknameFocus(null);
            setSheet("nicknames");
          }}
        />
      </ul>

      <div className="space-y-5">
        {isGroup ? (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => {
                setLeaveCreatorNotice(isCreator);
                setSheet("leave");
              }}
              className="min-h-11 w-full text-left text-[15px] font-semibold text-danger"
            >
              Leave chat
            </button>
            <p className="text-[12px] leading-relaxed text-muted">{LEAVE_NOTE}</p>
          </div>
        ) : null}

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setSheet("delete")}
            className="min-h-11 w-full text-left text-[15px] font-semibold text-danger"
          >
            Delete chat
          </button>
          <p className="text-[12px] leading-relaxed text-muted">{DELETE_NOTE}</p>
        </div>
      </div>

      {error && sheet === null ? (
        <p role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      ) : null}

      {/* ---------------------------------------------------------- sheets */}

      {sheet === "name" ? (
        <Sheet label="Group name" onClose={closeSheet}>
          <div className="space-y-4 pb-2">
            <SheetHeading
              title="Group name"
              description={`Up to ${GROUP_NAME_MAX_LENGTH} characters.`}
            />
            <Input
              value={nameDraft}
              onChange={(event) => setNameDraft(event.target.value)}
              maxLength={GROUP_NAME_MAX_LENGTH}
              autoFocus
              aria-label="Group name"
              className="text-base"
            />
            {error ? (
              <p role="alert" className="text-[13px] text-danger">
                {error}
              </p>
            ) : null}
            <Button
              onClick={() => void changeName()}
              disabled={busy || nameDraft.trim().length === 0}
              loading={busy}
              className="w-full"
            >
              Save
            </Button>
          </div>
        </Sheet>
      ) : null}

      {sheet === "color" ? (
        <Sheet label="Chat color" onClose={closeSheet}>
          <div className="space-y-4 pb-2">
            <SheetHeading
              title="Chat color"
              description="Your messages use this color everywhere."
            />
            <ChatColorPicker value={color} onChange={choose} onReset={reset} />
            {colorError ? (
              <p role="alert" className="text-[13px] text-danger">
                {colorError}
              </p>
            ) : null}
          </div>
        </Sheet>
      ) : null}

      {sheet === "pins" ? (
        <Sheet label="Pinned messages" onClose={closeSheet}>
          <div className="space-y-3 pb-2">
            <SheetHeading title="Pinned messages" />
            <ul>
              {pinnedMessages.map((message) => (
                <li key={message.id} className="border-b border-line last:border-0">
                  <Link
                    href={`/chat/${conversationId}?m=${message.id}`}
                    className="flex min-h-11 items-center py-2 text-[15px] text-text"
                  >
                    <span className="min-w-0 truncate">
                      {message.body ?? "Pinned message"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </Sheet>
      ) : null}

      {sheet === "add" ? addPeopleSheet : null}

      {sheet === "nicknames" ? (
        <NicknamesSheet
          members={members}
          focusId={nicknameFocus}
          error={error}
          onClose={closeSheet}
          onSave={saveNickname}
          onDone={() => {
            closeSheet();
            setToast("Nicknames saved");
            router.refresh();
          }}
        />
      ) : null}

      {sheet === "member" && activeMember ? (
        <Sheet label={activeMember.name} onClose={closeSheet}>
          <div className="space-y-3 pb-2">
            <div className="flex items-center gap-3">
              <Avatar
                src={activeMember.avatarUrl}
                initial={activeMember.initial}
                name={activeMember.name}
                size={48}
              />
              <div className="min-w-0">
                <p className="truncate text-[17px] font-semibold text-text">
                  {activeMember.name}
                </p>
                <p className="truncate text-[13px] text-muted">
                  {memberSubtitle({
                    isCreator: activeMember.isCreator,
                    username: activeMember.username,
                    fullName: activeMember.fullName,
                  })}
                </p>
              </div>
            </div>

            {error ? (
              <p role="alert" className="text-[13px] text-danger">
                {error}
              </p>
            ) : null}

            {confirmRemove ? (
              <div className="space-y-3 rounded-card bg-surface-2 p-3">
                <p className="text-[14px] text-text">
                  Remove {activeMember.name} from the group?
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    onClick={() => void removeMember(activeMember)}
                    disabled={busy}
                    loading={busy}
                  >
                    Remove
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setConfirmRemove(false)}
                    disabled={busy}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <ul className="divide-y divide-line overflow-hidden rounded-card bg-surface-2">
                <li>
                  <button
                    type="button"
                    onClick={() => void messageMember(activeMember)}
                    className="min-h-11 w-full px-4 py-3 text-left text-[15px] text-text"
                  >
                    Message
                  </button>
                </li>
                {activeMember.username ? (
                  <li>
                    <Link
                      href={`/u/${encodeURIComponent(activeMember.username)}`}
                      className="block min-h-11 px-4 py-3 text-[15px] text-text"
                    >
                      View profile
                    </Link>
                  </li>
                ) : null}
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      setNicknameFocus(activeMember.id);
                      setSheet("nicknames");
                    }}
                    className="min-h-11 w-full px-4 py-3 text-left text-[15px] text-text"
                  >
                    Set nickname
                  </button>
                </li>
                {isCreator ? (
                  <li>
                    <button
                      type="button"
                      onClick={() => setConfirmRemove(true)}
                      className="min-h-11 w-full px-4 py-3 text-left text-[15px] text-danger"
                    >
                      Remove from group
                    </button>
                  </li>
                ) : null}
              </ul>
            )}
          </div>
        </Sheet>
      ) : null}

      {sheet === "leave" ? (
        <Sheet label="Leave chat" onClose={closeSheet}>
          <div className="space-y-4 pb-2">
            <SheetHeading
              title={leaveCreatorNotice ? "You hold this group" : "Leave chat?"}
              description={
                leaveCreatorNotice
                  ? "You're the only admin, so hand the group over before you leave. For now you can delete the chat for yourself instead."
                  : LEAVE_NOTE
              }
            />

            {error ? (
              <p role="alert" className="text-[13px] text-danger">
                {error}
              </p>
            ) : null}

            {leaveCreatorNotice ? (
              <Button
                variant="destructive"
                onClick={() => void deleteForMe()}
                disabled={busy}
                loading={busy}
                className="w-full"
              >
                Delete chat for me
              </Button>
            ) : (
              <Button
                variant="destructive"
                onClick={() => void leaveChat()}
                disabled={busy}
                loading={busy}
                className="w-full"
              >
                Leave chat
              </Button>
            )}

            <Button
              variant="secondary"
              onClick={closeSheet}
              disabled={busy}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </Sheet>
      ) : null}

      {sheet === "delete" ? (
        <Sheet label="Delete chat" onClose={closeSheet}>
          <div className="space-y-4 pb-2">
            <SheetHeading title="Delete chat?" description={DELETE_NOTE} />
            {error ? (
              <p role="alert" className="text-[13px] text-danger">
                {error}
              </p>
            ) : null}
            <Button
              variant="destructive"
              onClick={() => void deleteForMe()}
              disabled={busy}
              loading={busy}
              className="w-full"
            >
              Delete chat
            </Button>
            <Button
              variant="secondary"
              onClick={closeSheet}
              disabled={busy}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </Sheet>
      ) : null}

      <Toast message={toast} onDone={() => setToast(null)} />
    </section>
  );
}

function NicknamesSheet({
  members,
  focusId,
  error,
  onClose,
  onSave,
  onDone,
}: {
  members: DetailsMember[];
  focusId: string | null;
  error: string | null;
  onClose: () => void;
  onSave: (member: DetailsMember, value: string) => Promise<void>;
  onDone: () => void;
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      members.map((member) => [member.id, member.nickname ?? ""])
    )
  );

  const ordered = focusId
    ? [
        ...members.filter((member) => member.id === focusId),
        ...members.filter((member) => member.id !== focusId),
      ]
    : members;

  return (
    <Sheet label="Nicknames" onClose={onClose}>
      <div className="space-y-4 pb-2">
        <SheetHeading
          title="Nicknames"
          description="Only people in this chat see them."
        />

        <ul className="space-y-3">
          {ordered.map((member) => (
            <li key={member.id} className="space-y-1.5">
              <label
                htmlFor={`nick-${member.id}`}
                className="text-[13px] text-muted"
              >
                {member.fullName}
              </label>
              <div className="flex items-center gap-2">
                <Input
                  id={`nick-${member.id}`}
                  value={drafts[member.id] ?? ""}
                  maxLength={NICKNAME_MAX_LENGTH}
                  autoFocus={focusId === member.id}
                  placeholder={member.fullName}
                  onChange={(event) =>
                    setDrafts((current) => ({
                      ...current,
                      [member.id]: event.target.value,
                    }))
                  }
                  onBlur={(event) => {
                    if ((drafts[member.id] ?? "") !== (member.nickname ?? "")) {
                      void onSave(member, event.target.value);
                    }
                  }}
                  className="min-w-0 flex-1 py-2.5"
                />
                {(drafts[member.id] ?? "").length > 0 ? (
                  <button
                    type="button"
                    aria-label={`Clear ${member.fullName}'s nickname`}
                    onClick={() => {
                      setDrafts((current) => ({ ...current, [member.id]: "" }));
                      void onSave(member, "");
                    }}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted"
                  >
                    <X size={18} strokeWidth={1.75} aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>

        {error ? (
          <p role="alert" className="text-[13px] text-danger">
            {error}
          </p>
        ) : null}

        <Button onClick={onDone} className="w-full">
          Done
        </Button>
      </div>
    </Sheet>
  );
}

function AddPeopleSheet({
  isGroup,
  friends,
  busy,
  error,
  onClose,
  onAdd,
}: {
  isGroup: boolean;
  friends: DetailsFriend[];
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onAdd: (ids: string[], groupName: string) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");

  const term = query.trim().toLowerCase();
  const visible = friends.filter(
    (friend) =>
      !term ||
      friend.name.toLowerCase().includes(term) ||
      (friend.username ?? "").toLowerCase().includes(term)
  );
  const chosen = selected
    .map((id) => friends.find((friend) => friend.id === id))
    .filter((friend): friend is DetailsFriend => Boolean(friend));

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id]
    );
  }

  return (
    <Sheet label="Add people" onClose={onClose}>
      <div className="space-y-4 pb-2">
        <SheetHeading
          title="Add people"
          description={
            isGroup
              ? "Friends join this group right away."
              : "This starts a new group with both of you and the people you pick."
          }
        />

        <div className="relative">
          <Search
            size={18}
            strokeWidth={1.75}
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
          />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search friends"
            aria-label="Search friends"
            autoComplete="off"
            pill
            className="pl-10"
          />
        </div>

        {chosen.length > 0 ? (
          <ul aria-label="Selected people" className="flex flex-wrap gap-2">
            {chosen.map((friend) => (
              <li key={friend.id}>
                <button
                  type="button"
                  onClick={() => toggle(friend.id)}
                  className="flex min-h-8 items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-[13px] text-text"
                >
                  {friend.name}
                  <X size={14} strokeWidth={2} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {!isGroup ? (
          <div className="space-y-1.5">
            <label htmlFor="new-group-name" className="text-[13px] text-muted">
              Group name (optional)
            </label>
            <Input
              id="new-group-name"
              value={groupName}
              maxLength={GROUP_NAME_MAX_LENGTH}
              onChange={(event) => setGroupName(event.target.value)}
              placeholder="Weekend crew"
              className="py-2.5"
            />
          </div>
        ) : null}

        {friends.length === 0 ? (
          <p className="text-[13px] text-muted">
            Everyone you&apos;re friends with is already here.
          </p>
        ) : visible.length === 0 ? (
          <p className="text-[13px] text-muted">No friends match that.</p>
        ) : (
          <ul className="max-h-64 overflow-y-auto">
            {visible.map((friend) => {
              const picked = selected.includes(friend.id);

              return (
                <li key={friend.id}>
                  <button
                    type="button"
                    onClick={() => toggle(friend.id)}
                    aria-pressed={picked}
                    className="flex min-h-12 w-full items-center gap-3 py-2 text-left"
                  >
                    <Avatar
                      src={friend.avatarUrl}
                      initial={friend.initial}
                      name={friend.name}
                      size={40}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] text-text">
                        {friend.name}
                      </span>
                      {friend.username ? (
                        <span className="block truncate text-[13px] text-muted">
                          @{friend.username}
                        </span>
                      ) : null}
                    </span>
                    <span
                      aria-hidden="true"
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                        picked
                          ? "border-primary bg-primary text-on-primary"
                          : "border-border"
                      }`}
                    >
                      {picked ? <Check size={16} strokeWidth={2.5} /> : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {error ? (
          <p role="alert" className="text-[13px] text-danger">
            {error}
          </p>
        ) : null}

        <Button
          onClick={() => void onAdd(selected, groupName)}
          disabled={busy || selected.length === 0}
          loading={busy}
          className="w-full"
        >
          Add
        </Button>
      </div>
    </Sheet>
  );
}
