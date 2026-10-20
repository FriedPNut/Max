"use client";

import { useActionState } from "react";
import {
  renameConversationAction,
  type ChatActionState,
} from "@/app/actions/chat";

const inputClass =
  "w-full bg-surface text-text placeholder:text-muted border border-line rounded-lg px-3 py-3 text-base leading-snug focus:outline-2 focus:outline-offset-0 focus:outline-text";

export function RenameGroupForm({
  conversationId,
  initialName,
}: {
  conversationId: string;
  initialName: string;
}) {
  const [state, formAction, pending] = useActionState(
    renameConversationAction.bind(null, conversationId),
    {} as ChatActionState
  );

  return (
    <form
      action={formAction}
      className="space-y-3 rounded-lg border border-line bg-surface p-4"
    >
      <div>
        <label htmlFor="group-name" className="block text-sm text-muted mb-2">
          Group name
        </label>
        <input
          id="group-name"
          name="name"
          type="text"
          required
          autoComplete="off"
          defaultValue={initialName}
          className={inputClass}
        />
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-text">
          {state.error}
        </p>
      )}

      {state.success && <p className="text-sm text-muted">Saved.</p>}

      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded-lg bg-text px-4 py-3 text-sm font-medium text-white transition-opacity duration-150 ease-out hover:opacity-90 cursor-pointer disabled:opacity-60 disabled:pointer-events-none"
      >
        {pending ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
