"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { Row } from "@/components/notifications/push-debug-panel";

const MANIFEST_URL = "/manifest.webmanifest";
const DISPLAY_MODES = ["standalone", "fullscreen", "minimal-ui"];

/** What Chrome requires before it will install Max as an app. */
const REQUIRED_ICONS = [
  { size: "192x192", purpose: "any", label: "192×192" },
  { size: "512x512", purpose: "any", label: "512×512" },
  { size: "512x512", purpose: "maskable", label: "512×512 maskable" },
];

type IconReport = {
  src: string;
  sizes: string;
  purpose: string;
  ok: boolean;
  detail: string;
};

type Facts = {
  checked: boolean;
  manifestFound: boolean;
  manifestError: string | null;
  manifestName: string | null;
  icons: IconReport[];
  workerActive: boolean;
  installed: boolean;
  missing: string[];
};

const initialState: Facts = {
  checked: false,
  manifestFound: false,
  manifestError: null,
  manifestName: null,
  icons: [],
  workerActive: false,
  installed: false,
  missing: [],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringField(source: Record<string, unknown>, key: string) {
  const value = source[key];
  return typeof value === "string" ? value : null;
}

/** Loads an icon so the browser reports its real pixel size. */
function measureIcon(src: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();
    const timer = window.setTimeout(() => reject(new Error("timed out")), 5000);

    image.onload = () => {
      window.clearTimeout(timer);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error("didn't load"));
    };
    image.src = src;
  });
}

async function inspectIcons(entries: unknown): Promise<IconReport[]> {
  const reports: IconReport[] = [];
  const list = Array.isArray(entries) ? entries : [];

  for (const entry of list) {
    if (!isRecord(entry)) continue;

    const raw = stringField(entry, "src") ?? "";
    const sizes = stringField(entry, "sizes") ?? "";
    const purpose = stringField(entry, "purpose") ?? "";
    const report = { src: raw, sizes, purpose, ok: false, detail: "" };

    if (!raw) {
      reports.push({ ...report, detail: "no src" });
      continue;
    }

    let url: URL;

    try {
      url = new URL(raw, window.location.href);
    } catch {
      reports.push({ ...report, detail: "not a valid URL" });
      continue;
    }

    if (url.origin !== window.location.origin) {
      reports.push({ ...report, detail: "not on this origin" });
      continue;
    }

    try {
      const response = await fetch(url.href, { cache: "no-store" });

      if (!response.ok) {
        reports.push({ ...report, detail: `HTTP ${response.status}` });
        continue;
      }

      const { width, height } = await measureIcon(url.href);
      const declared = sizes.split(/\s+/).filter(Boolean);
      const matches =
        declared.length === 0 ||
        declared.includes(`${width}x${height}`);

      reports.push({
        ...report,
        ok: matches,
        detail: matches ? `${width}×${height} image` : `served ${width}×${height}`,
      });
    } catch {
      reports.push({ ...report, detail: "didn't load" });
    }
  }

  return reports;
}

function covers(report: IconReport, size: string, purpose: string) {
  if (!report.ok) return false;
  if (!report.sizes.split(/\s+/).includes(size)) return false;

  const purposes = report.purpose ? report.purpose.split(/\s+/) : ["any"];

  return purposes.includes(purpose);
}

export function InstallabilityPanel() {
  const [facts, setFacts] = useState<Facts>(initialState);
  const [checking, setChecking] = useState(false);

  const check = useCallback(async () => {
    setChecking(true);

    const missing: string[] = [];

    let installed = false;
    try {
      installed = window.matchMedia("(display-mode: standalone)").matches;
    } catch {
      installed = false;
    }

    let workerActive = false;
    if ("serviceWorker" in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration("/");
        workerActive = Boolean(registration?.active);
      } catch {
        workerActive = false;
      }
    }

    let manifestFound = false;
    let manifestError: string | null = null;
    let manifestName: string | null = null;
    let icons: IconReport[] = [];

    try {
      const response = await fetch(MANIFEST_URL, { cache: "no-store" });

      if (!response.ok) {
        manifestError = `HTTP ${response.status}`;
      } else {
        const body: unknown = await response.json();

        if (isRecord(body)) {
          manifestFound = true;
          manifestName = stringField(body, "name") ?? stringField(body, "short_name");
          icons = await inspectIcons(body.icons);

          const display = stringField(body, "display");

          if (!manifestName) {
            missing.push("The manifest has no name or short_name.");
          }

          if (!display || !DISPLAY_MODES.includes(display)) {
            missing.push("The manifest display must be standalone, fullscreen or minimal-ui.");
          }

          for (const key of ["start_url", "scope"]) {
            const value = stringField(body, key);

            if (!value) {
              missing.push(`The manifest has no ${key}.`);
              continue;
            }

            try {
              if (new URL(value, window.location.href).origin !== window.location.origin) {
                missing.push(`The manifest ${key} is not on this origin.`);
              }
            } catch {
              missing.push(`The manifest ${key} is not a valid URL.`);
            }
          }
        } else {
          manifestError = "not a JSON object";
        }
      }
    } catch {
      manifestError = "request failed";
    }

    if (!manifestFound) {
      missing.push(
        `No web app manifest was served at ${MANIFEST_URL}${
          manifestError ? ` (${manifestError})` : ""
        }.`
      );
    } else {
      for (const required of REQUIRED_ICONS) {
        if (!icons.some((icon) => covers(icon, required.size, required.purpose))) {
          missing.push(`The manifest needs a working ${required.label} icon.`);
        }
      }

      if (!workerActive) {
        missing.push("The service worker is not active in this browser yet — reload once.");
      }

      if (!window.isSecureContext) {
        missing.push("Installing needs HTTPS (localhost is exempt).");
      }
    }

    setFacts({
      checked: true,
      manifestFound,
      manifestError,
      manifestName,
      icons,
      workerActive,
      installed,
      missing,
    });
    setChecking(false);
  }, []);

  useEffect(() => {
    void check();
  }, [check]);

  const pending = !facts.checked;
  const brokenIcons = facts.icons.filter((icon) => !icon.ok);
  const value = (text: string) => (pending ? "Checking..." : text);

  return (
    <section className="space-y-2">
      <h2 className="px-4 text-[13px] text-muted">Installability</h2>

      <div className="overflow-hidden rounded-card bg-surface">
        <Row
          label="Manifest found"
          value={value(facts.manifestFound ? `Yes (${facts.manifestName ?? "unnamed"})` : "No")}
          status={pending ? "neutral" : facts.manifestFound ? "ok" : "bad"}
          hint={
            !pending && !facts.manifestFound
              ? `${MANIFEST_URL} did not load${
                  facts.manifestError ? ` (${facts.manifestError})` : ""
                }. Chrome cannot install Max without it.`
              : undefined
          }
        />
        <Row
          label="Icons valid"
          value={value(
            facts.icons.length === 0
              ? "None declared"
              : brokenIcons.length === 0
              ? `All ${facts.icons.length} load`
              : `${brokenIcons.length} of ${facts.icons.length} broken`
          )}
          status={
            pending
              ? "neutral"
              : facts.icons.length > 0 && brokenIcons.length === 0
              ? "ok"
              : "bad"
          }
          hint={
            !pending && brokenIcons.length > 0
              ? brokenIcons
                  .map((icon) => `${icon.src || "unnamed icon"}: ${icon.detail}.`)
                  .join(" ")
              : undefined
          }
        />
        <Row
          label="Service worker active"
          value={value(facts.workerActive ? "Yes" : "No")}
          status={pending ? "neutral" : facts.workerActive ? "ok" : "bad"}
          hint={
            !pending && !facts.workerActive
              ? "Reload the page. If it stays missing, check that /sw.js loads and the site is on HTTPS."
              : undefined
          }
        />
        <Row
          label="Running in standalone mode"
          value={value(facts.installed ? "Yes" : "No, this is a browser tab")}
          status={pending ? "neutral" : facts.installed ? "ok" : "neutral"}
          hint={
            !pending && !facts.installed
              ? "display-mode: standalone is only true when Max was opened from the installed icon."
              : undefined
          }
        />
      </div>

      {!pending && (
        <div className="space-y-2 rounded-card bg-surface px-4 py-3">
          <p className="text-[13px] text-muted">
            {facts.missing.length === 0 ? "Nothing missing" : "What's missing"}
          </p>

          {facts.missing.length === 0 ? (
            <p className="text-[15px] leading-relaxed text-text">
              Chrome has everything it needs. Install from the ⋮ menu, then open
              Max from the home screen and check this page again.
            </p>
          ) : (
            <ul className="space-y-1 text-[15px] leading-relaxed text-text">
              {facts.missing.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Button
        variant="secondary"
        onClick={() => void check()}
        disabled={checking}
        className="w-full"
      >
        {checking ? "Checking..." : "Check installability"}
      </Button>
    </section>
  );
}
