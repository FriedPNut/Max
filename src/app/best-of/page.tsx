import { AppShell, getAuthenticatedUser } from "@/components/app-shell";
import { BestOfGrid } from "@/components/best-of/best-of-grid";

export default async function BestOfPage() {
  const { user } = await getAuthenticatedUser();

  return (
    <AppShell userId={user.id}>
      <BestOfGrid currentUserId={user.id} />
    </AppShell>
  );
}
