"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera, Check } from "lucide-react";
import {
  checkUsernameAction,
  completeOnboardingAction,
  saveOnboardingProfileAction,
} from "@/app/actions/onboarding";
import { Avatar, Button, Input, inputClass } from "@/components/ui";
import {
  MAX_UPLOAD_BYTES,
  resizeImageSquare,
  uploadImageWithProgress,
} from "@/lib/client-image";
import {
  DISPLAY_NAME_MAX_LENGTH,
  PROFILE_BUCKET,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  isValidUsername,
  normalizeUsername,
} from "@/lib/profile";
import {
  ONBOARDED_COOKIE,
  ONBOARDED_PENDING,
  suggestUsername,
} from "@/lib/onboarding";
import { enablePush, getPushStatus, type PushStatus } from "@/lib/push-client";
import { isValidMonthDay } from "@/lib/birthdays";
import { createClient } from "@/lib/supabase/client";

const AVATAR_SIZE = 400;
const JPEG_QUALITY = 0.8;
const STEPS = 3;

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Longest possible month length, so 29 February stays selectable.
const MONTH_DAY_COUNTS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const labelClass = "block text-[13px] text-muted mb-2";

type UsernameStatus = "idle" | "current" | "checking" | "free" | "taken" | "invalid";

export function OnboardingFlow({
  userId,
  initialName,
  initialUsername,
  initialAvatarUrl,
  initialBirthday,
  replay,
}: {
  userId: string;
  initialName: string;
  initialUsername: string;
  initialAvatarUrl: string | null;
  initialBirthday: { month: number | null; day: number | null; year: number | null };
  replay: boolean;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const headingRef = useRef<HTMLHeadingElement>(null);

  const [name, setName] = useState(initialName);
  const [username, setUsername] = useState(initialUsername);
  const [month, setMonth] = useState<number | null>(initialBirthday.month);
  const [day, setDay] = useState<number | null>(initialBirthday.day);
  const [year, setYear] = useState(
    initialBirthday.year ? String(initialBirthday.year) : ""
  );

  const [avatarBlob, setAvatarBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("current");
  const [pushStatus, setPushStatus] = useState<PushStatus | null>(null);
  const [pushPending, setPushPending] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewRef.current) {
        URL.revokeObjectURL(previewRef.current);
      }
    };
  }, []);

  // Move focus to the new screen's heading so keyboards and readers follow.
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [step]);

  // Live username check, debounced. The save re-checks before writing.
  useEffect(() => {
    const clean = normalizeUsername(username);

    if (!clean || clean === normalizeUsername(initialUsername)) {
      setUsernameStatus("current");
      return;
    }

    if (!isValidUsername(clean)) {
      setUsernameStatus("invalid");
      return;
    }

    setUsernameStatus("checking");
    let cancelled = false;

    const timer = setTimeout(() => {
      void checkUsernameAction(clean)
        .then((result) => {
          if (!cancelled) {
            setUsernameStatus(result.taken ? "taken" : "free");
          }
        })
        .catch(() => {
          if (!cancelled) setUsernameStatus("idle");
        });
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [username, initialUsername]);

  // Notification permission is only meaningful on the last screen.
  useEffect(() => {
    if (step !== 2) return;
    let cancelled = false;
    void getPushStatus().then((status) => {
      if (!cancelled) setPushStatus(status);
    });
    return () => {
      cancelled = true;
    };
  }, [step]);

  function goTo(next: number) {
    setError(null);
    setDirection(next > step ? "forward" : "back");
    setStep(Math.min(STEPS - 1, Math.max(0, next)));
  }

  function replacePreview(blob: Blob | null) {
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
    }

    const nextUrl = blob ? URL.createObjectURL(blob) : null;
    previewRef.current = nextUrl;
    setPreviewUrl(nextUrl);
    setAvatarBlob(blob);
  }

  async function handlePhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || busy) return;

    setError(null);

    if (file.type && !file.type.startsWith("image/")) {
      setError("Pick a photo.");
      return;
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      setError("That photo is too big. Pick one under 30 MB.");
      return;
    }

    try {
      replacePreview(await resizeImageSquare(file, AVATAR_SIZE, JPEG_QUALITY));
    } catch {
      setError("Couldn't read that photo. Try another one.");
    }
  }

  async function uploadAvatar() {
    if (!avatarBlob) return null;

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error("Signed out.");
    }

    const path = `avatars/${userId}/${Date.now()}.jpg`;

    await uploadImageWithProgress({
      file: avatarBlob,
      bucket: PROFILE_BUCKET,
      path,
      token: session.access_token,
      onProgress: () => {},
    });

    return path;
  }

  async function handleContinue() {
    if (busy) return;

    const cleanName = name.trim();
    const cleanUsername = normalizeUsername(username);

    if (!cleanName) {
      setError("Add your name.");
      return;
    }

    if (!isValidUsername(cleanUsername)) {
      setError(
        `Use ${USERNAME_MIN_LENGTH}–${USERNAME_MAX_LENGTH} lowercase letters, numbers, or underscores.`
      );
      return;
    }

    if (usernameStatus === "taken") {
      setError("That username is taken.");
      return;
    }

    if (month !== null && day !== null && !isValidMonthDay(month, day)) {
      setError("That day isn't in that month.");
      return;
    }

    const cleanYear = year.trim();

    if (cleanYear && !/^\d{4}$/.test(cleanYear)) {
      setError("Use a four-digit year, or leave it blank.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const avatarPath = await uploadAvatar();

      const result = await saveOnboardingProfileAction({
        displayName: cleanName,
        username: cleanUsername,
        avatarPath,
        birthday: {
          month,
          day,
          year: cleanYear ? Number(cleanYear) : null,
        },
      });

      if (result.error) {
        setError(result.error);
        setBusy(false);
        return;
      }

      setBusy(false);
      goTo(2);
    } catch {
      setError("Couldn't save that. Try again.");
      setBusy(false);
    }
  }

  async function handlePush() {
    if (pushPending) return;
    setPushPending(true);
    setError(null);
    const result = await enablePush();
    setPushPending(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setPushStatus("enabled");
  }

  async function finish() {
    if (busy) return;
    setBusy(true);
    setError(null);

    try {
      await completeOnboardingAction({ replay });
    } catch {
      // Let the person in even if the save never landed; the proxy retries
      // from the pending cookie on the next page load.
      if (!replay) {
        document.cookie = `${ONBOARDED_COOKIE}=${ONBOARDED_PENDING}; path=/; max-age=31536000; samesite=lax`;
      }
    }

    router.replace(replay ? "/settings" : "/events");
  }

  const monthMax = month ? MONTH_DAY_COUNTS[month - 1] : 31;

  const primaryLabel =
    step === 0 ? "Get started" : step === 1 ? "Continue" : "Finish";

  // The same full-width horizontal slide used elsewhere in the app.
  const animationClass =
    direction === "forward" ? "screen-slide-forward" : "screen-slide-back";

  const heading =
    step === 1 ? "You" : step === 2 ? "Stay in the loop" : null;

  return (
    <div className="flex h-[100dvh] flex-col bg-background text-text">
      <div className="shrink-0 px-5 pt-[max(16px,env(safe-area-inset-top))]">
        <div className="flex gap-1.5" aria-hidden="true">
          {Array.from({ length: STEPS }, (_, index) => (
            <span
              key={index}
              className={`h-[3px] flex-1 rounded-full ${
                index <= step ? "bg-text" : "bg-surface-2"
              }`}
            />
          ))}
        </div>

        <p className="sr-only" aria-live="polite">
          Step {step + 1} of {STEPS}
        </p>

        <div className="mt-3 flex h-11 items-center justify-between">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => goTo(step - 1)}
              aria-label="Back"
              className="-ml-2 inline-flex h-11 w-11 items-center justify-center rounded-full text-text transition-colors duration-200 ease-out hover:bg-surface-2"
            >
              <ArrowLeft size={22} strokeWidth={1.75} aria-hidden="true" />
            </button>
          ) : (
            <span aria-hidden="true" />
          )}

          {step > 0 && (
            <button
              type="button"
              onClick={() => void (step === 2 ? finish() : goTo(step + 1))}
              disabled={busy}
              className="inline-flex h-11 items-center px-2 text-[15px] font-semibold text-link disabled:opacity-40"
            >
              Skip
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 pt-2">
        {step === 0 && (
          <div
            key="welcome"
            className={`flex h-full flex-col items-center justify-center ${animationClass}`}
          >
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="brand-gradient bg-clip-text text-[64px] font-extrabold leading-none tracking-[-0.03em] text-transparent outline-none"
            >
              Max
            </h1>
            <p className="mt-4 max-w-[280px] text-center text-[15px] leading-snug text-muted">
              Maximum potential. Maximum fun. Maximum productivity.
            </p>
          </div>
        )}

        {step === 1 && (
          <div key="you" className={`space-y-6 ${animationClass}`}>
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="text-[22px] font-bold leading-tight text-text outline-none"
            >
              {heading}
            </h1>

            <div className="flex justify-center">
              <div className="relative">
                {previewUrl ? (
                  <Avatar src={previewUrl} initial={name} size={96} />
                ) : (
                  <Avatar src={initialAvatarUrl} initial={name} size={96} />
                )}

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={busy}
                  aria-label="Add a profile photo"
                  className="absolute -bottom-0.5 -right-0.5 flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-primary text-on-primary disabled:opacity-40"
                >
                  <Camera size={16} strokeWidth={2} aria-hidden="true" />
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhoto}
                  disabled={busy}
                  className="hidden"
                />
              </div>
            </div>

            <div>
              <label htmlFor="onboarding-name" className={labelClass}>
                Name
              </label>
              <Input
                id="onboarding-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={DISPLAY_NAME_MAX_LENGTH}
                autoComplete="name"
                disabled={busy}
                placeholder="Your name"
              />
            </div>

            <div>
              <label htmlFor="onboarding-username" className={labelClass}>
                Username
              </label>
              <Input
                id="onboarding-username"
                type="text"
                value={username}
                onChange={(event) =>
                  setUsername(event.target.value.toLowerCase())
                }
                minLength={USERNAME_MIN_LENGTH}
                maxLength={USERNAME_MAX_LENGTH}
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                disabled={busy}
                placeholder={suggestUsername(name || "you", userId)}
                aria-describedby="onboarding-username-note"
                aria-invalid={usernameStatus === "taken" || undefined}
              />
              <p
                id="onboarding-username-note"
                aria-live="polite"
                className={`mt-1 text-sm ${
                  usernameStatus === "taken" || usernameStatus === "invalid"
                    ? "text-danger"
                    : "text-muted"
                }`}
              >
                {usernameStatus === "taken"
                  ? "That username is taken."
                  : usernameStatus === "invalid"
                  ? `${USERNAME_MIN_LENGTH}–${USERNAME_MAX_LENGTH} lowercase letters, numbers, underscores.`
                  : usernameStatus === "checking"
                  ? "Checking..."
                  : usernameStatus === "free"
                  ? "That one's free."
                  : `${USERNAME_MIN_LENGTH}–${USERNAME_MAX_LENGTH} lowercase letters, numbers, underscores.`}
              </p>
            </div>

            <div>
              <span className={labelClass}>Birthday</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="onboarding-birth-month" className="sr-only">
                    Birth month
                  </label>
                  <select
                    id="onboarding-birth-month"
                    className={inputClass}
                    value={month ?? ""}
                    disabled={busy}
                    onChange={(event) => {
                      const next = event.target.value
                        ? Number(event.target.value)
                        : null;
                      setMonth(next);
                      if (next && day && day > MONTH_DAY_COUNTS[next - 1]) {
                        setDay(null);
                      }
                    }}
                  >
                    <option value="">Month</option>
                    {MONTHS.map((label, index) => (
                      <option key={label} value={index + 1}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="onboarding-birth-day" className="sr-only">
                    Birth day
                  </label>
                  <select
                    id="onboarding-birth-day"
                    className={inputClass}
                    value={day ?? ""}
                    disabled={busy}
                    onChange={(event) =>
                      setDay(
                        event.target.value ? Number(event.target.value) : null
                      )
                    }
                  >
                    <option value="">Day</option>
                    {Array.from({ length: monthMax }, (_, index) => index + 1).map(
                      (value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              <div className="mt-2">
                <label htmlFor="onboarding-birth-year" className="sr-only">
                  Birth year (optional)
                </label>
                <Input
                  id="onboarding-birth-year"
                  type="text"
                  inputMode="numeric"
                  value={year}
                  placeholder="Year (optional)"
                  disabled={busy}
                  onChange={(event) =>
                    setYear(event.target.value.replace(/\D/g, "").slice(0, 4))
                  }
                />
              </div>

              <p className="mt-2 text-sm text-muted">Friends get a reminder.</p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div key="loop" className={`space-y-6 ${animationClass}`}>
            <div className="space-y-2">
              <h1
                ref={headingRef}
                tabIndex={-1}
                className="text-[22px] font-bold leading-tight text-text outline-none"
              >
                {heading}
              </h1>
              <p className="text-[15px] text-muted">
                Events, messages, and reminders.
              </p>
            </div>

            {pushStatus === "enabled" && (
              <div className="flex items-center gap-2 rounded-card bg-surface px-4 py-3">
                <Check
                  size={20}
                  strokeWidth={2}
                  aria-hidden="true"
                  className="text-primary"
                />
                <span className="text-[15px] text-text">
                  Notifications are on.
                </span>
              </div>
            )}

            {(pushStatus === "not-enabled" || pushStatus === null) && (
              <Button
                variant="primary"
                onClick={() => void handlePush()}
                disabled={pushPending || pushStatus === null}
                loading={pushPending}
                className="w-full"
              >
                Turn on notifications
              </Button>
            )}

            {pushStatus === "ios-needs-install" && (
              <ol className="space-y-3 rounded-card bg-surface px-4 py-3">
                {[
                  "Tap Share in Safari.",
                  "Tap Add to Home Screen.",
                  "Open Max from your home screen.",
                ].map((line, index) => (
                  <li key={line} className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-semibold text-text"
                    >
                      {index + 1}
                    </span>
                    <span className="text-[15px] leading-snug text-text">
                      {line}
                    </span>
                  </li>
                ))}
              </ol>
            )}

            {(pushStatus === "blocked" || pushStatus === "unsupported") && (
              <p className="text-[15px] text-muted">
                You can turn this on later in Settings.
              </p>
            )}
          </div>
        )}

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-card bg-surface px-4 py-3 text-[15px] text-danger"
          >
            {error}
          </p>
        )}
      </div>

      <div className="shrink-0 px-5 pb-[max(16px,env(safe-area-inset-bottom))] pt-3">
        <Button
          variant="primary"
          onClick={() => {
            if (step === 0) goTo(1);
            else if (step === 1) void handleContinue();
            else void finish();
          }}
          disabled={busy}
          loading={busy}
          className="w-full"
        >
          {primaryLabel}
        </Button>
      </div>
    </div>
  );
}
