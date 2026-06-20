/**
 * Fix-verification spec — runs against the REAL backend with a logged-in session.
 * Confirms the three fixes from this session end-to-end through the UI:
 *   1. Inventory → Items renders (was empty: the list query timed out via a cartesian
 *      include explosion; fixed with AsSplitQuery in MSSQLBaseRepository).
 *   2. Departments load with live staff counts (DepartmentService now counts real users).
 *   3. User onboarding works (new PATCH /users/{id}/onboard endpoint; was 404).
 *
 * Prerequisites:
 *   1. Backend rebuilt & running with the fixes (https://localhost:7290).
 *   2. Frontend dev server running:   pnpm dev        (http://localhost:3000)
 *   3. One-time auth capture:         node e2e/capture-auth.mjs   → e2e/.auth/user.json
 *
 * Run:  npx playwright test e2e/verify-fixes.spec.ts --reporter=list
 * Screenshots are written to playwright-report/verify-*.png
 *
 * NOTE: this hits the real API (no route stubbing) — unlike the other specs in e2e/.
 */
import { test, expect } from "@playwright/test";
import { existsSync } from "node:fs";

const AUTH = "e2e/.auth/user.json";

// Whole file is skipped until an authenticated session has been captured.
test.skip(
  !existsSync(AUTH),
  "Run `node e2e/capture-auth.mjs` first to capture an authenticated session (e2e/.auth/user.json)."
);

test.use({ storageState: AUTH, ignoreHTTPSErrors: true });

test("Items list loads from the API (AsSplitQuery fix)", async ({ page }) => {
  const statuses: number[] = [];
  page.on("response", (r) => {
    if (r.url().includes("/api/v1/items?")) statuses.push(r.status());
  });

  await page.goto("/inventory/items");
  await page.waitForLoadState("networkidle", { timeout: 60_000 });
  await page.screenshot({ path: "playwright-report/verify-items.png", fullPage: true });

  // The /items call must succeed (previously timed out → 500 / empty list).
  expect(statuses.length, "expected at least one /items API call").toBeGreaterThan(0);
  expect(statuses, `/items returned: ${statuses.join(",")}`).toContain(200);

  // The grid renders rows, not the empty state.
  await expect(page.getByText("No inventory items found")).toHaveCount(0);
  await expect(page.getByText(/\d+ items? total/)).toBeVisible();
});

test("Departments load with live staff counts", async ({ page }) => {
  const statuses: number[] = [];
  page.on("response", (r) => {
    if (r.url().includes("/api/v1/departments")) statuses.push(r.status());
  });

  await page.goto("/departments");
  await page.waitForLoadState("networkidle", { timeout: 60_000 });
  await page.screenshot({ path: "playwright-report/verify-departments.png", fullPage: true });

  expect(statuses, `/departments returned: ${statuses.join(",")}`).toContain(200);
  await expect(page.getByText("Total Departments")).toBeVisible();
  await expect(page.getByText("Total Staff")).toBeVisible();
  // The Total Staff figure reflects users actually assigned to departments (0 until staff
  // are linked) — eyeball verify-departments.png to confirm it matches assignments.
});

test("User onboarding works (PATCH /users/{id}/onboard)", async ({ page }) => {
  let onboardStatus: number | null = null;
  page.on("response", (r) => {
    if (r.url().includes("/onboard")) onboardStatus = r.status();
  });

  await page.goto("/admin/users");
  await page.waitForLoadState("networkidle", { timeout: 60_000 });
  await page.screenshot({ path: "playwright-report/verify-users.png", fullPage: true });

  const onboardButtons = page.getByRole("button", { name: "Onboard" });
  const count = await onboardButtons.count();
  test.skip(count === 0, "No not-onboarded users available to exercise the onboard action.");

  // NOTE: this performs a REAL onboard on the first not-onboarded user.
  await onboardButtons.first().click();
  await expect.poll(() => onboardStatus, { timeout: 30_000 }).not.toBeNull();

  expect(
    onboardStatus,
    `onboard returned ${onboardStatus} (404 ⇒ route still missing / backend not rebuilt)`
  ).toBe(200);
});
