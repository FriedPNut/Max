import { AppShell, getAuthenticatedUser } from "@/components/app-shell";
import { RecapView } from "@/components/recap/recap-view";

export default async function RecapPage() {
  const { user } = await getAuthenticatedUser();

  return (
    <AppShell userId={user.id}>
      <RecapView />
    </AppShell>
  );
}
