/**
 * E2E tests — Approval Workflows feature
 *
 * Strategy:
 *  - All API/auth calls are intercepted via Playwright route stubs so the suite
 *    runs without a live backend or Azure AD account.
 *  - The drawer is URL-driven (query param `workflow_drawer=<id>`).
 *  - Opening the drawer uses page.goto() with the query param rather than
 *    clicking "Edit Steps".  Clicking the button calls router.push(), which
 *    triggers a Next.js RSC re-render.  During that reconciliation Ark UI's
 *    Portal calls flushSync() and loses the ChakraProvider context, crashing
 *    the app in development mode.  A full-page goto() avoids that path entirely.
 *
 * Covered:
 *   1.  Page heading renders
 *   2.  Both workflow type card headings appear
 *   3.  Existing step shown on Requisitions card
 *   4.  "No steps configured" shown on Item Requests card
 *   5.  Drawer opens when navigated to with the workflow_drawer param
 *   6.  Role dropdown is populated with roles from /roles/names
 *   7.  Role dropdown has a "Select role…" placeholder
 *   8.  Adding a step appends name-input + role-select
 *   9.  Drag-handle (Grip icon) present on each step row
 *  10.  Removing a step decreases the step count
 *  11.  Validation: empty step name blocks save
 *  12.  Validation: no role selected blocks save
 *  13.  Validation: zero steps blocks save
 *  14.  Saving an existing template calls PUT /workflows/:id/steps
 *  15.  Saving a new template calls PUT /workflows/:id/steps with the IR id
 */

import { test, expect, type Page, type Route } from "@playwright/test";

// ─── Fixture data ─────────────────────────────────────────────────────────────

const MOCK_SESSION = {
  user: { name: "Test Admin", email: "admin@example.com", id: "user-1" },
  accessToken: "mock-token",
  expires: "2099-01-01T00:00:00.000Z",
};

const MOCK_ROLES = [
  { id: "role-1", name: "Manager" },
  { id: "role-2", name: "Finance Officer" },
  { id: "role-3", name: "Director" },
  { id: "role-4", name: "Procurement Officer" },
];

const REQ_ID = "aaaaaaaa-0000-0000-0000-000000000001";
const IR_ID  = "aaaaaaaa-0000-0000-0000-000000000002";
const NEW_ID = "bbbbbbbb-0000-0000-0000-000000000099";

const MOCK_TEMPLATES = [
  {
    id: REQ_ID,
    workflowType: 1,
    name: "Requisitions Workflow",
    isActive: true,
    steps: [
      { id: "s1", stepOrder: 1, stepName: "Line Manager", roleId: "role-1", roleName: "Manager" },
    ],
  },
  {
    id: IR_ID,
    workflowType: 2,
    name: "Item Requests Workflow",
    isActive: true,
    steps: [],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Stub every network call the page makes. Must be called before page.goto(). */
async function stubAll(page: Page) {
  await page.route("**/api/auth/session**", (r) => r.fulfill({ json: MOCK_SESSION }));
  await page.route("**/api/auth/**",         (r) => r.fulfill({ json: MOCK_SESSION }));
  await page.route("**/api/v1/menus/**",     (r) => r.fulfill({ json: { isSuccess: true, content: [] } }));
  await page.route("**/api/v1/workflows",    (r: Route) => {
    if (r.request().method() === "POST") {
      return r.fulfill({
        json: { isSuccess: true, content: { id: NEW_ID, workflowType: 2, name: "Item Requests Workflow", isActive: true, steps: [] } },
      });
    }
    return r.fulfill({ json: { isSuccess: true, content: MOCK_TEMPLATES } });
  });
  await page.route("**/api/v1/workflows/*/steps", (r) => r.fulfill({ status: 204, body: "" }));
  await page.route("**/api/v1/roles/names",       (r) => r.fulfill({ json: { isSuccess: true, content: MOCK_ROLES } }));
  await page.route("**/api/v1/dashboardsummaries",(r) => r.fulfill({ json: { isSuccess: true, content: {} } }));
  await page.route("**/api/v1/notifications**",   (r) => r.fulfill({ json: { isSuccess: true, content: [] } }));
  await page.route("**/api/v1/activities**",      (r) => r.fulfill({ json: { isSuccess: true, content: [] } }));
}

/**
 * Navigate to the approval-workflows page and wait for the card data to be
 * visible.  Tests that need the drawer must call openDrawer() afterwards.
 */
async function loadPage(page: Page) {
  await stubAll(page);
  await page.goto("/approval-workflows");
  // Both card headings appear once templates have loaded and auth has resolved.
  await expect(page.getByRole("heading", { name: "Requisitions" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Item Requests" })).toBeVisible({ timeout: 10_000 });
}

/**
 * Open the Requisitions workflow drawer by navigating directly to the URL with
 * the `workflow_drawer` query param.
 *
 * We use page.goto() rather than clicking the "Edit Steps" button because
 * clicking that button calls Next.js router.push(), which triggers an RSC
 * re-render.  During that reconciliation, Ark UI's Portal invokes flushSync()
 * and loses the ChakraProvider context in dev mode — causing a crash.
 * A full page.goto() avoids the RSC re-render path entirely.
 *
 * The page's drawerTemplateId uses the urlDrawerId fallback so the key is set
 * immediately from the URL.  The effectiveTemplate lookup ensures initialSteps
 * are populated once templates load.  The WorkflowStepsDrawerInner useEffect
 * resets steps whenever they become available while the drawer is open.
 */
async function openDrawer(page: Page) {
  // Route stubs are still active from loadPage(); just navigate to the drawer URL.
  await page.goto(`/approval-workflows?workflow_drawer=${REQ_ID}`);
  // Wait for the DRAWER TITLE to appear.
  //
  // IMPORTANT: do NOT wait for background card headings like "Requisitions" here.
  // When the drawer is open, Ark UI (Chakra UI v3) marks all background content as
  // `inert` for its focus-trap / a11y.  Playwright's isVisible() returns false for
  // `inert` elements, so any assertion on a background heading will time out even
  // though the element is in the DOM and rendered.
  await expect(page.getByText("Edit Workflow Steps")).toBeVisible({ timeout: 30_000 });
  // Also wait for the pre-loaded Requisitions step to appear.  Templates are fetched
  // asynchronously; the drawer opens from the URL param before the API call resolves.
  // Tests that count / interact with existing step rows must wait for data to arrive.
  await expect(page.locator('input[placeholder="Step name"]').first()).toBeVisible({ timeout: 15_000 });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe("Approval Workflows page", () => {
  test.setTimeout(90_000);

  // ── Page rendering ──────────────────────────────────────────────────────────

  test("renders the page heading", async ({ page }) => {
    await loadPage(page);
    await expect(page.getByRole("heading", { name: "Approval Workflows" })).toBeVisible();
  });

  test("renders Requisitions and Item Requests cards", async ({ page }) => {
    await loadPage(page);
    await expect(page.getByRole("heading", { name: "Requisitions" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Item Requests" })).toBeVisible();
  });

  test("existing step shown on Requisitions card", async ({ page }) => {
    await loadPage(page);
    await expect(page.getByText("Line Manager")).toBeVisible();
  });

  test("Item Requests card shows 'No steps configured'", async ({ page }) => {
    await loadPage(page);
    await expect(page.getByText("No steps configured")).toBeVisible();
  });

  // ── Drawer ──────────────────────────────────────────────────────────────────

  test("navigating to drawer URL opens the drawer", async ({ page }) => {
    await loadPage(page);
    await openDrawer(page);
    await expect(page.getByText("Drag steps to reorder")).toBeVisible();
  });

  // ── Role dropdown ───────────────────────────────────────────────────────────

  test("role dropdown is populated from the /roles/names API — THE BUG FIX", async ({ page }) => {
    await loadPage(page);
    await openDrawer(page);

    // Add a fresh step to get a new role dropdown in blank state
    await page.getByRole("button", { name: /add step/i }).click();

    const roleSelect = page.locator("select").last();
    await expect(roleSelect).toBeVisible();

    for (const role of MOCK_ROLES) {
      await expect(
        roleSelect.locator(`option[value="${role.id}"]`)
      ).toHaveText(role.name);
    }
  });

  test("role dropdown has a 'Select role...' placeholder", async ({ page }) => {
    await loadPage(page);
    await openDrawer(page);
    await page.getByRole("button", { name: /add step/i }).click();

    const roleSelect = page.locator("select").last();
    await expect(roleSelect.locator('option[value=""]')).toHaveText("Select role...");
  });

  // ── Step management ─────────────────────────────────────────────────────────

  test("Add Step appends a name-input and role-select row", async ({ page }) => {
    await loadPage(page);
    await openDrawer(page);

    const selectsBefore = await page.locator("select").count();
    await page.getByRole("button", { name: /add step/i }).click();

    await expect(page.locator("select")).toHaveCount(selectsBefore + 1);
    await expect(page.locator('input[placeholder="Step name"]').last()).toBeVisible();
  });

  test("drag handle is visible on each step row", async ({ page }) => {
    await loadPage(page);
    await openDrawer(page);
    // The Requisitions drawer opens with the pre-loaded "Line Manager" step.
    // The Grip icon wrapper div has cursor-grab styling.
    await expect(page.locator(".cursor-grab").first()).toBeVisible();
  });

  test("removing a step decreases the row count", async ({ page }) => {
    await loadPage(page);
    await openDrawer(page);

    await page.getByRole("button", { name: /add step/i }).click();
    await page.getByRole("button", { name: /add step/i }).click();

    const before = await page.getByTitle("Remove step").count();
    await page.getByTitle("Remove step").last().click();
    await expect(page.getByTitle("Remove step")).toHaveCount(before - 1);
  });

  // ── Validation ──────────────────────────────────────────────────────────────

  test("save is blocked when a step name is empty", async ({ page }) => {
    await loadPage(page);
    await openDrawer(page);

    await page.getByRole("button", { name: /add step/i }).click();
    await page.locator("select").last().selectOption("role-1");
    await page.getByRole("button", { name: /save steps/i }).click();

    await expect(page.getByText("All steps must have a name.")).toBeVisible();
  });

  test("save is blocked when no role is selected", async ({ page }) => {
    await loadPage(page);
    await openDrawer(page);

    await page.getByRole("button", { name: /add step/i }).click();
    await page.locator('input[placeholder="Step name"]').last().fill("Review Step");
    await page.getByRole("button", { name: /save steps/i }).click();

    await expect(page.getByText("All steps must have a role assigned.")).toBeVisible();
  });

  test("save is blocked when there are zero steps", async ({ page }) => {
    await loadPage(page);
    await openDrawer(page);

    // Remove the pre-loaded "Line Manager" step that comes with the REQ template
    await page.getByTitle("Remove step").first().click();
    await page.getByRole("button", { name: /save steps/i }).click();

    await expect(page.getByText("At least one step is required.")).toBeVisible();
  });

  // ── Saving ──────────────────────────────────────────────────────────────────

  test("saving an EXISTING template calls PUT /workflows/:id/steps with the correct ID", async ({ page }) => {
    let capturedUrl = "";

    await stubAll(page);
    // Override the steps route to capture the URL
    await page.route("**/api/v1/workflows/*/steps", async (r) => {
      capturedUrl = r.request().url();
      await r.fulfill({ status: 204, body: "" });
    });

    // Navigate directly to the REQ drawer URL (avoids RSC re-render crash).
    // Wait only for the drawer title — background headings are `inert` while the
    // drawer is open (Ark UI focus-trap), so Playwright.isVisible() returns false on them.
    await page.goto(`/approval-workflows?workflow_drawer=${REQ_ID}`);
    await expect(page.getByText("Edit Workflow Steps")).toBeVisible({ timeout: 30_000 });

    // The drawer opens with the pre-loaded "Line Manager" step; ensure it is complete
    await page.locator('input[placeholder="Step name"]').first().fill("Line Manager");
    await page.locator("select").first().selectOption("role-1");

    await page.getByRole("button", { name: /save steps/i }).click();

    await expect.poll(() => capturedUrl, { timeout: 10_000 }).toContain(REQ_ID);
  });

  test("saving a template calls PUT /workflows/:id/steps with the IR id", async ({ page }) => {
    let upsertUrl = "";

    await stubAll(page);
    // Override upsert route to capture URL
    await page.route("**/api/v1/workflows/*/steps", async (r) => {
      upsertUrl = r.request().url();
      await r.fulfill({ status: 204, body: "" });
    });

    // Navigate directly to the IR drawer URL (avoids RSC re-render crash).
    // Wait only for the drawer title — background headings are `inert` while the
    // drawer is open (Ark UI focus-trap), so Playwright.isVisible() returns false on them.
    await page.goto(`/approval-workflows?workflow_drawer=${IR_ID}`);
    await expect(page.getByText("Edit Workflow Steps")).toBeVisible({ timeout: 30_000 });

    // IR template has no steps; add one to trigger the upsert flow
    await page.getByRole("button", { name: /add step/i }).click();
    await page.locator('input[placeholder="Step name"]').last().fill("Supervisor Review");
    await page.locator("select").last().selectOption("role-1");

    await page.getByRole("button", { name: /save steps/i }).click();

    // IR template has a real GUID in MOCK_TEMPLATES so the drawer uses it directly
    await expect.poll(() => upsertUrl, { timeout: 10_000 }).toContain(IR_ID);
  });
});
