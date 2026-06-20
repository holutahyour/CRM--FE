/**
 * Drives a browser to verify the fixes against the live app, and surfaces the raw
 * /items response body so server-side errors are visible.
 *
 * First run (no saved session): headed — sign in via Microsoft; the session is saved
 * to e2e/.auth/user.json. Subsequent runs reuse it headlessly (no login needed).
 *
 *   node e2e/drive-verify.mjs
 *
 * Screenshots: playwright-report/verify-*.png
 */
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";

const APP = "http://localhost:3000";
const OUT = "playwright-report";
const AUTH = "e2e/.auth/user.json";
const log = (...a) => console.log("[verify]", ...a);

await mkdir(OUT, { recursive: true });
await mkdir("e2e/.auth", { recursive: true });

const haveAuth = existsSync(AUTH);
const browser = await chromium.launch({ headless: haveAuth });
const ctx = await browser.newContext({
  ignoreHTTPSErrors: true,
  ...(haveAuth ? { storageState: AUTH } : {}),
});
const page = await ctx.newPage();

let onboardStatus = null;
page.on("response", (r) => {
  if (r.url().includes("/onboard")) onboardStatus = r.status();
});
page.on("request", (r) => {
  if (r.url().includes("/onboard")) log("→ onboard request:", r.method(), r.url());
});
page.on("requestfailed", (r) => {
  if (r.url().includes("/onboard")) log("✗ onboard request FAILED:", r.failure()?.errorText, r.url());
});
page.on("console", (m) => {
  const t = m.text();
  if (/onboard|Failed|Error|CORS/i.test(t)) log("console:", m.type(), t.slice(0, 200));
});

if (!haveAuth) {
  log("Opening", APP, "— please complete the Microsoft sign-in in the window that opened.");
  await page.goto(APP, { waitUntil: "domcontentloaded" });
  try {
    await page.waitForResponse((r) => r.url().includes("/menus/my-menus") && r.status() === 200, { timeout: 240_000 });
    log("Login detected.");
  } catch {
    log("WARN: login not detected within 4 min — continuing anyway.");
  }
  await ctx.storageState({ path: AUTH });
  log("Saved session →", AUTH, "(future runs will be headless, no login).");
} else {
  log("Reusing saved session (headless).");
}

// ── Items — capture status + body to surface the server error ─────────────────
await page.goto(`${APP}/inventory/items`, { waitUntil: "domcontentloaded" });
let itemsStatus = null, itemsBody = null;
try {
  const resp = await page.waitForResponse((r) => r.url().includes("/api/v1/items?"), { timeout: 60_000 });
  itemsStatus = resp.status();
  itemsBody = await resp.text().catch(() => null);
} catch (e) {
  log("ITEMS: no /items response captured:", e.message);
}
await page.waitForLoadState("networkidle", { timeout: 60_000 }).catch(() => {});
await page.screenshot({ path: `${OUT}/verify-items.png`, fullPage: true });
log("ITEMS status:", itemsStatus);
log("ITEMS body:", (itemsBody || "").slice(0, 2000));

// ── Departments ──────────────────────────────────────────────────────────────
await page.goto(`${APP}/departments`, { waitUntil: "domcontentloaded" });
let deptStatus = null;
try {
  const resp = await page.waitForResponse((r) => r.url().includes("/api/v1/departments"), { timeout: 60_000 });
  deptStatus = resp.status();
} catch { /* ignore */ }
await page.waitForLoadState("networkidle", { timeout: 60_000 }).catch(() => {});
await page.screenshot({ path: `${OUT}/verify-departments.png`, fullPage: true });
log("DEPTS status:", deptStatus);

// ── Users / onboarding ───────────────────────────────────────────────────────
await page.goto(`${APP}/admin/users`, { waitUntil: "domcontentloaded" });
await page.waitForLoadState("networkidle", { timeout: 60_000 }).catch(() => {});
const onboardBtns = page.getByRole("button", { name: "Onboard" });
const nOnboard = await onboardBtns.count();
log("USERS onboard buttons:", nOnboard);
if (nOnboard > 0) {
  const onboardResp = page.waitForResponse((r) => r.url().includes("/onboard"), { timeout: 20_000 }).catch(() => null);
  await onboardBtns.first().click(); // performs a real onboard
  const resp = await onboardResp;
  if (resp) {
    onboardStatus = resp.status();
    log("USERS onboard body:", (await resp.text().catch(() => "")).slice(0, 600));
  }
  log("USERS onboard status:", onboardStatus);
}
await page.screenshot({ path: `${OUT}/verify-users.png`, fullPage: true });

log("DONE — screenshots in", OUT);
await browser.close();
process.exit(0);
