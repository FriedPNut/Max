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
    <>
      {person.name}
      {person.id === currentUserId && (
        <span className="text-muted"> (you)</span>
      )}
    </>
  );

  if (person.username) {
    return (
      <Link
        href={`/u/${encodeURIComponent(person.username)}`}
        className={`transition-opacity duration-150 ease-out hover:opacity-80 ${className}`}
      >
        {content}
      </Link>
    );
  }

  return <span className={className}>{content}</span>;
}
