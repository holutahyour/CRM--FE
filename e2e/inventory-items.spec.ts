/**
 * E2E tests — Inventory / Items page  (/inventory/items)
 *
 * This is the template suite generated from the feature catalog
 * (`docs/FEATURES.md` → §4 Inventory — Items). Each `test` block cites the
 * catalog feature + scenario it verifies, so the catalog and the suite stay in
 * lock-step. Use this file as the pattern for the remaining pages.
 *
 * Strategy (mirrors e2e/approval-workflows.spec.ts):
 *  - All API/auth calls are intercepted with Playwright route stubs so the suite
 *    runs without a live backend or Azure AD account.
 *  - Drawers are URL-driven (`inv_drawer=true`, `inv_update_drawer=true&id=<id>`).
 *    We OPEN them with page.goto(<url>), never by clicking the button: clicking
 *    calls router.push(), which triggers a Next.js RSC re-render during which
 *    Ark UI's Portal calls flushSync() and loses the ChakraProvider context in
 *    dev mode — crashing the app. A full goto() avoids that path. (See CLAUDE.md.)
 *  - While a drawer is open, background content gets the HTML `inert` attribute
 *    (Ark UI focus-trap). Playwright's isVisible() returns false for inert nodes,
 *    so assert ONLY on content inside the drawer when one is open.
 *
 * DUAL-MODE ROBUSTNESS:
 *  The page uses `USE_MOCK = process.env.NEXT_PUBLIC_DISABLE_MOCK_DATA !== "true"`.
 *   - Mock mode ON (default when no .env): the list renders bundled
 *     MOCK_INVENTORY_ITEMS and ignores the /items GET stub.
 *   - Real-API mode (NEXT_PUBLIC_DISABLE_MOCK_DATA=true, as the approval-workflows
 *     suite assumes): the list calls /items and uses the stub.
 *  To pass either way, the /items stub below returns data that MIRRORS
 *  MOCK_INVENTORY_ITEMS (same names, same 5-low / 1-adequate split, 6 total).
 *  Drawer fetches (getById) and create (POST /items) are NOT mock-guarded, so
 *  those flows are testable in both modes.
 *
 * Covered (catalog §4):
 *   Item list & API mapping ......... renders rows, low-stock vs adequate styling
 *   Search / filter ................. filter by name, empty-state, item count
 *   Pagination ...................... rows-per-page default, range label, prev disabled
 *   Low-stock alerts banner ......... count + hidden when none
 *   Add item ........................ drawer opens, required-field validation, create POST
 *   Update item ..................... drawer opens + getById pre-load
 */

import { test, expect, type Page, type Route } from "@playwright/test";

// ─── Fixture data ─────────────────────────────────────────────────────────────

const MOCK_SESSION = {
  user: { name: "Test Admin", email: "admin@example.com", id: "user-1" },
  accessToken: "mock-token",
  expires: "2099-01-01T00:00:00.000Z",
};

/**
 * API-shaped items mirroring MOCK_INVENTORY_ITEMS so assertions hold in BOTH
 * mock mode and real-API mode. mapApiToFrontendItem reads: name, categoryName,
 * quantityOnHand, minStockLevel, unitType, locationName, lastModifiedOn/By.
 * Status is derived: quantityOnHand <= minStockLevel ⇒ "Low Stock".
 * 5 low-stock + 1 adequate (HDMI Cables) = 6 total.
 */
const API_ITEMS = [
  { id: "1", name: "A4 Paper",                 categoryName: "Office Supplies",  quantityOnHand: 15, minStockLevel: 50,  unitType: "reams", locationName: "Storage Room A" },
  { id: "2", name: "Toner Cartridge (Black)",  categoryName: "Printer Supplies", quantityOnHand: 3,  minStockLevel: 10,  unitType: "units", locationName: "Storage Room B" },
  { id: "3", name: "USB Flash Drives (32GB)",  categoryName: "IT Equipment",     quantityOnHand: 8,  minStockLevel: 20,  unitType: "units", locationName: "IT Storage" },
  { id: "4", name: "Notebooks",                categoryName: "Office Supplies",  quantityOnHand: 25, minStockLevel: 100, unitType: "units", locationName: "Storage Room A" },
  { id: "5", name: "Pens (Blue)",              categoryName: "Office Supplies",  quantityOnHand: 30, minStockLevel: 200, unitType: "units", locationName: "Storage Room A" },
  { id: "6", name: "HDMI Cables",              categoryName: "IT Equipment",     quantityOnHand: 45, minStockLevel: 30,  unitType: "units", locationName: "IT Storage" },
];

const LOW_STOCK_COUNT = API_ITEMS.filter((i) => i.quantityOnHand <= i.minStockLevel).length; // 5
const TOTAL_COUNT = API_ITEMS.length; // 6

// Route matchers for the BACKEND /items endpoints.
//
// The negative lookbehind `(?<!inventory)` is essential: without it the regex
// also matches the PAGE navigation URL `…/inventory/items`, so Playwright would
// fulfil the document request with the stub JSON and the app would never load.
// Anchoring to a bare `/items` segment (API base may be relative when
// NEXT_PUBLIC_API_URL is unset, or `…/api/v1/items` when set) covers both.
const ITEMS_LIST_RE = /(?<!inventory)\/items(\?.*)?$/;  // GET list, POST create, PUT update (?id=)
const ITEM_BY_ID_RE = /(?<!inventory)\/items\/[^/?]+$/; // GET /items/<id>

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Stub every network call the page makes. Must be called before page.goto(). */
async function stubAll(page: Page, opts: { onCreate?: (route: Route) => void } = {}) {
  // Auth + shell
  await page.route("**/api/auth/session**", (r) => r.fulfill({ json: MOCK_SESSION }));
  await page.route("**/api/auth/**",        (r) => r.fulfill({ json: MOCK_SESSION }));
  await page.route("**/menus/**",           (r) => r.fulfill({ json: { isSuccess: true, content: [] } }));

  // DynamicSelect lookups (only hit when those dropdowns open)
  await page.route("**/categories", (r) => r.fulfill({ json: { isSuccess: true, content: [{ id: "c1", name: "Office Supplies" }] } }));
  await page.route("**/vendors",    (r) => r.fulfill({ json: { isSuccess: true, content: [{ id: "v1", name: "Acme" }] } }));
  await page.route("**/locations",  (r) => r.fulfill({ json: { isSuccess: true, content: [{ id: "l1", name: "Storage Room A" }] } }));

  // GET /items/<id>  (update drawer pre-load — not mock-guarded)
  await page.route(ITEM_BY_ID_RE, (r) => {
    const id = r.request().url().split("/items/")[1].split(/[?#]/)[0];
    const item = API_ITEMS.find((i) => i.id === id) ?? API_ITEMS[0];
    return r.fulfill({ json: { isSuccess: true, content: { ...item, sku: `SKU-${id}` } } });
  });

  // GET /items (list)  ·  POST /items (create)  ·  PUT /items?id= (update)
  await page.route(ITEMS_LIST_RE, (r: Route) => {
    // Never hijack a document navigation (belt-and-suspenders with the regex).
    if (r.request().resourceType() === "document") return r.continue();
    const method = r.request().method();
    if (method === "POST") {
      opts.onCreate?.(r);
      return r.fulfill({
        json: { isSuccess: true, content: { id: "new-1", name: "Test Widget", categoryName: "IT Equipment", quantityOnHand: 5, minStockLevel: 2, unitType: "piece", locationName: "Storage Room A" } },
      });
    }
    if (method === "PUT") {
      return r.fulfill({ json: { isSuccess: true, content: { id: "1" } } });
    }
    return r.fulfill({ json: { isSuccess: true, content: API_ITEMS } });
  });
}

/** A cell in the items table. Item names also appear in the low-stock banner,
 *  so scope row assertions to the table to avoid strict-mode ambiguity. */
const tableCell = (page: Page, text: string) => page.getByRole("table").getByText(text);

/** Load the inventory page and wait for the table to be populated. */
async function loadPage(page: Page) {
  await stubAll(page);
  await page.goto("/inventory/items");
  await expect(page.getByRole("heading", { name: "Inventory Management" })).toBeVisible({ timeout: 30_000 });
  // Wait for at least one known row so subsequent assertions are stable.
  await expect(tableCell(page, "A4 Paper")).toBeVisible({ timeout: 15_000 });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe("Inventory / Items page", () => {
  test.setTimeout(90_000);

  // ── Item list & API mapping ──────────────────────────────────────────────────

  test("renders the page heading and a known item row", async ({ page }) => {
    // Catalog §4 · Item list & API mapping
    await loadPage(page);
    await expect(page.getByRole("heading", { name: "Inventory Management" })).toBeVisible();
    await expect(tableCell(page, "HDMI Cables")).toBeVisible();
  });

  test("low-stock item shows a 'Low Stock' status, adequate item shows 'Adequate'", async ({ page }) => {
    // Catalog §4 · status derived from quantityOnHand <= minStockLevel
    await loadPage(page);
    // Status pills render their label text uppercased via CSS but the text node is the label.
    await expect(page.getByText("Low Stock", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Adequate", { exact: true }).first()).toBeVisible();
  });

  // ── Search / filter ──────────────────────────────────────────────────────────

  test("item count line reflects the total", async ({ page }) => {
    // Catalog §4 · Search/filter · "N item(s) total"
    await loadPage(page);
    await expect(page.getByText(`${TOTAL_COUNT} items total`)).toBeVisible();
  });

  test("searching by name filters the table", async ({ page }) => {
    // Catalog §4 · Search/filter · filter by name (case-insensitive)
    await loadPage(page);
    await page.getByPlaceholder("Search by item name or category...").fill("A4");
    await expect(tableCell(page, "A4 Paper")).toBeVisible();
    await expect(tableCell(page, "HDMI Cables")).toHaveCount(0);
  });

  test("a search with no matches shows the empty state", async ({ page }) => {
    // Catalog §4 · Search/filter · empty-state message
    await loadPage(page);
    await page.getByPlaceholder("Search by item name or category...").fill("zzzzzzzz");
    await expect(page.getByText("No inventory items found")).toBeVisible();
    await expect(page.getByText("Try adjusting your search terms")).toBeVisible();
  });

  // ── Low-stock alerts banner ──────────────────────────────────────────────────

  test("low-stock banner shows the count of low-stock items", async ({ page }) => {
    // Catalog §4 · Low-stock alerts banner · count == number of Low Stock items
    await loadPage(page);
    await expect(page.getByText(`Low Stock Alerts (${LOW_STOCK_COUNT})`)).toBeVisible();
  });

  test("low-stock banner is hidden when a filter yields only adequate stock", async ({ page }) => {
    // Catalog §4 · Low-stock alerts banner · renders null when none low
    await loadPage(page);
    await page.getByPlaceholder("Search by item name or category...").fill("HDMI"); // only the Adequate item
    await expect(page.getByText(/Low Stock Alerts/)).toHaveCount(0);
  });

  // ── Pagination ───────────────────────────────────────────────────────────────

  test("pagination shows the rows-per-page selector and range label", async ({ page }) => {
    // Catalog §4 · Pagination · default page size 10, range "1–N of N"
    await loadPage(page);
    await expect(page.getByText("Rows per page:")).toBeVisible();
    await expect(page.getByText(`1–${TOTAL_COUNT} of ${TOTAL_COUNT}`)).toBeVisible();
  });

  test("first/prev pagination buttons are disabled on page one", async ({ page }) => {
    // Catalog §4 · Pagination · « and ‹ disabled on the first page
    await loadPage(page);
    await expect(page.getByRole("button", { name: "«" })).toBeDisabled();
  });

  // ── Add item ─────────────────────────────────────────────────────────────────

  test("navigating to the add-drawer URL opens the Add Item drawer", async ({ page }) => {
    // Catalog §4 · Add item · inv_drawer=true opens the drawer
    await stubAll(page);
    await page.goto("/inventory/items?inv_drawer=true");
    await expect(page.getByText("Add New Inventory Item")).toBeVisible({ timeout: 30_000 });
  });

  test("submitting the add form empty shows required-field validation", async ({ page }) => {
    // Catalog §4 · Add item · zod validation (name, sku required)
    await stubAll(page);
    await page.goto("/inventory/items?inv_drawer=true");
    await expect(page.getByText("Add New Inventory Item")).toBeVisible({ timeout: 30_000 });
    // Only one drawer is mounted/open, so the footer submit is the lone submit button.
    await page.locator('button[type="submit"]').click();
    await expect(page.getByText("Item name is required")).toBeVisible();
    await expect(page.getByText("SKU is required")).toBeVisible();
  });

  test("submitting a valid add form POSTs to /items", async ({ page }) => {
    // Catalog §4 · Add item · valid form calls items.create
    let createCalled = false;
    await stubAll(page, { onCreate: () => { createCalled = true; } });
    await page.goto("/inventory/items?inv_drawer=true");
    await expect(page.getByText("Add New Inventory Item")).toBeVisible({ timeout: 30_000 });

    // unitType defaults to "piece"; name + sku are the only required fields.
    await page.getByPlaceholder("e.g. A4 Paper").fill("Test Widget");
    await page.getByPlaceholder("e.g. SKU-12345").fill("SKU-TW-1");
    await page.locator('button[type="submit"]').click();

    await expect.poll(() => createCalled, { timeout: 10_000 }).toBe(true);
  });

  // ── Update item ──────────────────────────────────────────────────────────────

  test("navigating to the update-drawer URL opens it and pre-loads the item", async ({ page }) => {
    // Catalog §4 · Update item · getById pre-load
    let byIdUrl = "";
    await stubAll(page);
    await page.route(ITEM_BY_ID_RE, async (r) => {
      byIdUrl = r.request().url();
      await r.fulfill({ json: { isSuccess: true, content: { ...API_ITEMS[0], sku: "SKU-1" } } });
    });

    await page.goto("/inventory/items?id=1&inv_update_drawer=true");
    await expect(page.getByText("Update Inventory Item")).toBeVisible({ timeout: 30_000 });
    // The drawer fetched the item by its id.
    await expect.poll(() => byIdUrl, { timeout: 10_000 }).toContain("/items/1");
    // And pre-filled the name field from the response.
    await expect(page.getByPlaceholder("e.g. A4 Paper")).toHaveValue("A4 Paper");
  });
});
