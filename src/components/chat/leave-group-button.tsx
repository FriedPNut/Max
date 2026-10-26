"use client";

import { useActionState, useState } from "react";
import {
  leaveConversationAction,
  type ChatActionState,
} from "@/app/actions/chat";
import { Button, Card } from "@/components/ui";

export function LeaveGroupButton({
  conversationId,
}: {
  conversationId: string;
}) {
  const [state, formAction, pending] = useActionState(
    leaveConversationAction,
    {} as ChatActionState
  );
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Button
        variant="destructive"
        onClick={() => setConfirming(true)}
        className="w-full"
      >
        Leave group
      </Button>
    );
  }

  return (
    <Card className="p-4">
    <form
      action={formAction}
      className="space-y-3"
    >
      <input type="hidden" name="conversation_id" value={conversationId} />

      <p className="text-sm text-text">
        Leave this group? You&apos;ll stop getting its messages.
      </p>

      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="destructive" disabled={pending}>
          {pending ? "Leaving..." : "Leave group"}
        </Button>

        <Button
          variant="secondary"
          onClick={() => setConfirming(false)}
          disabled={pending}
        >
          Cancel
        </Button>
      </div>
    </form>
    </Card>
  );
}
