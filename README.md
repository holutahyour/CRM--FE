# CRM / IMS — Frontend

Web app for **Eupepsia Place Ltd / Soilless Farm Lab**: requisitions and approvals, inventory,
operations (facility, processing, logistics), the poultry sales department, departments, incidents,
monthly goals, and administration.

- **Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind, Chakra UI v3 + Radix/shadcn.
- **Sign-in:** Microsoft Entra ID (Azure AD) through next-auth.
- **Backend:** ASP.NET Core API in the sibling repo [`CRM---BE`](../CRM---BE/README.md). This README
  describes what the app does. The backend README covers the API, its rules, and data seeding.

> This document describes behaviour **as the code implements it** (checked on 2026-09-29), including
> pages that are incomplete. Look for the ⚠️ markers and the [Known gaps](#known-gaps) section before
> relying on a feature.

---

## Contents

1. [Running the app](#running-the-app)
2. [How the app works](#how-the-app-works)
3. [Page status at a glance](#page-status-at-a-glance)
4. [Pages](#pages): Dashboard · Requisitions · Item Requests · Approval Workflows · Inventory ·
   Monthly Reports · Incident Reports · Departments · Operations · Sales · Administration ·
   Power BI reports · Configurations · Parameters · Notifications
5. [Known gaps](#known-gaps)
6. [Testing](#testing)
7. [Further documentation](#further-documentation)

---

## Running the app

The package manager is **pnpm**.

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm build
pnpm lint
pnpm test         # Jest unit tests
npx playwright test   # E2E tests (starts the dev server; all API calls are stubbed)
```

`.env.local`:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend base URL, e.g. `https://…/api/v1` |
| `AZURE_AD_CLIENT_ID`, `AZURE_AD_CLIENT_SECRET`, `AZURE_AD_TENANT_ID` | Entra app registration |
| `AZURE_SCOPE` | Extra OAuth scope for the API (added to `openid profile email offline_access`) |
| `AUTH_SECRET` | next-auth secret |
| `NEXT_PUBLIC_DISABLE_MOCK_DATA` | `true` = talk to the API. Anything else = **mock mode** (see below) |

`next.config` sets `typescript.ignoreBuildErrors` and `eslint.ignoreDuringBuilds`, so a build succeeds
even when type checks fail. Run `npx tsc --noEmit` yourself; it currently reports errors in the
Configurations pages and `ApiHandler.ts` (see [Known gaps](#known-gaps)).

---

## How the app works

### Sign-in and first login

- `/auth/sign-in` has one button, **Login with Microsoft Account**. After sign-in you land on `/`,
  which redirects to `/dashboard`.
- Every page under `src/app/(main)` requires a session. With no session you're sent to
  `/auth/sign-in`. If a token refresh fails, you're signed out and sent back there.
- On your first API call, the backend creates your user record from your Entra account. You start
  as **Not Onboarded** with no roles, unless:
  - you're the very first user in the database, who is made **ADMIN**; or
  - your email is listed in the backend's `Auth:SuperAdminEmails`, which grants **SUPER_ADMIN**.

  An administrator onboards everyone else from Administration → Users.

### Sidebar navigation

The sidebar is not hard-coded. It comes from `GET /menus/my-menus`, which returns only menu items:

1. that belong to a module your tenant has enabled (Administration → Modules), **and**
2. that need no permission, or need one your roles grant. **ADMIN** sees every item.

The seeded menu (in order): Dashboard, Requisitions, Item Requests, Monthly Reports (twice; see
gaps), Inventory → Items / Categories, Incident Reports, User Management, Departments, Operations,
Administration → Roles & Permissions / Modules / Audit Logs / Menu Management, Approval Workflows,
Sales.

Pages that exist but have **no menu entry** can only be reached by URL:
- `/admin` (the Administration hub);
- the Power BI reports;
- `/configurations`, `/parameters` and `/notifications`.

### Header

- **Breadcrumbs** are built from the URL (`Home / Inventory / Items`).
- **User menu:** shows your name, email and roles; lets you switch the *active role* shown in the
  UI; and has **Log out**.
- A notification bell connects to the backend's SignalR hub `/hubs/notification`.

### Mock mode vs live mode

Every data page checks `NEXT_PUBLIC_DISABLE_MOCK_DATA`:

- **Mock mode** (the variable is unset or not `"true"`): pages show bundled sample data, and saves
  stay in the browser until you refresh. Use this for UI work without a backend.
- **Live mode** (`"true"`): pages read from and write to the API. This is how dev and Docker run.

### Shared conventions

- **Drawers and modals are URL-driven.** Opening one adds a query parameter, e.g.
  `?batch_modal=true` to add or `?batch_modal=<id>` to edit, so it can be linked to and survives a
  refresh. Tabs work the same way (`?tab=processing&sub=yield-log`).
- **Failed saves** (POST, PUT, DELETE) show a toast automatically from the Axios interceptor. Newer
  pages (Sales, Operations → Processing) also show the reason inside the form.
- **Numbers and money:** money displays as Naira (₦); dates as `YYYY-MM-DD`.

---

## Page status at a glance

"Live" means the page works end-to-end against the current backend.

| Page | Route | In sidebar | Live | Notes |
|---|---|---|---|---|
| Dashboard | `/dashboard` | ✅ | ⚠️ partly | Low-stock count and monthly-goal % are hard-coded on the backend |
| Requisitions | `/requisitions` | ✅ | ✅ | Multi-step approvals |
| Item Requests | `/item-requests` | ✅ | ✅ | Approving doesn't deduct stock |
| Approval Workflows | `/approval-workflows` | ✅ | ✅ | |
| Inventory → Items | `/inventory/items` | ✅ | ✅ | |
| Inventory → Categories | `/inventory/categories` | ✅ | ❌ | No page (404) |
| Monthly Reports | `/monthly-reports` | ✅ | ✅ | |
| Incident Reports | `/incident-reports` | ✅ | ✅ | |
| Departments | `/departments` | ✅ | ⚠️ | Add works; **edit fails** (URL mismatch) |
| Operations → Facility | `/operations?tab=facility-management` | ✅ | ❌ | No backend; mock only |
| Operations → Processing | `/operations?tab=processing` | ✅ | ✅ | Machine Usage Logs sub-tab is mock only |
| Operations → Logistics | `/operations?tab=logistics` | ✅ | ❌ | No backend; mock only |
| Sales | `/sales` | ✅ | ✅ | |
| Administration hub | `/admin` | ❌ (URL only) | ⚠️ | Users tab partly (see below) |
| Admin sidebar links | `/admin/roles`, `/admin/modules`, `/admin/audit`, `/admin/menus` | ✅ | ❌ | No such pages (404); use `/admin?tab=…` |
| User Management | `/admin/users` | ✅ | ⚠️ | Activate/deactivate toggle and unauthorised-activity log have no backend |
| Power BI reports | `/reports/*` | ❌ | ❌ | `/api/reports/<key>` route doesn't exist |
| Configurations | `/configurations` | ❌ | ❌ | Calls API methods that don't exist |
| Parameters (ERP settings) | `/parameters` | ❌ | ❌ | No backend |
| Notifications | `/notifications` | ❌ | ❌ | No backend |

---

## Pages

### Dashboard — `/dashboard`

- **"Welcome back, <your name>".**
- **Six stat cards:**
  - Pending Requisitions, Approved Requisitions, Item Requests (pending) and Open Incidents are
    counted by the backend.
  - ⚠️ **Low Stock (always 5) and Monthly Goals (always 85%) are hard-coded on the backend.**
- **Recent Activity:** the latest 5 activities.
- **Low Stock:** up to 5 items whose on-hand quantity is at or below their minimum stock level.
- The three requests load in parallel, so one failing doesn't blank the others.

### Requisitions — `/requisitions`

Requests for money from a department to finance.

- **List:**
  - status tabs (All / Pending / Approved / Rejected);
  - search by title (on the current page only);
  - 10/20/50/100 rows per page, with server-side paging.
- **New Requisition:**
  - Title and department are required; amount and description are optional.
  - You can attach one PDF or image, up to 10 MB.
  - A new requisition starts as **Pending**.
- **Each card shows:**
  - status, department, submitter, date, amount, description and the attachment link;
  - the approval chain as a stepper, the approval history, and the rejection reason if rejected.
- **Approve / Reject:**
  - Both buttons appear only while the requisition is Pending. Reject needs a reason.
  - Approval follows the configured [workflow](#approval-workflows--approval-workflows): approving
    moves the request to the next step, and it becomes **Approved** only after the final step.
  - The approver must hold the step's role, or be the user pinned to that step. Otherwise the API
    refuses.

### Item Requests — `/item-requests`

Requests for stock items to the inventory officer. It works like Requisitions, with these
differences:

- **New Request:**
  - item (a searchable picker, or free text), department, quantity (at least 1) and purpose, all
    required;
  - no file upload.
- ⚠️ **Approving does not deduct stock** from inventory. The deduction was lost when approvals moved
  to the workflow engine.

### Approval Workflows — `/approval-workflows`

Defines who approves what.

- There are two chains: **Requisitions** and **Item Requests**. Each card previews its steps in
  order.
- **Edit Steps** opens a drawer where you can:
  - add, remove and rename steps;
  - drag to reorder them;
  - pick the role that approves each step.
- Every step needs a name and a role, and a chain needs at least one step. If no template exists
  yet, saving creates it.
- The backend seed creates both chains as **Manager → Admin**.

### Inventory — `/inventory/items`

- **Table:**
  - columns: Item, Category, Current Stock, Min Stock, Status, Location, Last Updated;
  - search by name or category;
  - 10/25/50/100 rows per page.
- **Status:** **Low Stock** when current stock ≤ minimum, otherwise **Adequate**. A red banner
  lists every low-stock item.
- **Add Item:**
  - Name, SKU and unit type are required.
  - Category, vendor and location are searchable pickers that can create a new entry inline.
  - Picking a location reveals a "specific spot" field.
  - The initial stock you enter becomes the on-hand quantity.
- **Update:** opens the item and edits it in place.
- **Import:**
  - Upload an `.xlsx`; the first sheet is read.
  - Column headers are matched loosely: Name/Item, SKU/Code, Unit, Category (matched to an existing
    category by name), Quantity, Cost and Price.
  - Rows without a name are skipped, and a missing SKU is generated (`IMP-…`).
  - The upload is previewed before you import.
- Stock-card movements recorded in [Operations → Processing → Material Stock](#processing) change
  the same on-hand figures you see here.

### Monthly Reports — `/monthly-reports`

Goal tracking per department.

- **Chart:** a bar chart of the average achievement per department.
- **Filters:**
  - year and month (sent to the API);
  - status tabs, applied in the browser: **Exceeded** ≥ 100%, **On Track** 80–99%,
    **At Risk** 50–79%;
  - search by goal title.
- **Cards:** achieved / target, a progress bar capped at 100%, and a status of Exceeded, On Track,
  At Risk or Behind (< 50%).
- **New Report:** goal title, month and year are required; target and achieved must be ≥ 0; the
  department is optional.

### Incident Reports — `/incident-reports`

Device and equipment faults.

- **Counts:** Open, In Progress, Resolved and Critical.
- **Filters:** status tabs, plus search over device name, device code and description.
- **Report Incident:**
  - device name, device code, severity (low / medium / high / critical), a description of at least
    5 characters, department and date are all required;
  - a new incident starts **Open**.
- **Lifecycle:**
  - Open → **Start Work** → In Progress → **Mark as Resolved**, which needs a resolution note.
  - The buttons only offer the next step. The backend itself doesn't enforce the order.

### Departments — `/departments`

- **Stat cards:** Total Departments, Staff, Active Projects and Total Budget (₦, shortened as K or
  M).
- **Grid:** a card per department; search by name or head.
- **Add:** name, and a code of up to 10 characters (uppercased), are required. Head, description
  and budget are optional.
- ⚠️ **Edit (click a card) fails against the live API.** The page sends `PUT /departments/{id}`,
  but the backend expects `PUT /departments?id=…`.

### Operations — `/operations`

Three top-level tabs.

#### Facility Management ⚠️ mock only

- **Counters:** Greenhouses, Generators, Staff Accommodation and Shortlet Accommodation, each
  editable.
- **Greenhouses by cohort:** the greenhouse count for each cohort, editable.
- **Staff blocks and office buildings:** total / allocated / unallocated per block or building,
  editable.
- **There is no backend for this tab.** In live mode it loads empty and edits aren't saved.

#### Processing

Captures the **Batch Production Scheduling** workbook: one sub-tab per sheet. The design is in
`docs/superpowers/specs/2026-09-28-operations-processing-design.md`.

| Sub-tab | Workbook sheet | Behaviour |
|---|---|---|
| **Batch Scheduling** (default) | Batch Production Schedule | Production jobs: batch ID, customer, products (one per line), product code, quantity + unit, start/end, lead time, work centre(s), operator(s), status, quality checks, dispatch (date sent, qty sent, logistics person, delivery status, on-time %). Add / edit / delete. You can optionally link a batch to an order request and to a product. |
| **Order Requests** | Order Request Sheet | Customer requests: request date, customer ID and name, products, activities required, volume, delivery date and location, batch number, status, start/due date, duration. Add / edit / delete. |
| **Yield Log** | Processing Activities (+ 2026) | One row per processing run: date, produce, shift, input (quantity + unit, or weighed kg), then cut, dehydrated, grind, second-grind and waste weights, each optional. **Yield %** is the last recorded stage ÷ input; **Waste %** is waste ÷ input. Both show "—" when the input wasn't weighed in kg. You can filter by produce and optionally link a run to a batch. |
| **Material Stock** | Raw Materials (Warehouse/Cold Room), Raw Materials (Packaging Store), Other Materials, 2026 Raw Materials | Materials grouped as *Raw Produce*, *Ingredients* and *Packaging & Supplies*, with search. Clicking a material opens its **stock card**: date, opening, received, issued, closing and where required, plus **Receive** and **Issue**. |
| **Products** | Product Identification + Product Duration | Product name, product code (e.g. `SFL/002/GIG2/A10/0525/01`), UPC, SKU, raw-material ID and processing duration. Add / edit / delete. |
| **Machine Usage Logs** ⚠️ mock only | — | Machine, operator, times, hours, output and downtime. There is no backend yet. |

Rules that apply across Processing:

- **Statuses:** order requests and batches use the workbook's seven statuses: Not Started,
  In Progress, Complete, On Hold, Overdue, Needs Review and Needs Update.
- **Checked in the form:**
  - required fields (batch product names; order request date, customer and products; yield date
    and produce; product name);
  - numbers must be ≥ 0, and on-time delivery ≤ 100;
  - end/due dates must not be before start dates.
- **Checked by the backend**, with its reason shown in the form:
  - links must point to existing records;
  - product names must be unique.
- **Stock:**
  - Stock cards use the **Inventory** records, so Material Stock and Inventory always show the same
    figure.
  - A movement is recorded with the date you enter.
  - Issuing more than is on hand is refused.
  - A new card's opening balance includes any stock the item already had.
- **Reference data:** the product list and the ~120 materials come from the workbook through the
  backend seed. The workbook's historical rows were deliberately **not** imported.

#### Logistics ⚠️ mock only

- **Vehicle Tracking Logs:** vehicle, driver, destination, times, distance, purpose and status.
- **Vehicle Refuelling Logs:** vehicle, fuel type, litres, unit cost, total cost (calculated),
  odometer and station.
- **There is no backend for this tab.** In live mode it loads empty and saves fail.

### Sales — `/sales`

EPL Poultry. Five tabs; records are added and deleted (there's no editing).

- **Daily Production:**
  - opening birds, morning eggs, total eggs and crates, cracked, bad and small eggs;
  - **Total Loss** = cracked + bad;
  - **Good Eggs** = total − losses − small;
  - losses plus small eggs can't exceed the day's total.
- **Sales:**
  - date, customer, crates, price per crate, amount paid, payment mode (Cash / Transfer / POS /
    Cheque / Credit) and remarks;
  - **Total** = crates × price; **Balance** = total − paid, shown red when money is owed;
  - the amount paid can't exceed the total.
- **Feed Cost:**
  - date, feed type, bags and cost per bag;
  - **Total** = bags × cost.
- **Stock:**
  - opening eggs/crates, produced, sold, loss;
  - **Closing** = opening + produced − sold − loss, and it can't go negative;
  - crates are counted at **28 eggs**.
- **Dashboard:**
  - totals: eggs produced, sales revenue (with the amount paid), feed cost and losses;
  - charts: production breakdown, sales performance, and feed cost by type;
  - a summary panel, where closing stock comes from the latest-dated stock record.
- **Save errors:** a save the API refuses keeps the form open. Because axios throws on HTTP 400, the
  form shows a generic message rather than the API's reason.

### Administration — `/admin`

Tabs: **Users · Roles & Permissions · Menus · Modules · Audit Logs**. The Users tab is also served
at `/admin/users`.

- **Users:**
  - **Stats:** total, onboarded, not onboarded, and unauthorised actions.
  - **Onboarding:** an orange banner lists users awaiting onboarding, each with an **Onboard**
    button.
  - **Table:** Name, Email, Department, Role, Access Level, Status; filter by onboarding state and
    search by name or email.
  - **Edit** (pencil icon):
    - set roles (at least one), department and access level (1–5);
    - name and email come from Entra and are read-only.
  - **Users can't be created here**; they appear when they first sign in.
  - ⚠️ These have no backend endpoint, so they fail in live mode:
    - the **activate/deactivate toggle**;
    - the **unauthorised activity** log.
  - ⚠️ **Import Users** only previews a spreadsheet. Import itself is disabled because the source
    staff list has no emails or Entra IDs.
- **Roles & Permissions:**
  - **List:** every role with its permission count and active/inactive status.
  - **New Role:** name and code (e.g. `WAREHOUSE_MANAGER`), then tick permissions, which are
    grouped by module.
  - **Editing:** a role's code is fixed once created.
  - **System roles:** read-only and can't be deleted. This is enforced in the UI only.
- **Menus:** a read-only tree of the menu, showing each item's route, icon and how many permissions
  gate it.
- **Modules:** turn modules on or off **for your tenant**. Turning one off hides its menu items.
- **Audit Logs:**
  - **Contents:** every create, update and delete made through the API, recorded automatically.
  - **Filters:** entity, action, user and date range, 25 per page.
  - **Details:** click a row to see the old and new values as JSON.
  - **Export CSV** downloads the current filter's results.
  - **All tenants:** the button appears for admins, but the API honours it only for super-admins
    (the `admin.system.manage` permission). Everyone else stays scoped to their own tenant.

### Power BI reports — `/reports/billing-report`, `/reports/outstanding-balance`, `/reports/student-not-billed` ⚠️

- Each page embeds a Power BI report, fetching its embed configuration from `/api/reports/<key>`.
- **That Next.js API route doesn't exist**, so every report page shows an error.
- These pages come from an earlier school-management template.

### Configurations — `/configurations` ⚠️

- School set-up tabs: Campuses, Faculties, Departments and Academic Levels, each with an Excel
  import.
- **They call `apiHandler.campus`, `academicLevels` and similar, which don't exist**, so the tabs
  fail at runtime.
- These pages come from an earlier school-management template.

### Parameters — `/parameters` ⚠️

- An ERP Settings table with an edit drawer.
- **The backend has no ERP-settings endpoints.**

### Notifications — `/notifications` ⚠️

- An inbox table (newest first) with an Excel import, plus a SignalR live connection.
- **The backend has no notifications endpoints and no SignalR hub**, so the table loads empty and
  import fails.

---

## Known gaps

These are verified in the code, not guesses:

1. **Sidebar links to missing pages:**
   - `/inventory/categories`;
   - `/admin/roles`, `/admin/modules`, `/admin/audit` and `/admin/menus`. The real page is
     `/admin?tab=roles` and so on.
   - The seeded menu also has **two "Monthly Reports" entries**. One points to `/reports/monthly`,
     which doesn't exist, and appears only when the Reports module is enabled.
2. **Frontend calls with no backend endpoint:**
   - Operations → Facility and Logistics, and Processing → Machine Usage Logs;
   - `PUT /users/{id}/toggle-active` and `GET /users/unauthorized-logs`;
   - ERP settings and notifications;
   - `/api/reports/*`.
3. **Department edit:** URL mismatch; see [Departments](#departments--departments).
4. **Dashboard:** the Low Stock and Monthly Goals figures are hard-coded on the backend.
5. **Item-request approval** doesn't deduct stock.
6. **Configurations pages:** reference API namespaces that don't exist, and type-check errors are
   hidden by `ignoreBuildErrors`.
7. **Sales forms:** show a generic message instead of the API's reason when a save is refused.
8. **Backend security** (unauthenticated access to most endpoints): see the backend README.

---

## Testing

- **Unit tests:** Jest + React Testing Library.
  - `pnpm test` also picks up the Playwright specs in `e2e/`, which fail under Jest.
  - To run unit tests only: `npx jest --testPathIgnorePatterns e2e`.
  - Each page's tests live in `src/app/(main)/<page>/__tests__`.
- **Live-mode tests:** set `process.env.NEXT_PUBLIC_DISABLE_MOCK_DATA = 'true'` before requiring the
  page, and mock `@/data/api/ApiHandler`. See `SalesApiMode.test.tsx` and
  `ProcessingApiMode.test.tsx`.
- **E2E:** Playwright in `e2e/`, with every API and auth call stubbed. Patterns and pitfalls (Ark UI
  `inert` backdrops, opening drawers via `page.goto`) are in `CLAUDE.md`.

## Further documentation

| Document | Contents |
|---|---|
| `docs/FEATURES.md` | Test-level Given/When/Then catalogue for the pages that existed on 2026-06-20. It doesn't cover Administration tabs other than Users, Operations or Sales. |
| `docs/codebase_patterns.md` | Frontend code conventions |
| `docs/superpowers/specs/` | Design specs (Administration hub, Operations → Processing) |
| `CLAUDE.md` | Commands, architecture and test patterns for contributors |
| [`../CRM---BE/README.md`](../CRM---BE/README.md) | API, business rules, security, seeding |
