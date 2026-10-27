"use client";

import { useActionState, useEffect, useState } from "react";
import {
  signInAction,
  signUpAction,
  type AuthActionState,
} from "@/app/actions/auth";
import { Button, Input } from "@/components/ui";

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

  // A full navigation, not a client push, so nothing cached from a previous
  // account can be reused.
  useEffect(() => {
    if (activeState?.redirectTo) {
      window.location.assign(activeState.redirectTo);
    }
  }, [activeState]);

  return (
    <div className="w-full">
      <form
        action={isSignUp ? signUpFormAction : signInFormAction}
        className="space-y-3"
        noValidate
      >
        {isSignUp && (
          <Input
            id="display_name"
            name="display_name"
            type="text"
            required
            autoComplete="name"
            aria-label="Name"
            placeholder="Name"
          />
        )}

        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          aria-label="Email"
          placeholder="Email"
        />

        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete={isSignUp ? "new-password" : "current-password"}
          aria-label="Password"
          placeholder="Password"
        />

        {activeState?.error && (
          <p role="alert" className="text-sm text-text">
            {activeState.error}
          </p>
        )}

        <Button type="submit" disabled={isPending} className="w-full">
          {isPending
            ? isSignUp
              ? "Making your account..."
              : "Logging in..."
            : isSignUp
            ? "Make an account"
            : "Log in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        {isSignUp ? "Already have an account? " : "New here? "}
        <button
          type="button"
          onClick={() => setMode(isSignUp ? "signin" : "signup")}
          className="font-semibold text-primary transition-opacity duration-200 ease-out hover:opacity-70"
        >
          {isSignUp ? "Log in" : "Sign up"}
        </button>
      </p>
    </div>
  );
}
