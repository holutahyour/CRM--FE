/**
 * One-time Azure AD login capture for the fix-verification spec.
 *
 * Usage (from the CRM--FE folder, with the frontend dev server running):
 *   node e2e/capture-auth.mjs
 *
 * It opens a real browser at the app. Complete the Microsoft sign-in, then press
 * ENTER in this terminal to save the authenticated session to e2e/.auth/user.json.
 * verify-fixes.spec.ts reuses that session so it can hit the real backend as you.
 *
 * The saved session lasts until the next-auth token expires — re-run this if the
 * verification spec starts redirecting to the login page.
 */
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { createInterface } from "node:readline";

const APP_URL = "http://localhost:3000";
const OUT = "e2e/.auth/user.json";

const ask = (q) =>
  new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(q, (answer) => {
      rl.close();
      resolve(answer);
    });
  });

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({ ignoreHTTPSErrors: true });
const page = await context.newPage();

console.log(`\nOpening ${APP_URL} — complete the Microsoft sign-in in the browser window.`);
await page.goto(APP_URL);

await ask("\n>> Once the dashboard is visible (you are logged in), press ENTER here to save the session… ");

await mkdir("e2e/.auth", { recursive: true });
await context.storageState({ path: OUT });
console.log(`\n✓ Saved authenticated session → ${OUT}`);

await browser.close();
process.exit(0);
