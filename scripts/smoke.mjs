// Smoke test: node scripts/smoke.mjs [baseUrl]
// Checks the basics against a running server (npm run start or a deployed URL).
const base = (process.argv[2] ?? process.env.SMOKE_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");

const failures = [];

async function request(path, init = {}) {
  return fetch(`${base}${path}`, { redirect: "manual", ...init });
}

function check(name, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
  if (!ok) failures.push(name);
}

async function main() {
  const login = await request("/login");
  check("/login returns 200", login.status === 200, `got ${login.status}`);

  for (const path of ["/events", "/chat", "/feed", "/me"]) {
    const res = await request(path);
    const location = res.headers.get("location") ?? "";
    check(
      `${path} redirects to /login when logged out`,
      res.status >= 300 && res.status < 400 && location.includes("/login"),
      `got ${res.status} ${location}`
    );
  }

  const dispatch = await request("/api/notifications/dispatch", { method: "POST" });
  check("/api/notifications/dispatch returns 401 without the secret", dispatch.status === 401, `got ${dispatch.status}`);

  // Logged out, the proxy redirects every route to /login before routing, so
  // an unknown route redirects too. Signed-in visits reach the not-found page.
  const unknown = await request("/this-route-does-not-exist-smoke");
  const unknownLocation = unknown.headers.get("location") ?? "";
  check(
    "unknown route redirects to /login when logged out",
    unknown.status >= 300 && unknown.status < 400 && unknownLocation.includes("/login"),
    `got ${unknown.status} ${unknownLocation}`
  );

  const manifest = await request("/manifest.webmanifest");
  check("/manifest.webmanifest returns 200", manifest.status === 200, `got ${manifest.status}`);

  const sw = await request("/sw.js");
  check("/sw.js returns 200", sw.status === 200, `got ${sw.status}`);

  if (failures.length > 0) {
    console.error(`\n${failures.length} smoke check(s) failed.`);
    process.exit(1);
  }
  console.log("\nAll smoke checks passed.");
}

main().catch((error) => {
  console.error("Smoke test could not reach the server:", error.message);
  process.exit(1);
});
