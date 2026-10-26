import Link from "next/link";
import type { PlanPerson } from "@/lib/event-plan";

export function PersonName({
  person,
  currentUserId,
  className = "",
}: {
  person: PlanPerson;
  currentUserId?: string;
  className?: string;
}) {
  const content = (
    <span className="font-semibold">
      {person.name}
      {person.id === currentUserId && (
        <span className="font-normal text-muted"> (you)</span>
      )}
    </span>
  );

  if (person.username) {
    return (
      <Link
        href={`/u/${encodeURIComponent(person.username)}`}
        className={`transition-opacity duration-200 ease-out hover:opacity-80 ${className}`}
      >
        {content}
      </Link>
    );
  }

  return <span className={className}>{content}</span>;
}
