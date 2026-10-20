"use client";

import { useActionState, useState } from "react";
import {
  signInAction,
  signUpAction,
  type AuthActionState,
} from "@/app/actions/auth";

const initialState: AuthActionState = {};

const inputClass =
  "w-full bg-surface text-text placeholder:text-muted border border-line rounded-lg px-3 py-3 text-base leading-snug focus:outline-2 focus:outline-offset-0 focus:outline-text";

const labelClass = "block text-sm text-muted mb-2";

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
      <div
        role="tablist"
        aria-label="Account access"
        className="flex items-center gap-6 border-b border-line mb-6"
      >
        <button
          type="button"
          role="tab"
          aria-selected={!isSignUp}
          onClick={() => setMode("signin")}
          className={`relative min-h-11 py-3 text-sm transition-colors duration-150 ease-out cursor-pointer ${
            !isSignUp ? "text-text font-medium" : "text-muted hover:text-text"
          }`}
        >
          Sign in
          {!isSignUp && (
            <span className="absolute left-0 right-0 -bottom-px h-[2px] bg-accent" />
          )}
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={isSignUp}
          onClick={() => setMode("signup")}
          className={`relative min-h-11 py-3 text-sm transition-colors duration-150 ease-out cursor-pointer ${
            isSignUp ? "text-text font-medium" : "text-muted hover:text-text"
          }`}
        >
          Make an account
          {isSignUp && (
            <span className="absolute left-0 right-0 -bottom-px h-[2px] bg-accent" />
          )}
        </button>
      </div>

      <form
        action={isSignUp ? signUpFormAction : signInFormAction}
        className="space-y-5"
        noValidate
      >
        {isSignUp && (
          <div>
            <label htmlFor="display_name" className={labelClass}>
              Display name
            </label>
            <input
              id="display_name"
              name="display_name"
              type="text"
              required
              autoComplete="name"
              placeholder="Maya"
              className={inputClass}
            />
          </div>
        )}

        <div>
          <label htmlFor="email" className={labelClass}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="maya@friends.club"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="password" className={labelClass}>
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete={isSignUp ? "new-password" : "current-password"}
            placeholder="••••••••"
            className={inputClass}
          />
        </div>

        {activeState?.error && (
          <div
            role="alert"
            className="rounded-lg border border-line bg-surface px-3.5 py-3 text-sm text-text"
          >
            {activeState.error}
          </div>
        )}

        {activeState?.notice && (
          <div
            role="status"
            className="rounded-lg border border-line bg-surface px-3.5 py-3 text-sm text-text"
          >
            {activeState.notice}
          </div>
        )}

        <div className="pt-1">
          <button
            type="submit"
            disabled={isPending}
            className="w-full min-h-11 px-4 py-3 rounded-lg bg-text text-white font-sans font-medium text-sm transition-opacity duration-150 ease-out hover:opacity-90 cursor-pointer disabled:opacity-60 disabled:pointer-events-none"
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

      <div className="mt-6 flex items-center justify-between gap-4 text-sm text-muted">
        <span>
          {isSignUp ? "Already have an account?" : "New here?"}
        </span>
        <button
          type="button"
          onClick={() => setMode(isSignUp ? "signin" : "signup")}
          className="text-text font-medium hover:opacity-80 transition-opacity duration-150 ease-out cursor-pointer"
        >
          {isSignUp ? "Sign in" : "Make an account"}
        </button>
      </div>
    </div>
  );
}
