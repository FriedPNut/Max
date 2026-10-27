import { AppShell, getAuthenticatedUser } from "@/components/app-shell";
import { InstallabilityPanel } from "@/components/notifications/installability-panel";
import { PushDebugPanel } from "@/components/notifications/push-debug-panel";

export default async function PushDebugPage() {
  const { user } = await getAuthenticatedUser();

  return (
    <AppShell userId={user.id} title="Troubleshoot">
      <section className="space-y-6">
        <p className="text-[13px] leading-relaxed text-muted">
          Why a notification might not arrive. Settings are named, never shown.
        </p>

        <PushDebugPanel />

        <InstallabilityPanel />
      </section>
    </AppShell>
  );
}
