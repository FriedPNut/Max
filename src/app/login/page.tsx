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
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 py-10 text-text">
      <span className="story-gradient bg-clip-text text-[64px] font-extrabold leading-none tracking-[-0.03em] text-transparent sm:text-[72px]">
        Max
      </span>

      <p className="mt-3 text-center text-sm text-muted">
        Maximum potential. Maximum fun. Maximum productivity.
      </p>

      <div className="mt-8 w-full max-w-[360px]">
        <AuthForm />
      </div>
    </main>
  );
}
