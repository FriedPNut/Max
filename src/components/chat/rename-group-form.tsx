"use client";

import { useActionState } from "react";
import {
  renameConversationAction,
  type ChatActionState,
} from "@/app/actions/chat";
import { Button, Card, Input } from "@/components/ui";

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
    <Card className="p-4">
    <form
      action={formAction}
      className="space-y-3"
    >
      <div>
        <label htmlFor="group-name" className="mb-2 block text-[13px] text-muted">
          Group name
        </label>
        <Input
          id="group-name"
          name="name"
          type="text"
          required
          autoComplete="off"
          defaultValue={initialName}
        />
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}

      {state.success && <p className="text-sm text-muted">Saved.</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save"}
      </Button>
    </form>
    </Card>
  );
}
