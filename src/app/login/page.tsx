import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { AuthForm } from "@/components/auth-form";

export default async function LoginPage() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      redirect("/events");
    }
  }

  return (
    <main className="min-h-dvh bg-background text-text">
      <header className="border-b border-line">
        <div className="mx-auto flex h-14 w-full max-w-[560px] items-center px-4">
          <span className="text-lg font-semibold text-text">Max</span>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[560px] px-4 py-10 sm:py-14">
        <p className="text-sm text-muted">
          Maximum potential. Maximum fun. Maximum productivity.
        </p>

        <div className="mt-8">
          <AuthForm />
        </div>
      </div>
    </main>
  );
}
