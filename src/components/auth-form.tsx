"use client";

import { useActionState, useState } from "react";
import {
  signInAction,
  signUpAction,
  type AuthActionState,
} from "@/app/actions/auth";

const initialState: AuthActionState = {};

export function AuthForm() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [signInState, signInFormAction, signInPending] = useActionState(
    signInAction,
    initialState
  );
  const [signUpState, signUpFormAction, signUpPending] = useActionState(
    signUpAction,
    initialState
  );

  const isSignUp = mode === "signup";
  const activeState = isSignUp ? signUpState : signInState;
  const isPending = isSignUp ? signUpPending : signInPending;

  return (
    <div className="w-full">
      {/* Mode Switcher — editorial hairline tabs with 2px accent underline */}
      <div
        role="tablist"
        aria-label="Account access"
        className="flex items-baseline gap-8 border-b border-line mb-6"
      >
        <button
          type="button"
          role="tab"
          aria-selected={!isSignUp}
          onClick={() => setMode("signin")}
          className={`pb-3 font-mono text-xs uppercase tracking-[0.08em] transition-colors duration-150 ease-out cursor-pointer relative ${
            !isSignUp ? "text-ink font-medium" : "text-muted hover:text-ink"
          }`}
        >
          Sign in
          {!isSignUp && (
            <span className="absolute left-0 right-0 -bottom-[1px] h-[2px] bg-accent" />
          )}
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={isSignUp}
          onClick={() => setMode("signup")}
          className={`pb-3 font-mono text-xs uppercase tracking-[0.08em] transition-colors duration-150 ease-out cursor-pointer relative ${
            isSignUp ? "text-ink font-medium" : "text-muted hover:text-ink"
          }`}
        >
          Make an account
          {isSignUp && (
            <span className="absolute left-0 right-0 -bottom-[1px] h-[2px] bg-accent" />
          )}
        </button>
      </div>

      {/* Form Card */}
      <div className="bg-surface border border-line rounded-[6px] p-6 sm:p-8">
        <form
          action={isSignUp ? signUpFormAction : signInFormAction}
          className="space-y-5"
          noValidate
        >
          {isSignUp && (
            <div>
              <label
                htmlFor="display_name"
                className="block font-mono text-xs uppercase tracking-[0.06em] text-ink mb-2"
              >
                Display name
              </label>
              <input
                id="display_name"
                name="display_name"
                type="text"
                required
                autoComplete="name"
                placeholder="Maya"
                className="w-full bg-surface text-ink placeholder:text-muted/60 border-[1.5px] border-ink rounded-[4px] p-[14px] text-base leading-snug focus:outline-2 focus:outline-accent focus:outline-offset-0"
              />
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="block font-mono text-xs uppercase tracking-[0.06em] text-ink mb-2"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="maya@friends.club"
              className="w-full bg-surface text-ink placeholder:text-muted/60 border-[1.5px] border-ink rounded-[4px] p-[14px] text-base leading-snug focus:outline-2 focus:outline-accent focus:outline-offset-0"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block font-mono text-xs uppercase tracking-[0.06em] text-ink mb-2"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete={isSignUp ? "new-password" : "current-password"}
              placeholder="••••••••"
              className="w-full bg-surface text-ink placeholder:text-muted/60 border-[1.5px] border-ink rounded-[4px] p-[14px] text-base leading-snug focus:outline-2 focus:outline-accent focus:outline-offset-0"
            />
          </div>

          {activeState?.error && (
            <div
              role="alert"
              className="border border-ink bg-paper px-3.5 py-3 rounded-[4px] text-sm text-ink flex items-start gap-2.5"
            >
              <span
                aria-hidden="true"
                className="inline-block w-2 h-2 rounded-full bg-accent mt-1.5 shrink-0"
              />
              <span>{activeState.error}</span>
            </div>
          )}

          {activeState?.notice && (
            <div
              role="status"
              className="border border-ink bg-paper px-3.5 py-3 rounded-[4px] text-sm text-ink"
            >
              {activeState.notice}
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="w-full min-h-[44px] px-5 py-3 rounded-[4px] bg-ink text-paper font-sans font-medium text-base tracking-tight hover:bg-accent hover:text-accent-ink active:translate-y-[1px] transition-all duration-150 ease-out cursor-pointer disabled:opacity-60 disabled:pointer-events-none"
            >
              {isPending
                ? isSignUp
                  ? "Making your account..."
                  : "Signing in..."
                : isSignUp
                ? "Make an account"
                : "Sign in"}
            </button>
          </div>
        </form>
      </div>

      {/* Bottom editorial prompt */}
      <div className="mt-6 flex items-center justify-between text-sm text-muted">
        <span>
          {isSignUp ? "Already in the group?" : "Need a spot on the list?"}
        </span>
        <button
          type="button"
          onClick={() => setMode(isSignUp ? "signin" : "signup")}
          className="text-ink underline underline-offset-4 decoration-line hover:decoration-accent transition-colors duration-150 ease-out cursor-pointer font-medium"
        >
          {isSignUp ? "Sign in" : "Make an account"}
        </button>
      </div>
    </div>
  );
}
