/**
 * Confirms the onboard endpoint + diagnoses the Users-page 403, via authenticated API
 * calls using the logged-in session token (reuses e2e/.auth/user.json). Non-mutating.
 *   node e2e/check-onboard.mjs
 */
import { chromium } from "@playwright/test";

const APP = "http://localhost:3000";
const API = "https://localhost:7290/api/v1";
const AUTH = "e2e/.auth/user.json";
const log = (...a) => console.log("[onboard]", ...a);

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ ignoreHTTPSErrors: true, storageState: AUTH });
const page = await ctx.newPage();

await page.goto(APP, { waitUntil: "domcontentloaded" });
await page.waitForResponse((r) => r.url().includes("/menus/my-menus"), { timeout: 60_000 }).catch(() => {});

const token = await page.evaluate(async () => {
  const r = await fetch("/api/auth/session");
  const s = await r.json().catch(() => ({}));
  return s?.accessToken ?? null;
});
log("have access token:", !!token);
const headers = token ? { Authorization: `Bearer ${token}` } : {};

// Who am I + my roles
const me = await ctx.request.get(`${API}/users/me`, { headers });
log("GET /users/me ->", me.status());
if (me.ok()) {
  const b = await me.json().catch(() => null);
  log("me:", JSON.stringify(b?.content ?? b).slice(0, 500));
}

// Can I list users? (AdminOnly)
const list = await ctx.request.get(`${API}/users?page=1&pageSize=10`, { headers });
log("GET /users ->", list.status());
let target = null;
if (list.ok()) {
  const b = await list.json().catch(() => null);
  const arr = Array.isArray(b?.content) ? b.content : [];
  log("users total:", b?.metaData?.total ?? arr.length);
  log("sample:", JSON.stringify(arr.slice(0, 5).map((u) => ({ id: u.id, email: u.email, onb: u.isOnboarded ?? u.onboarded }))));
  const notOnb = arr.find((u) => (u.isOnboarded ?? u.onboarded) === false);
  target = notOnb?.id ?? null;
} else {
  log("GET /users body:", (await list.text().catch(() => "")).slice(0, 300));
}

// Onboard route runs? Bogus id => 400 (route exists, user not found) proves it's deployed & functioning.
const bogus = "00000000-0000-0000-0000-0000000000aa";
const bogusResp = await ctx.request.patch(`${API}/users/${bogus}/onboard`, { headers });
log("PATCH onboard (bogus id) ->", bogusResp.status(), "| body:", (await bogusResp.text().catch(() => "")).slice(0, 300));

// Read-only: report whether a real not-onboarded user exists (no mutation performed here —
// do the actual onboard via the UI once access is restored).
log(target ? `(a not-onboarded user exists and could be onboarded via the UI: ${target})` : "(no not-onboarded user available)");

await browser.close();
process.exit(0);
