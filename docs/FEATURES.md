# CRM / IMS — Feature Catalog

A developer-focused, testable catalog of every feature on every page of the frontend.
Each page section lists its route, key components/hooks, API endpoints, then enumerates
features as a summary + **Given/When/Then** scenarios + a **checklist** of smaller
assertions. Features are derived from the page source under `src/app`.

> **How to use this for testing:** each scenario maps to an E2E test (Playwright) and
> each checklist item to a unit or E2E assertion. See `CLAUDE.md` for the project's
> E2E/unit testing patterns (URL-driven drawers, Ark UI `inert` backdrop, mock-data flag).

## Table of Contents

1. [App Shell / Root Layout](#1-app-shell--root-layout)
2. [Sign-in](#2-sign-in)
3. [Dashboard](#3-dashboard)
4. [Inventory — Items](#4-inventory--items)
5. [Requisitions](#5-requisitions)
6. [Item Requests](#6-item-requests)
7. [Reports — Billing Report](#7-reports--billing-report)
8. [Reports — Outstanding Balance](#8-reports--outstanding-balance)
9. [Reports — Student Not Billed](#9-reports--student-not-billed)
10. [Monthly Reports](#10-monthly-reports)
11. [Incident Reports](#11-incident-reports)
12. [Admin — Users](#12-admin--users)
13. [Departments](#13-departments)
14. [Approval Workflows](#14-approval-workflows)
15. [Configurations](#15-configurations)
16. [Parameters](#16-parameters)
17. [Notifications](#17-notifications)

---

## 1. App Shell / Root Layout

- **Routes:** wraps all routes. `/` redirects to `/dashboard`.
- **Purpose:** Global chrome shared by every authenticated page — provider stack,
  auth guard, collapsible sidebar (runtime menu), breadcrumbs, and user nav.
- **Key components / hooks:**
  - `src/app/layout.tsx` (RootLayout) → `Providers` → `Suspense` + `Toaster` + `PageLayout`
  - `src/app/_components/page-layout.tsx` (auth guard, breadcrumbs, header, content frame)
  - `src/components/scdn-app-sidebar.tsx` (`AppSidebar`), `src/components/sdcn-nav-main.tsx` (`NavMain`)
  - `src/components/nav-user.tsx` (`NavUser` — role switcher + logout)
  - `src/context/auth-context.tsx` (`AzureAuthProvider`, `useAzureAuth`)
  - `src/context/roleSelection-context.tsx` (`useRoleSelection`)
  - `src/app/page.tsx` (root redirect), `src/app/loading.tsx`, `src/app/_components/app-loader.tsx`
- **API endpoints used:**
  - `GET /menus/my-menus` — runtime sidebar navigation (`apiHandler.menus.my_menus()`)
  - Azure AD / next-auth session endpoints (token injected into every Axios request)
- **Provider stack:** `ChakraProvider → SessionProvider → AzureAuthProvider → RoleSelectionProvider → ColorModeProvider`

### Features

**Root redirect** — visiting `/` sends the user to the dashboard.

Scenarios:
- Given an authenticated user When they navigate to `/` Then they are redirected to `/dashboard`.

Assertions:
- [ ] `GET /` issues a redirect to `/dashboard`.

---

**Authentication guard** — unauthenticated users are pushed to sign-in; expired refresh tokens force a full re-login.

Scenarios:
- Given no active session When the user opens any non-auth route Then they are redirected to `/auth/sign-in`.
- Given a session whose token refresh failed (`error === "RefreshAccessTokenError"`) When the layout resolves the session Then the user is signed out and redirected to `/auth/sign-in`.
- Given the user is already on `/auth/sign-in` or `/login` When there is no session Then no redirect loop occurs (they stay on the auth page).

Assertions:
- [ ] With no session, every `(main)` route redirects to `/auth/sign-in`.
- [ ] `RefreshAccessTokenError` triggers `signOut({ redirect: false })` then `router.replace('/auth/sign-in')`.
- [ ] Auth pages (`/auth/*`) render without the sidebar/header chrome.
- [ ] `useAzureAuth()` throws if used outside `AzureAuthProvider`.

---

**Loading / mount gating** — the app shows a loader until the client mounts and auth resolves.

Scenarios:
- Given the page is server-rendered and not yet mounted When the shell renders Then `AppLoader` is shown instead of page content.
- Given auth `isLoading` is true When the shell renders Then `AppLoader` is shown.

Assertions:
- [ ] Content (sidebar + main) renders only after `mounted === true` and `isLoading === false`.
- [ ] When `user` is null (post-loading) the shell renders nothing (redirect handles navigation).

---

**Runtime sidebar navigation** — the sidebar menu is fetched from the API, not hard-coded.

Scenarios:
- Given an authenticated user When the sidebar mounts Then it calls `GET /menus/my-menus` and renders the returned menu items.
- Given the menus request is in flight When the sidebar renders Then a spinner is shown.
- Given the menus request errors When the sidebar renders Then an "Error Loading Menus: …" message is shown.

Assertions:
- [ ] Sidebar items come from `apiHandler.menus.my_menus()` response `content`, not static data.
- [ ] Loading state shows the spinner; error state shows the red error text.
- [ ] Sidebar is collapsible to icon mode via `SidebarTrigger`.
- [ ] App logo renders in the sidebar header.

---

**Breadcrumbs** — path-derived breadcrumb trail with a Home root.

Scenarios:
- Given the user is on `/inventory/items` When the header renders Then breadcrumbs read Home / Inventory / Items, with the last segment shown as the current page (non-link, bold).
- Given a path segment contains hyphens (e.g. `approval-workflows`) When rendered Then it is shown capitalized with spaces ("Approval Workflows").

Assertions:
- [ ] First crumb "Home" links to `/dashboard`.
- [ ] Each non-last segment is a link to its cumulative path; the last segment is `BreadcrumbPage` (not a link).
- [ ] Segments are URL-decoded and `-` is replaced with spaces, then capitalized.

---

**User nav & role switching** — header dropdown shows the user, lists their roles, switches active role, and logs out.

Scenarios:
- Given an authenticated user When they open the user dropdown Then it shows their name, email, current `selectedRole`, and the list of available roles.
- Given multiple roles When the user clicks a role Then `selectRole(role)` updates the active role.
- Given the dropdown is open When the user clicks "Log out" Then `signOut()` is called (redirect to `/`).

Assertions:
- [ ] Avatar shows the user's image, falling back to initials via `getInitials(name)`.
- [ ] Each available role renders a clickable `DropdownMenuItem`.
- [ ] "Log out" calls `useAzureAuth().signOut()`.

---

**Global toasts & error handling** — mutating API errors surface as toasts automatically.

Scenarios:
- Given a POST/PUT/DELETE request fails When the Axios interceptor handles the response Then an error toast is shown without the page adding its own.

Assertions:
- [ ] `Toaster` is mounted once at the root.
- [ ] Page components do not add redundant error toasts for mutations (handled by interceptor).

---

**Tenant id persistence** — selected tenant id is mirrored to `localStorage`.

Scenarios:
- Given a tenant id is set When `setTenantId(id)` is called Then it is written to `localStorage["crm_tenant_id"]`.
- Given a saved tenant id When the provider mounts Then it is restored from `localStorage`.
- Given `setTenantId(null)` When called Then the `localStorage` key is removed.

Assertions:
- [ ] `crm_tenant_id` is persisted on set and cleared on null.
- [ ] Saved tenant id is rehydrated on mount.

---

## 2. Sign-in

- **Route:** `/auth/sign-in`
- **Purpose:** Single-action login screen using Microsoft Entra (Azure AD) via next-auth.
- **Key components / hooks:**
  - `src/app/auth/sign-in/page.tsx` (`SignInPage`)
  - `signIn` from `next-auth/react`, `AppLogo`, Chakra `Button`
- **API endpoints used:** next-auth Azure AD provider (`signIn("azure-ad")`); no app API calls.
- **Notes:** Rendered without the app sidebar/header (the shell bypasses chrome for `/auth/*`).

### Features

**Microsoft Entra login** — the sole action is a button that starts the Azure AD OAuth flow.

Scenarios:
- Given an unauthenticated user on `/auth/sign-in` When they click "Login with Microsoft Account" Then `signIn("azure-ad", { callbackUrl: "/" })` is invoked, starting the Azure AD redirect.
- Given a successful Azure AD login When the provider redirects back Then the user lands on `/` which redirects to `/dashboard`.

Assertions:
- [ ] The login button calls `signIn("azure-ad", { callbackUrl: "/" })`.
- [ ] The button shows a Microsoft icon and the label "Login with Microsoft Account".
- [ ] The button exposes a loading state (`loadingText="Loading"`).

---

**Static layout** — branding and marketing imagery, responsive two-column.

Scenarios:
- Given a wide (lg) viewport When the page renders Then a two-column layout shows the login form left and the `/assets/images/login.jpg` image right.
- Given a narrow viewport When the page renders Then the image column is hidden and only the form shows.

Assertions:
- [ ] App logo renders at the top of the form column.
- [ ] Heading "Login to your account" and subtitle "Login to your account using Microsoft Entra" are present.
- [ ] The image column is hidden below the `lg` breakpoint.

---

## 3. Dashboard

- **Route:** `/dashboard`
- **Purpose:** Landing overview — six summary stat cards plus recent activity and low-stock lists.
- **Key components / hooks:**
  - `src/app/(main)/dashboard/page.tsx` (`DashboardPage`)
  - `StatCard`, `RecentActivityList`, `LowStockList` (`src/components/dashboard/`)
  - `apiHandler.dashboard`
- **API endpoints used (all fetched in parallel on mount):**
  - `apiHandler.dashboard.getSummary()` — KPI counts
  - `apiHandler.dashboard.getActivities({ pageSize: 5, orderBy: "timestamp", orderDirection: "Desc" })`
  - `apiHandler.dashboard.getLowStockItems({ pageSize: 5 })`
- **Mock-data flag:** `USE_MOCK = process.env.NEXT_PUBLIC_DISABLE_MOCK_DATA !== "true"`. When mock mode is on, seeded stats/activity/low-stock render before/instead of API data.

### Features

**Summary stat cards** — six KPIs: Pending Requisitions, Approved Requisitions, Item Requests, Monthly Goals (%), Low Stock Items, Open Incidents.

Scenarios:
- Given the summary API returns a non-empty `content` array When the dashboard loads Then each card shows the mapped value (`pendingRequisitions`, `approvedRequisitions`, `itemRequests`, `monthlyGoalsAchieved`, `lowStock`, `openIncidents`).
- Given a summary field is missing When mapping Then the card value falls back to `0`.
- Given the summary request fails (`.catch(() => null)`) When the dashboard loads Then the previously set (mock or default) stats remain and no crash occurs.

Assertions:
- [ ] Exactly six stat cards render with their titles, subtitles, and icons/colors.
- [ ] "Monthly Goals" value is rendered as a percentage string (`${value}%`).
- [ ] Each card maps from its specific summary field with `|| 0` fallback.

---

**Recent activity list** — most recent activities with title, department, status, and time.

Scenarios:
- Given the activities API returns items When the dashboard loads Then each activity maps to `{ id, title (description), department (department.name || "General"), status (|| "pending"), createdAt (timestamp), icon }`.
- Given mock mode is ON and the API returns zero activities When loading Then the seeded mock activities remain (real empty result does not clear them).
- Given mock mode is OFF and the API returns no/failed activities When loading Then the list is set to empty.

Assertions:
- [ ] Activity `title` falls back to "Activity", `department` to "General", `status` to "pending".
- [ ] In real-data mode an empty/failed response yields an empty list.
- [ ] In mock mode an empty response preserves mock items.

---

**Low-stock list** — items needing restock with name, min required, and current quantity.

Scenarios:
- Given the low-stock API returns items When the dashboard loads Then each maps to `{ id, name, minRequired (minStockLevel || reorderQuantity || 10), currentQuantity (quantityOnHand || currentQuantity || 0) }`.
- Given mock mode is OFF and the request fails/empty When loading Then the low-stock list is emptied.

Assertions:
- [ ] `minRequired` resolves via `minStockLevel || reorderQuantity || 10`.
- [ ] `currentQuantity` resolves via `quantityOnHand || currentQuantity || 0`.
- [ ] Mock-mode empty response preserves seeded low-stock items.

---

**Resilient parallel load** — all three requests run together and individual failures are isolated.

Scenarios:
- Given any single dashboard request rejects When the others succeed Then the successful sections still render (each call has its own `.catch(() => null)`).
- Given an unexpected error in `fetchData` When it is caught Then it is logged and `loading` is set false in `finally`.

Assertions:
- [ ] The three requests are issued via `Promise.all`.
- [ ] `loading` is reset to false in the `finally` block regardless of outcome.

---

**Header greeting** — page heading "Dashboard" with a welcome line.

Assertions:
- [ ] Heading "Dashboard" renders.
- [ ] A "Welcome back, …" subtitle renders. *(Note: `userName` is currently hard-coded to "John Admin" — not yet wired to the auth session.)*

---

## 4. Inventory — Items

- **Route:** `/inventory/items`
- **Purpose:** Inventory management — list, search, paginate inventory items; add and update items; surface low-stock alerts.
- **Key components / hooks:**
  - `page.tsx` (`InventoryPage`)
  - `_components/`: `InventoryTable`, `LowStockAlerts`, `AddItemDrawer`, `UpdateItemDrawer`, `DynamicSelect`, `types.ts` (`InventoryItem`, `MOCK_INVENTORY_ITEMS`, `mapApiToFrontendItem`)
  - `useModifyQuery`, `useQuery`, `react-hook-form` + `zodResolver(createItemSchema)`
  - `apiHandler.items`, `apiHandler.categories`, `apiHandler.vendors`, `apiHandler.locations`
- **API endpoints used:**
  - `apiHandler.items.list(search?)`, `apiHandler.items.getById(id)`, `apiHandler.items.create(payload)`, `apiHandler.items.update(...)`
  - `categories.list/create`, `vendors.list/create`, `locations.list/create` (via `DynamicSelect`)
- **Drawer query keys:** `inv_drawer=true` (add), `inv_update_drawer=true` + `id=<itemId>` (update).
- **Mock-data flag:** `USE_MOCK`; in mock mode the table is seeded from `MOCK_INVENTORY_ITEMS`.

### Features

**Item list & API mapping** — fetches items and normalizes varied API shapes into `InventoryItem`.

Scenarios:
- Given mock mode is ON When the page loads Then `MOCK_INVENTORY_ITEMS` populate the table without an API call.
- Given mock mode is OFF and the API returns an array (or `{ isSuccess, content[] }`) When the page loads Then each row is mapped via `mapApiToFrontendItem`.
- Given the API returns an unrecognized shape When the page loads Then the list is set to empty.
- Given the API throws and mock mode is ON When loading Then it falls back to mock items.

Assertions:
- [ ] `status` is computed "Low Stock" when `quantityOnHand (?? initialStock ?? 0) <= minStockLevel`, else "Adequate".
- [ ] `currentStock` resolves via `quantityOnHand ?? initialStock ?? 0`; `unit` via `unitType || "piece"`.
- [ ] `lastUpdatedDate` formats `lastModifiedOn` to `YYYY-MM-DD`, defaulting to today; `lastUpdatedBy` defaults to "System".
- [ ] `loading` is cleared in `finally`.

---

**Search / filter** — client-side filter by item name or category; resets pagination.

Scenarios:
- Given items are loaded When the user types in the search box Then only items whose name OR category contains the query (case-insensitive) remain.
- Given the search term changes When filtering Then the current page resets to 1.
- Given a search yields no matches When rendered Then an empty state shows "No inventory items found" plus "Try adjusting your search terms".

Assertions:
- [ ] Filter matches against `name` and `categoryName || category`, lowercased.
- [ ] The item count line reads "N item(s) total" with correct pluralization.
- [ ] Changing the search resets `currentPage` to 1.

---

**Pagination** — page-size selector, range label, first/prev/next/last and numbered page pills with ellipses.

Scenarios:
- Given more items than the page size When rendered Then only the current page's slice (`(safePage-1)*pageSize … safePage*pageSize`) is shown.
- Given the user changes "Rows per page" When selecting a new size Then `pageSize` updates and the page resets to 1.
- Given the user is on page 1 When rendered Then the « and ‹ buttons are disabled; on the last page the › and » buttons are disabled.
- Given many pages When rendered Then page pills show first, last, and pages within 1 of the current, with "…" gaps.
- Given `currentPage` exceeds total pages (e.g. after filtering) When computing Then `safePage` clamps to `totalPages`.

Assertions:
- [ ] `PAGE_SIZE_OPTIONS = [10, 25, 50, 100]`; default page size is 10.
- [ ] Range label reads "{start}–{end} of {total}".
- [ ] `goToPage` clamps the target between 1 and `totalPages`.
- [ ] The active page pill is styled distinctly (green).

---

**Low-stock alerts banner** — red banner listing all currently low-stock items.

Scenarios:
- Given at least one filtered item has status "Low Stock" When rendered Then a banner shows "Low Stock Alerts (N)" with each item's name, category•location, current and min stock.
- Given no low-stock items When rendered Then the banner renders nothing (`null`).

Assertions:
- [ ] The banner count equals the number of "Low Stock" items in the current filtered set.
- [ ] Each row shows current `{stock} {unit}` and "Min: {minStock} {unit}".

---

**Inventory table** — columns and per-row Update action.

Scenarios:
- Given items on the current page When the table renders Then columns Item Name, Category, Current Stock, Min Stock, Status, Location, Last Updated, Actions are shown.
- Given an item has a specific spot (`itemLocation`) When rendered Then it appears under the location with a map-pin icon.
- Given the user clicks "Update" on a row When clicked Then the URL becomes `?id=<itemId>&inv_update_drawer=true` (opens the update drawer).

Assertions:
- [ ] Low-stock rows render Current Stock in red/bold; the Status pill is red for "Low Stock", green for "Adequate".
- [ ] The Update button calls `onUpdate(item)` → `router.push("?id=…&inv_update_drawer=true", { scroll: false })`.

---

**Add item** — drawer with validated form, dynamic selects, optimistic insert.

Scenarios:
- Given the user clicks "Add Item" When clicked Then the URL sets `inv_drawer=true` and the Add drawer opens.
- Given required fields are empty (name, sku, unitType) When the user submits Then zod validation errors render inline and no request is sent.
- Given a valid form When submitted Then `apiHandler.items.create(payload)` is called with `quantityOnHand = initialStock`.
- Given the create response includes an item with an id When successful Then it is mapped and prepended to the list; otherwise a locally-constructed item is prepended.
- Given a successful create When done Then the form resets, the drawer closes, and the list jumps to page 1.

Assertions:
- [ ] Required-field validation: `name` ("Item name is required"), `sku` ("SKU is required"), `unitType` ("Unit type … is required").
- [ ] Default values include `unitType: "piece"`, `minStockLevel: 10`, `batchTracked/expiryTracked: false`.
- [ ] "Specific Spot" (`itemLocation`) input only appears once a location is selected.
- [ ] Batch Tracked / Expiry Tracked checkboxes bind to the form.

---

**Update item** — drawer pre-loads an item by id, edits, and writes back.

Scenarios:
- Given the update drawer opens with `?id=<itemId>` When opened Then `apiHandler.items.getById(itemId)` is called and the form is reset with the item's values.
- Given a valid edit When submitted Then `apiHandler.items.update` is called and the row is replaced in the list, followed by a refetch.
- Given the drawer is closed When closed Then the form is reset.
- Given there is no `id` in the URL When submitting Then the submit is a no-op.

Assertions:
- [ ] Pre-load maps `sku || code`, `unitType || unit`, `quantityOnHand ?? currentStock`, `minStockLevel ?? minStock`.
- [ ] On success the parent replaces the matching item then calls `fetchData()`.

---

**DynamicSelect (create-on-the-fly)** — searchable async dropdown used for Category, Vendor, Location with inline create.

Scenarios:
- Given the dropdown is opened (or a value is preset) When rendered Then it lazily calls `apiConfig.list()` once and normalizes array / `items` / `content` / `data` shapes.
- Given the user types a term with no exact match When rendered Then a "Create <label> '<term>'" action appears.
- Given the user submits the inline create form with a name When saved Then `apiConfig.create({ name })` runs, the new item is appended and auto-selected.
- Given the user clicks outside the component When clicked Then the dropdown and create form close.
- Given an exact-name match exists When typing Then the create action is hidden.

Assertions:
- [ ] Selecting an option calls `onChange(id, name)` and closes the dropdown.
- [ ] Inline create requires a non-empty trimmed name.
- [ ] Selecting a Location also syncs the readable `location` string in the parent form.

---

## 5. Requisitions

- **Route:** `/requisitions`
- **Purpose:** Department requisitions to finance — list, filter, search, paginate; create (with file upload); approve/reject through a multi-step approval workflow with history.
- **Key components / hooks:**
  - `page.tsx` (`RequisitionsPage`)
  - `_components/`: `RequisitionCard`, `CreateRequisitionModal` (`CreateRequisitionForm`, a side drawer), `RejectModal`, `types.ts` (`Requisition`, `MOCK_REQUISITIONS`, `STATUS_BADGE`, `fmt`, `fmtDate`)
  - Shared: `ApprovalWorkflowStepper`, `ApprovalHistoryTimeline`, `RejectionReasonBanner`
  - `useQuery`, `useModifyQuery`, `react-hook-form` + `zodResolver(createRequisitionSchema)`, `react-dropzone`
  - `apiHandler.requisitions`, `apiHandler.departments`
- **API endpoints used:**
  - `requisitions.list({ status?, page, pageSize })`, `requisitions.approve(id)`, `requisitions.reject(id, reason)`
  - `requisitions.getApprovalHistory(id)`, `requisitions.createWithFile(formData)` (multipart)
  - `departments.list()` (create-form dropdown)
- **Drawer/modal:** `req_drawer=true` opens the create drawer; reject is a centered modal driven by local state.
- **Status codes:** `0 All`, `1 Pending`, `2 Approved`, `3 Rejected`.

### Features

**List with status filter, search & pagination** — server-paginated list filtered by status tab and locally searched by title.

Scenarios:
- Given mock mode is ON When a status filter is selected Then `MOCK_REQUISITIONS` are filtered locally by `status` (All = no filter).
- Given mock mode is OFF When the page loads Then `requisitions.list({ status, page, pageSize })` is called (status omitted for All) and the multiple response shapes (array / `content[]` / `content.items` / `content.data`) are normalized.
- Given a search term When typing Then cards are filtered client-side by `title` (case-insensitive).
- Given results exist When rendered Then a rows-per-page select (10/20/50/100) and a pager (shown only when `totalRecords > pageSize`) appear.
- Given the page size changes When selected Then pagination resets to page 0.
- Given no results When rendered Then an empty state "No requisitions found" is shown; while loading a spinner shows.

Assertions:
- [ ] `totalRecords` uses `metaData.total` when present, else the items length.
- [ ] Changing status filter or page triggers a refetch (deps: `activeFilter`, `pageIndex`, `pageSize`).
- [ ] Pager only renders when `totalRecords > pageSize`.

---

**Create requisition (with file upload)** — drawer form with validation, department dropdown, and optional drag-drop file.

Scenarios:
- Given the user clicks "New Requisition" When clicked Then `req_drawer=true` opens the drawer and `departments.list()` is fetched.
- Given required fields are missing When submitting Then zod errors render inline (title and department required) and no request fires.
- Given a valid form When submitted Then a `FormData` (title, amount, description?, departmentId, file?) is sent via `requisitions.createWithFile`.
- Given a created requisition returns When successful Then it is prepended to the list with status "Pending", the form and file reset, and the drawer closes.
- Given a file is dropped/selected When valid Then it must be PDF or image and ≤ 10 MB (single file); a chosen file can be removed via the X button.

Assertions:
- [ ] Dropzone accepts `application/pdf` and `image/*`, `maxFiles: 1`, `maxSize: 10MB`.
- [ ] File is held in `useState` (outside the zod schema) and appended to `FormData` only if present.
- [ ] Department select is disabled while departments load and defaults to "Select a department...".

---

**Approve** — approves a requisition, honoring multi-step workflows.

Scenarios:
- Given a pending requisition When "Approve" is clicked Then `requisitions.approve(id)` is called and the card shows a busy spinner.
- Given the approve response returns updated content When successful Then the card merges the server's actual status (may stay "Pending" until the final step), rather than assuming "Approved".
- Given the approve response lacks content When returned Then the full list is reloaded.
- Given an approve/reject completes When done Then `approvalVersion` increments so each card re-fetches its approval history.

Assertions:
- [ ] Approve merges `res.content` into the matching requisition; fallback triggers `fetchData()`.
- [ ] `actionBusy` disables both action buttons for the affected card.

---

**Reject (with reason)** — opens a modal requiring a reason, then rejects.

Scenarios:
- Given a pending requisition When "Reject" is clicked Then the reject modal opens for that id.
- Given the modal is open and the reason is empty When rendered Then "Confirm Rejection" is disabled.
- Given a reason is entered When confirmed Then `requisitions.reject(id, reason)` is called and the card updates from the response (or reloads on fallback); the modal closes.

Assertions:
- [ ] Confirm is disabled unless `reason.trim()` is non-empty (or while busy).
- [ ] On success `rejectTarget` is cleared and `approvalVersion` increments.

---

**Requisition card** — rich card with status badge, metadata, file link, workflow stepper, history, and rejection banner.

Scenarios:
- Given a requisition When the card renders Then it shows title, status badge, department, submitter, date, amount, and description (or "No description provided.").
- Given the card mounts (or `refreshKey` changes) When rendered Then it fetches `getApprovalHistory(id)` and renders the `ApprovalWorkflowStepper` with per-step status derived from history.
- Given a workflow step has an approval record When deriving status Then it maps to approved/rejected/pending; otherwise the current step is "pending" and others "waiting".
- Given the requisition has a `fileUrl` When rendered Then a download link shows (`fileOriginalName` or "Download").
- Given a rejection note exists in history When rendered Then `RejectionReasonBanner` shows it; a legacy inline `reason` shows only when there is no history note (status 3).
- Given history has records When rendered Then `ApprovalHistoryTimeline` lists past actions.
- Given the requisition is Pending When rendered Then Approve/Reject buttons show; otherwise they are hidden.

Assertions:
- [ ] Status badge falls back to the Pending badge for unknown statuses.
- [ ] `actionedByName` shows "Approved/Rejected by …" with green/red styling per status.
- [ ] The stepper only renders when at least one step exists.

---

## 6. Item Requests

- **Route:** `/item-requests`
- **Purpose:** Item requests to the inventory officer. Structurally a sibling of Requisitions (same list/filter/search/paginate + approve/reject/workflow pattern), but item-centric (item + quantity + purpose) and **no file upload**.
- **Key components / hooks:**
  - `page.tsx` (`ItemRequestsPage`)
  - `_components/`: `ItemRequestCard`, `CreateItemRequestDrawer`, `ItemCombobox`, `types.ts` (`ItemRequest`, `MOCK_ITEM_REQUESTS`, `STATUS_BADGE`, `fmtDate`)
  - Reuses `RejectModal` from `requisitions/_components`
  - `react-hook-form` + `zodResolver(createItemRequestSchema)`, `Controller` for the combobox
  - `apiHandler.itemRequests`, `apiHandler.departments`, `apiHandler.items` (combobox search)
- **API endpoints used:**
  - `itemRequests.list({ status?, page, pageSize })`, `itemRequests.approve(id)`, `itemRequests.reject(id, reason)`, `itemRequests.getApprovalHistory(id)`, `itemRequests.create(payload)`
  - `departments.list()`, `items` search (combobox)
- **Drawer:** `item_req_drawer=true`.
- **Status codes:** `0 All`, `1 Pending`, `2 Approved`, `3 Rejected` (statuses may be numeric or string — see `STATUS_BADGE` and mock mapping).

### Features

**List, filter, search & pagination** — same behavior as Requisitions §5 (status tabs, title search, rows-per-page 10/20/50/100, server pagination, response-shape normalization, empty/loading states).

Scenarios:
- Given mock mode is ON When a status filter is applied Then mock items are filtered, mapping string statuses ("Pending/Approved/Rejected") to `1/2/3`.
- Given a search term When typing Then items are filtered by `itemName || title || name` (case-insensitive).

Assertions:
- [ ] Search matches `itemName || title || name`.
- [ ] Mock status filtering handles both numeric and string status values.

---

**Optimistic create without double-fetch** — after creating, the new request is prepended without triggering the list effect's refetch.

Scenarios:
- Given a request is created When `onCreated` fires Then `skipFetchRef` is set true so the next `fetchData` is skipped, the new request (status `1`) is prepended, and `totalRecords` increments.

Assertions:
- [ ] `skipFetchRef` suppresses exactly one subsequent fetch after a create.
- [ ] New request is inserted with status `1` (Pending) and total count +1.

---

**Create item request** — drawer with item combobox, department, quantity, purpose (all required).

Scenarios:
- Given the user clicks "New Request" When clicked Then `item_req_drawer=true` opens the drawer and departments are fetched.
- Given required fields are missing When submitting Then zod errors render inline (itemName, department, quantity ≥ 1, purpose required).
- Given a valid form When submitted Then `itemRequests.create({ itemName, itemId?, quantity, purpose, departmentId })` is called; success prepends the created request and resets/closes.

Assertions:
- [ ] Quantity defaults to 1 with `min="1"`.
- [ ] `itemId` is sent only when an item was selected from the combobox (else omitted).
- [ ] Department select is disabled while loading and defaults to "Select a department...".

---

**Item combobox** — searchable item picker that sets both the display name and the `itemId`.

Scenarios:
- Given the user types in the item field When searching Then `ItemCombobox` queries items and lists matches.
- Given the user picks an item When selected Then the form's `itemName` is set to the name and `itemId` to the id.
- Given the user types a free-text name without selecting When submitting Then `itemName` is sent and `itemId` is omitted.

Assertions:
- [ ] Selecting an item populates both `itemName` and `itemId`.
- [ ] The combobox is disabled while the form is submitting.

---

**Approve / Reject / card** — identical behavior to Requisitions §5 (busy state, server-status merge with multi-step support, `approvalVersion` history refresh, reject-with-reason modal, workflow stepper + history timeline + rejection banner on the card).

Assertions:
- [ ] Approve/Reject call the `itemRequests` endpoints and merge `res.content` (fallback refetch).
- [ ] The reject modal is the shared `RejectModal` requiring a non-empty reason.

---

## Reports (shared) — §7, §8, §9

The three report pages (Billing Report, Outstanding Balance, Student Not Billed) are
**structurally identical Power BI embeds**. They differ only by the report key passed to
`useReportConfig(<key>)`. All three live under the `reports/layout.tsx` shell, which
renders an `AppPageHeader` titled "Reports" (Notebook icon) around the embedded report.

- **Shared hook:** `useReportConfig(reportName)` → `GET /api/reports/<reportName>` returning `{ embedUrl, embedToken, reportId }`.
- **Embed:** `PowerBIEmbed` (from `powerbi-client-react`) loaded via `next/dynamic` with `ssr: false`.
- **Embed config:** `type: "report"`, `tokenType: 1` (Embed), filter pane hidden (`expanded:false, visible:false`); the embedded report instance is exposed on `window.report`.

### Shared features (apply to each report page)

**Report config fetch lifecycle** — load → success / loading / error / empty.

Scenarios:
- Given the page mounts When `useReportConfig(key)` runs Then it fetches `/api/reports/<key>` and stores `{ embedUrl, embedToken, reportId }`.
- Given the fetch is in progress When rendered Then "Loading report..." shows.
- Given the fetch fails (non-OK or thrown) When rendered Then "Error: <message>" shows.
- Given the fetch succeeds but returns no config When rendered Then "No report configuration found" shows.
- Given a valid config When rendered Then `PowerBIEmbed` mounts with the report's id/embedUrl/accessToken.

Assertions:
- [ ] `GET /api/reports/<key>` is called with the page's specific key.
- [ ] Loading, error, and empty states each render their distinct message.
- [ ] The Power BI component is loaded client-side only (`ssr: false`) with a "Loading Power BI report..." fallback.
- [ ] The filters pane is hidden and `window.report` is set to the embedded instance.

---

## 7. Reports — Billing Report

- **Route:** `/reports/billing-report`
- **Component:** `BillingReportPage` → `useReportConfig("billing-report")`.
- **Behavior:** See [Reports (shared)](#reports-shared--7-8-9). Report key: `billing-report` → `GET /api/reports/billing-report`.

Assertions:
- [ ] Uses the `"billing-report"` config key.

---

## 8. Reports — Outstanding Balance

- **Route:** `/reports/outstanding-balance`
- **Component:** `OutstandingBalanceReportPage` → `useReportConfig("outstanding-balance")`.
- **Behavior:** See [Reports (shared)](#reports-shared--7-8-9). Report key: `outstanding-balance`.

Assertions:
- [ ] Uses the `"outstanding-balance"` config key.

---

## 9. Reports — Student Not Billed

- **Route:** `/reports/student-not-billed`
- **Component:** `StudentNotBilledReportPage` → `useReportConfig("student-not-billed")`.
- **Behavior:** See [Reports (shared)](#reports-shared--7-8-9). Report key: `student-not-billed`.

Assertions:
- [ ] Uses the `"student-not-billed"` config key.

---

## 10. Monthly Reports

- **Route:** `/monthly-reports`
- **Purpose:** Track goal achievement by users across departments — a department-performance bar chart, year/month/status filters + search, paginated report cards, and a submit-report drawer.
- **Key components / hooks:**
  - `page.tsx` (`MonthlyReportsPage`)
  - `_components/`: `ReportCard`, `SubmitReportDrawer`, `types.ts` (`MonthlyReport`, `MOCK_REPORTS`, `STATUS_FILTERS`, `MONTH_NAMES`, `achievementPct`, `groupByDepartment`, `fmtMonth`)
  - `recharts` (BarChart), `react-hook-form` + zod, `useQuery`, `useModifyQuery`
  - `apiHandler.monthlyReports`, `apiHandler.departments`
- **API endpoints used:**
  - `monthlyReports.list({ year, month?, page, pageSize })`, `monthlyReports.create(payload)`
  - `departments.list()` (drawer + chart grouping)
- **Drawer:** `monthly_report_drawer=true`.
- **Achievement %:** `achievementPct = round(achievedValue / targetValue * 100)` (0 when target ≤ 0).

### Features

**Department performance bar chart** — average achievement % per department.

Scenarios:
- Given reports exist When the chart renders Then `groupByDepartment` averages each department's achievement % and renders one colored bar per department (Y axis 0–100).
- Given no chart data When rendered Then a "No data for chart" placeholder shows.
- Given mock mode is ON When rendered Then the chart is built from `MOCK_REPORTS`.

Assertions:
- [ ] Bar value equals the rounded mean of member reports' `achievementPct`.
- [ ] Tooltip formats values as "{value}% Avg Achievement"; bar colors cycle through `BAR_COLORS`.
- [ ] Department falls back to "Unknown" when name is missing.

---

**Year / Month / Status filters + search** — multi-dimensional filtering.

Scenarios:
- Given the year picker When changed Then the list refetches with `year` (options span currentYear−2 … +3).
- Given the month picker When a month is chosen Then the list refetches with `month` ("All Months" omits it).
- Given a status tab (On Track / At Risk / Exceeded / All) When selected Then cards are filtered client-side by `achievementPct`: Exceeded ≥ 100, On Track 80–99, At Risk 50–79.
- Given a search term When typing Then cards are filtered by `goalTitle` (case-insensitive).

Assertions:
- [ ] Year/month changes drive the API query; status and search are client-side.
- [ ] `statusMatch` thresholds: exceeded ≥100, on_track [80,100), at_risk [50,80).

---

**Paginated report cards** — list with rows-per-page (10/20/50/100) and pager.

Scenarios:
- Given reports load When rendered Then each renders a `ReportCard`; same server-pagination + response-shape normalization as §5.
- Given loading / empty states When rendered Then a spinner / "No reports found" shows respectively.

Assertions:
- [ ] `totalRecords` uses `metaData.total ?? items.length`; pager shows only when `totalRecords > pageSize`.

---

**Report card** — goal progress with status pill, trend icon, and progress bar.

Scenarios:
- Given a report When the card renders Then it shows goal title, period (`month year`), submitter, department, "achieved / target" (locale-formatted), a progress bar, optional notes, and a status pill.
- Given the achievement % When rendered Then the pill/trend/colors reflect: ≥100 Exceeded (TrendingUp/green), ≥80 On Track, ≥50 At Risk (yellow), else Behind (red).

Assertions:
- [ ] Progress bar width clamps to 100% even when pct > 100.
- [ ] `StatusPill` label is one of Exceeded / On Track / At Risk / Behind by threshold.
- [ ] Achieved/target values are rendered with `toLocaleString()`.

---

**Submit report** — drawer form with validation and optimistic insert.

Scenarios:
- Given the user clicks "New Report" When clicked Then `monthly_report_drawer=true` opens the drawer (month defaults to current month, year to current year).
- Given goalTitle/month/year are missing When submitting Then zod errors render (target/achieved must be ≥ 0).
- Given a valid form When submitted Then `monthlyReports.create(payload)` runs; on success the created report (or a temp fallback resolving the department name) is prepended, `skipFetchRef` suppresses the next refetch, total +1, form resets, drawer closes.
- Given departments are loaded When rendered Then a department select appears; otherwise it is hidden.

Assertions:
- [ ] Validation messages: "Goal title is required", "Month is required", "Year is required", "must be ≥ 0".
- [ ] Optimistic insert prepends and increments `totalRecords`, skipping one fetch.

---

## 11. Incident Reports

- **Route:** `/incident-reports`
- **Purpose:** Report and track device incidents — summary counts, status filters + search, paginated cards, report drawer, and a two-step lifecycle (Open → In Progress → Resolved) with success/error toasts.
- **Key components / hooks:**
  - `page.tsx` (`IncidentReportsPage`)
  - `_components/`: `IncidentCard`, `ReportIncidentDrawer`, `types.ts` (`Incident`, `SEVERITY_BADGE`, `STATUS_BADGE`, `STATUS_FILTERS`, `MOCK_INCIDENTS`, `fmtDate`)
  - `toaster`, `react-hook-form` + zod, `useQuery`, `useModifyQuery`
  - `apiHandler.incidents`, `apiHandler.departments`
- **API endpoints used:**
  - `incidents.list({ status?, page, pageSize })`, `incidents.create(payload)`, `incidents.markInProgress(id)`, `incidents.markResolved(id, resolution)`
  - `departments.list()`
- **Drawer:** `incident_drawer=true`. Resolve is a centered modal driven by local state.
- **Status:** `open | in_progress | resolved | closed`; **Severity:** `low | medium | high | critical`.

### Features

**Summary count cards** — Open / In Progress / Resolved / Critical tallies.

Scenarios:
- Given incidents are loaded When rendered Then four cards show counts of status open, in_progress, resolved, and severity critical (the Critical value is styled red).
- Given mock mode is ON When rendered Then counts are computed from `MOCK_INCIDENTS`.

Assertions:
- [ ] Each count reflects the current dataset (mock vs live).

---

**Status filter + search** — tabs (All/Open/In Progress/Resolved/Closed) and free-text search.

Scenarios:
- Given a status tab When selected Then the list refetches with `status` (All omits it).
- Given a search term When typing Then cards are filtered client-side over `deviceName + deviceCode + description` (case-insensitive).

Assertions:
- [ ] Search concatenates device name, code, and description.
- [ ] Same paginated list behavior, response-shape normalization, and loading/empty states as §5.

---

**Report incident** — drawer form with full validation and toasts.

Scenarios:
- Given the user clicks "Report Incident" When clicked Then `incident_drawer=true` opens the drawer (date defaults to today, severity to medium).
- Given required fields are missing/invalid When submitting Then zod errors render: deviceName, deviceCode, severity (enum), description (min 5), department, date all required.
- Given a valid form When submitted Then `incidents.create(payload)` runs (date sent as ISO); on success a success toast shows, the list refetches, form resets and drawer closes.
- Given the API returns `isSuccess === false` or throws When submitting Then an error toast shows and the drawer stays open.
- Given no departments are loaded When rendered Then the department select is hidden and the date field spans full width.

Assertions:
- [ ] Validation messages match the zod schema (e.g. "Please describe the issue" for short descriptions).
- [ ] Severity options are low/medium/high/critical; default medium.

---

**Mark In Progress** — moves an Open incident to In Progress.

Scenarios:
- Given an Open incident When "Start Work" is clicked Then `incidents.markInProgress(id)` runs, the card status becomes in_progress, and a success toast shows.
- Given mock mode is ON When clicked Then the status is updated locally without an API call.
- Given the API returns `isSuccess === false` or throws When clicked Then an error toast shows and the status is not changed.

Assertions:
- [ ] Only Open incidents show the "Start Work" button.
- [ ] `actionBusy` disables the button and shows a spinner during the call.

---

**Mark Resolved (with resolution)** — In Progress → Resolved via a required resolution note.

Scenarios:
- Given an In Progress incident When "Mark as Resolved" is clicked Then a modal opens requiring a resolution description.
- Given the resolution is empty When the modal is open Then "Confirm" is disabled.
- Given a resolution is entered When confirmed Then `incidents.markResolved(id, resolution)` runs, the card becomes resolved with `resolvedAt` set, and a success toast shows; the modal closes.
- Given mock mode is ON When confirmed Then the resolution is applied locally.

Assertions:
- [ ] Only In Progress incidents show the "Mark as Resolved" button.
- [ ] Confirm requires non-empty `resolution.trim()`.
- [ ] The resolution box (with `resolvedAt`) renders on resolved/closed cards.

---

**Incident card** — device info, severity/status badges, meta, description, resolution.

Scenarios:
- Given an incident When the card renders Then it shows device name·code, a severity badge, a status badge with status icon, reporter, department, date, and the issue description.
- Given an unknown severity/status When rendered Then a neutral gray fallback badge is used.

Assertions:
- [ ] Severity/status badge classes come from `SEVERITY_BADGE`/`STATUS_BADGE`, keyed by lowercased value.
- [ ] Status icon matches the status (open/in_progress/resolved/closed).

---

## 12. Admin — Users

- **Route:** `/admin/users`
- **Purpose:** User management — summary stats, not-onboarded alert with one-click onboard, unauthorized-activity log, and a users table with onboard/activate-toggle/edit actions.
- **Key components / hooks:**
  - `page.tsx` (`UserManagementPage`)
  - `_components/`: `UpdateUserDrawer`, `AddUserDrawer` (present but not mounted on the page), `types.ts` (`CrmUser`, `UnauthorizedLog`, `USER_STATUS_FILTERS`, `MOCK_USERS`, `MOCK_UNAUTHORIZED_LOGS`)
  - `date-fns` `format`, `react-hook-form` + zod
  - `apiHandler.users`, `apiHandler.roles`, `apiHandler.departments`
- **API endpoints used:**
  - `users.list({ page, pageSize, search?, isOnboarded? })`, `users.getUnauthorizedLogs()`, `users.onboard(id)`, `users.toggleActive(id, active)`, `users.get_by_id(id)`, `users.update(id, payload)`
  - `roles.list()`, `departments.list()`
- **Drawer:** `APP_UPDATE_USER_DRAWER=<userId>` (the query value is the user id, not "true").
- **Filters:** `USER_STATUS_FILTERS` (All / Onboarded / Not Onboarded).

### Features

**Summary stats** — Total Users, Onboarded, Not Onboarded, Unauthorized Actions.

Scenarios:
- Given users and logs load When rendered Then four cards show total (`totalRecords || users.length`), onboarded count, not-onboarded count, and unauthorized-log count.

Assertions:
- [ ] "Unauthorized Actions" equals `logs.length`; "Not Onboarded" is styled red, "Onboarded" green.

---

**Parallel resilient fetch** — users and logs load independently.

Scenarios:
- Given the page loads When fetching Then `users.list` and `users.getUnauthorizedLogs` are requested via `Promise.allSettled`, so one failing does not block the other.
- Given mock mode is ON When loading Then mock users (filtered by onboarded state) and mock logs populate without API calls.

Assertions:
- [ ] `activeFilter` maps to `isOnboarded` = true/false/undefined in the API query.
- [ ] A rejected logs request leaves users rendered (and vice versa).

---

**Not-onboarded alert + onboard action** — banner lists users awaiting onboarding with an Onboard button.

Scenarios:
- Given there are not-onboarded users When rendered Then an orange banner lists each (name, email, department) with an "Onboard" button; the banner is hidden when none.
- Given the user clicks "Onboard" When clicked Then `users.onboard(id)` runs and that user's `isOnboarded` flips to true locally; the button shows a busy spinner.

Assertions:
- [ ] Banner count equals the number of not-onboarded users.
- [ ] `actionBusy` disables the specific user's Onboard button during the call.

---

**Unauthorized activity log** — list of blocked actions by non-onboarded users.

Scenarios:
- Given logs exist When rendered Then each shows the action, user name, formatted timestamp (`yyyy-MM-dd HH:mm`), and a red "Blocked" pill; the section is hidden when empty.

Assertions:
- [ ] Timestamp uses `date-fns format`, falling back to the raw string on parse error.

---

**Users table — filter & search** — tabs + name/email search.

Scenarios:
- Given users load When the table renders Then columns Name, Email, Department, Role, Access Level, Status, Actions are shown.
- Given a status tab When selected Then the list reflects onboarded state (via API `isOnboarded` or mock filter).
- Given a search term When typing Then rows are filtered client-side by name OR email (case-insensitive); the search is also passed to the API query.
- Given loading / empty When rendered Then a spinner / "No users found" shows.

Assertions:
- [ ] Department/role/access fall back to "—" when missing.
- [ ] Same rows-per-page (10/20/50/100) + pager behavior as other list pages.

---

**Activate / deactivate toggle** — inline switch per user.

Scenarios:
- Given a user row When the toggle is clicked Then `users.toggleActive(id, !current)` runs and `isActive` flips locally.
- Given the call is in flight When rendered Then the toggle is disabled/dimmed.

Assertions:
- [ ] Toggle visual state reflects `isActive`; title switches between "Activate user"/"Deactivate user".

---

**Edit user (roles, department, access level)** — drawer that pre-loads roles/departments/user and updates.

Scenarios:
- Given the user clicks the edit (pencil) icon When clicked Then the URL sets `APP_UPDATE_USER_DRAWER=<userId>` and the drawer opens.
- Given the drawer opens When loading Then it fetches departments, roles, and the user in parallel, shows a spinner, and pre-selects the user's current roles (matched by name/id), department, and access level.
- Given roleIds is empty When submitting Then a zod error "At least one role is required" shows.
- Given a valid form When submitted Then `users.update(id, payload)` is called (name split into first/last, roleIds, departmentId|null, accessLevel) and the row updates locally (skipping one refetch via `skipFetchRef`); the drawer closes.
- Given the user cannot be loaded When rendered Then "User not found." shows.

Assertions:
- [ ] Name and email fields are read-only; roles is a multi-select (min 1); access level is 1–5.
- [ ] Submit derives `firstName`/`lastName` by splitting the display name.
- [ ] `AddUserDrawer` exists in the codebase but is not rendered by this page (users originate from Azure AD; admins edit, not create).

---

## 13. Departments

- **Route:** `/departments`
- **Purpose:** Organizational departments overview — summary stats, search, a responsive card grid, and add/edit drawers.
- **Key components / hooks:**
  - `page.tsx` (`DepartmentsPage`, inline `StatCard`)
  - `_components/`: `DepartmentCard`, `AddDepartmentDrawer`, `EditDepartmentDrawer`, `types.ts` (`Department`, `DepartmentStats`, `DEPT_COLORS`, `MOCK_DEPARTMENTS`, `fmtBudget`)
  - `react-hook-form` + zod, `useQuery`, `useModifyQuery`
  - `apiHandler.departments`
- **API endpoints used:** `departments.list()`, `departments.create(payload)`, `departments.update(...)`.
- **Drawers:** `APP_ADD_DEPARTMENT_DRAWER=true` (add), `APP_EDIT_DEPARTMENT_DRAWER=true` (edit; the selected department is held in page state, not the URL).

### Features

**List & search** — fetches departments, searches by name or head.

Scenarios:
- Given mock mode is ON When the page loads Then `MOCK_DEPARTMENTS` populate the grid.
- Given mock mode is OFF When loading Then `departments.list()` is normalized (array / `content[]` / empty).
- Given a search term When typing Then cards are filtered by `name` OR `headName || head?.name` (case-insensitive).
- Given loading / empty When rendered Then a spinner / "No departments found" shows.

Assertions:
- [ ] Search matches both department name and head name.

---

**Summary stats** — Total Departments, Total Staff, Active Projects, Total Budget.

Scenarios:
- Given departments load When rendered Then stats aggregate across the list: staff (`staffCount ?? userCount ?? membersCount`), projects (`activeProjects ?? projectCount`), budget (`budget ?? totalBudget`), formatted with `fmtBudget`.

Assertions:
- [ ] `fmtBudget` formats ≥1M as "₦X.XM", ≥1K as "₦XK", else "₦N", and "₦0" when empty.
- [ ] Total Budget card is highlighted (green).

---

**Department card** — icon, name, head, description, staff/projects/budget, and ID badge.

Scenarios:
- Given a department When the card renders Then it shows a name-mapped icon (fallback Building2), a cycling color from `DEPT_COLORS`, head (or "—"), optional description, staff/projects/budget stats, and a Department ID badge (`code ?? departmentId ?? "—"`).
- Given the user clicks a card When clicked Then the edit flow opens for that department.

Assertions:
- [ ] Icon resolves from `ICON_MAP` by department name, else Building2.
- [ ] Color index cycles via `colorIndex % DEPT_COLORS.length`.

---

**Add department** — drawer with validated form and optimistic insert.

Scenarios:
- Given the user clicks "Add Department" When clicked Then `APP_ADD_DEPARTMENT_DRAWER=true` opens the drawer.
- Given name or code is missing When submitting Then zod errors show (name required; code required, max 10 chars, uppercased).
- Given a valid form When submitted Then `departments.create(payload)` runs (code uppercased); the created (or temp-fallback) department is prepended, skipping one refetch.

Assertions:
- [ ] Code is uppercased and limited to 10 characters.
- [ ] Budget is coerced to a number or undefined when blank.

---

**Edit department** — drawer pre-loaded from the selected department; updates in place.

Scenarios:
- Given the user clicks a card When clicked Then `selectedDept` is set and `APP_EDIT_DEPARTMENT_DRAWER=true` opens the edit drawer pre-filled.
- Given a valid edit When submitted Then the department is updated and replaced in the list (skipping one refetch); the drawer closes and `selectedDept` clears.

Assertions:
- [ ] `handleUpdated` replaces the matching department by id and resets `selectedDept`.
- [ ] Closing the drawer clears `selectedDept`.

---

## 14. Approval Workflows

- **Route:** `/approval-workflows`
- **Purpose:** Configure multi-step approval chains for the two workflow types — Requisitions (type 1) and Item Requests (type 2). Two cards preview each chain; an "Edit Steps" drawer lets admins drag-to-reorder, edit, add, and remove steps.
- **Key components / hooks:**
  - `page.tsx` (`ApprovalWorkflowsPage`, inline `WorkflowCard`, `MOCK_TEMPLATES`, `MOCK_ROLES`)
  - `_components/WorkflowStepsDrawer` (`react-dnd` drag-to-reorder), `ApprovalWorkflowStepper`
  - `IWorkflowTemplate`, `IWorkflowStepRequest` (`@/data/interface/IWorkflow`)
  - `apiHandler.workflowTemplates`, `apiHandler.roles`
- **API endpoints used:**
  - `workflowTemplates.list()`, `workflowTemplates.create(data)`, `workflowTemplates.upsertSteps(id, steps)`
  - `roles.listNames()` (lightweight `/roles/names`)
- **Drawer:** `APP_WORKFLOW_DRAWER=<templateId>` — the value is the template's id (or a placeholder `new-req`/`new-ir` when no template exists yet).

### Features

**Load templates + roles (resilient)** — both fetched together; a failed roles call doesn't block templates.

Scenarios:
- Given the page loads When fetching Then `workflowTemplates.list()` and `roles.listNames()` run via `Promise.allSettled`.
- Given mock mode is ON When loading Then `MOCK_TEMPLATES` and `MOCK_ROLES` are used.
- Given the backend serializes `workflowType` as a string ("Requisition"/"ItemRequest") When matching Then both numeric (1/2) and string forms resolve to the correct card.

Assertions:
- [ ] A rejected roles call still renders templates (and logs the reason).
- [ ] `reqTemplate`/`irTemplate` match by numeric type OR its string enum form.

---

**Workflow card preview** — one card per type showing the configured step chain and status.

Scenarios:
- Given a template exists When the card renders Then it shows the type label, template name, a `ApprovalWorkflowStepper` of steps (sorted by `stepOrder`, all "waiting" preview status), a step count, and an Active/Inactive pill.
- Given no steps When rendered Then "No steps configured" shows.
- Given the user clicks "Edit Steps" When clicked Then the active template/type is set and the URL opens the drawer keyed to that template id (or `new-req`/`new-ir`).

Assertions:
- [ ] Steps are sorted by `stepOrder` before rendering.
- [ ] Step count pluralizes ("1 step" / "N steps").
- [ ] Status pill reflects `template.isActive`.

---

**Edit steps drawer — drag to reorder** — reorder steps via drag-and-drop; orders recompute.

Scenarios:
- Given the drawer is open When a step is dragged over another Then `handleMove` reorders and re-numbers `stepOrder` as 1-based index.
- Given the drawer opens (or `initialSteps` change while open via URL navigation) When rendered Then local steps reset from `initialSteps` (JSON deep-compare avoids reference-only resets).

Assertions:
- [ ] Each step row has a drag handle (type `'STEP'`), order badge, name input, role select, and remove button.
- [ ] After any move/remove, `stepOrder` equals the 1-based array index.
- [ ] The drawer is wrapped in `DndProvider` (HTML5 backend).

---

**Edit steps — add / edit / remove** — manage individual steps.

Scenarios:
- Given the drawer is open When "Add Step" is clicked Then a new empty step (name "", role "") is appended with the next order.
- Given a step's name/role is edited When changed Then only that step updates.
- Given a step is removed When clicked Then it is filtered out and remaining orders renumber.

Assertions:
- [ ] Role select lists the loaded roles plus a "Select role..." default.

---

**Save steps (with auto-create)** — validates, lazily creates the template if needed, then upserts.

Scenarios:
- Given any step has no name When saving Then "All steps must have a name." shows and no request fires.
- Given any step has no role When saving Then "All steps must have a role assigned." shows.
- Given there are zero steps When saving Then "At least one step is required." shows.
- Given the templateId is a placeholder (not a GUID) When saving Then `workflowTemplates.create({ workflowType, name, isActive:true, steps:[] })` runs first to obtain a real id.
- Given a valid template id When saving Then `workflowTemplates.upsertSteps(id, payload)` runs (payload re-indexes `stepOrder`), `onSaved()` refetches, and the drawer closes.
- Given the create or upsert fails When saving Then an error message shows and the drawer stays open.

Assertions:
- [ ] `isGuid` decides whether a create-before-upsert is required.
- [ ] Save button shows "Saving..." while in flight.
- [ ] On success the page reloads templates via `handleSaved`.

---

## 15. Configurations

- **Route:** `/configurations` (route constant `SCHOOL_CONFIG`; layout title "School Configuration", Cog icon)
- **Purpose:** School/academic reference-data setup, organized as URL-driven tabs. Each tab is a paginated data table with Excel import. (This is distinct from the standalone `/departments` page in §13 — here "Departments" is an academic-structure tab.)
- **Key components / hooks:**
  - `page.tsx` (`SchoolConfiguration`) → `AppTabs`
  - `_tab-contents/`: `campuses`, `faculties`, `departments`, `academic-levels` (active tabs); `school-information`, `program-types`, `academic-positions`, `academic-awards`, etc. exist but are commented out
  - Each tab: `AppDataTable` + a `_components/column.tsx`, `apiHandler.<entity>`, `useQuery`/`useModifyQuery`, `AppDialog` import flows
  - Excel helpers: `processExcelFile`, `processMasterExcelFile`, `isApiResponse`
- **API endpoints used (per tab):** `apiHandler.campus.list/import`, plus `faculties`, `departments`, `academic-levels` equivalents, and `SchoolInformationData.import` (master import).
- **Tab routing:** `?tab=<value>` (default `campuses`). Drawer/dialog query keys: `APP_IMPORT_DIALOG=true`, `drawer=true`.

### Features

**Tabbed navigation** — tabs switch via URL `?tab=`.

Scenarios:
- Given no `?tab` param When the page loads Then the default tab (`campuses`) is active.
- Given the user clicks a tab When clicked Then the URL becomes `<SCHOOL_CONFIG>?tab=<value>` and that tab's content renders.
- Given a tab is not the current tab When rendered Then its content is not mounted (only `currentTab === value` content renders).

Assertions:
- [ ] The active tab reads from `searchParams.get("tab") ?? defaultValue`.
- [ ] Only the active tab's content is mounted (lazy per-tab rendering).
- [ ] Visible tabs: Campuses, Faculties, Departments, Academic Levels.

---

**Per-tab data table (Campuses representative)** — paginated table with refresh.

Scenarios:
- Given a tab mounts When data loads Then `apiHandler.<entity>.list({ page, pageSize })` is called and the table renders `content` with pagination `metaData` (fallback to array response).
- Given the user changes page/size When paginating Then the data refetches for the new `pageIndex`/`pageSize`.
- Given the user clicks Refresh When clicked Then `reloadData()` refetches the current page.

Assertions:
- [ ] Response handling supports both `{ content, metaData }` and raw arrays.
- [ ] `pageCount` derives from `metaData.lastPage`.
- [ ] Default page size is 10.

---

**Excel import** — import entity rows and a master school-setup file.

Scenarios:
- Given the user opens the import dialog (`APP_IMPORT_DIALOG=true`) and selects a `.xlsx/.csv` (≤5MB) When importing Then `processExcelFile` parses it and `apiHandler.<entity>.import(parsedData)` is called; on success the dialog closes and data updates.
- Given the master import dialog (`drawer=true`) and an `.xls/.xlsx` file When importing Then `processMasterExcelFile` + `SchoolInformationData.import` run, with success/error toasts and a progress toast.
- Given the master import returns `hasError` When importing Then an error toast shows; on success a success toast shows and data reloads.

Assertions:
- [ ] Import dialogs are URL-driven (`APP_IMPORT_DIALOG`, `drawer`).
- [ ] Master import surfaces toasts via `toaster.promise/success/error` based on `isApiResponse` result.
- [ ] The master import button is disabled while loading or when no file is selected.

---

## 16. Parameters

- **Route:** `/parameters` (route constant `PARAMETERS`; layout title "Parameter", SlidersHorizontal icon)
- **Purpose:** System parameters, same tabbed shell as Configurations. Currently a single tab: **ERP Settings** — a data table with an edit drawer/form.
- **Key components / hooks:**
  - `page.tsx` (`SchoolSetup`) → `AppTabs` (default tab `erp-settings`)
  - `_tab-contents/erp-settings/`: `erp-settings.tsx` (`ErpSettings`), `_components/column.tsx`, `erp-settings-form.tsx` (`ErpSettingsForm`)
  - `AppDataTable`, `useQuery`/`useModifyQuery`, `apiHandler.erpSettings`
- **API endpoints used:** `apiHandler.erpSettings.list()` (note: list is not paginated server-side; page params accepted for compatibility but unused).
- **Drawer:** `APP_DRAWER=true` (edit form).

### Features

**ERP settings table** — lists settings with refresh and a name filter.

Scenarios:
- Given the tab mounts When data loads Then `erpSettings.list()` is called and the table renders `content` (fallback to array), with `metaData` when present.
- Given the user clicks Refresh When clicked Then `reloadData()` refetches.
- Given the user types in the name filter When filtering Then rows filter by name.

Assertions:
- [ ] Response handling supports `{ content, metaData }` and raw arrays.
- [ ] Default page size is 10 (client pagination; server list returns all).

---

**Edit ERP setting** — row action opens an edit form drawer.

Scenarios:
- Given a row's actions menu When "Edit ERP Settings" is clicked Then `selectedErpSetting` is set and the URL opens the drawer (`APP_DRAWER=true`), with `ErpSettingsForm` pre-filled.

Assertions:
- [ ] The actions column renders a dropdown with an "Edit ERP Settings" item.
- [ ] Selecting a row passes that record to `ErpSettingsForm` via `erpSetting` prop.

---

## 17. Notifications

- **Route:** `/notifications` (route constant `NOTIFICATIONS`; layout title "Notifications", Bell icon). The inbox lives at the `inbox` subroute, rendered inside a single tab.
- **Purpose:** Notification inbox — a paginated table of messages (newest first) with refresh and an Excel import. Real-time delivery is backed by a SignalR hub (see `signalrClient`, also consumed by the header nav).
- **Key components / hooks:**
  - `page.tsx` (`Notifications`) → `AppTabs` (single tab "Notifications", default `notification`) → `inbox/inbox.tsx` (`Inbox`)
  - `inbox/_components/column.tsx`, `AppDataTable`, `AppDialog`, `useQuery`/`useModifyQuery`
  - `apiHandler.notification`, `processExcelFile`, `toaster`
  - `src/lib/signalrClient.ts` (`startSignalRConnection`) — singleton hub connection with auto-reconnect
- **API endpoints used:** `notification.list({ page, pageSize })`, `notification.import(file)`; SignalR hub `/hubs/notification`.
- **Drawer:** `APP_IMPORT_DIALOG=true` (import dialog).

### Features

**Inbox table (newest first)** — paginated notifications sorted by date descending.

Scenarios:
- Given the tab mounts (or pagination changes) When data loads Then `notification.list({ page, pageSize })` is called and the table renders `content`, sorted by `createdAt` desc.
- Given the response has `metaData` When loaded Then `pageCount` uses `metaData.lastPage`; otherwise it falls back to `ceil(totalRecords / pageSize)`.
- Given the user clicks Refresh When clicked Then `reloadData()` refetches the current page.

Assertions:
- [ ] Initial table sorting is `[{ id: "createdAt", desc: true }]`.
- [ ] `pageCount` derives from `metaData.lastPage` or the `totalRecords` fallback.
- [ ] Default page size is 10; the table shows a loader while fetching.

---

**Import notifications** — upload a file to import inbox messages with toasts.

Scenarios:
- Given the import dialog (`APP_IMPORT_DIALOG=true`) and a selected file When importing Then `notification.import(file)` runs inside a `toaster.promise` (loading toast).
- Given the import returns `isSuccess && !hasError` When done Then a success toast shows, data reloads, and the dialog closes.
- Given the import returns `hasError` (or throws) When done Then an error toast shows with the error message.

Assertions:
- [ ] Import is wrapped in `toaster.promise` with a "Importing..." loading state.
- [ ] Success path reloads data and closes the dialog; error path keeps it open.

---

**Real-time delivery (SignalR)** — a singleton hub connection powers live notifications.

Scenarios:
- Given the app needs live notifications When `startSignalRConnection()` is called Then a single `HubConnection` to `/hubs/notification` is built with automatic reconnect and started once (reused on subsequent calls).
- Given the connection drops When reconnecting Then `onreconnecting`/`onreconnected`/`onclose` handlers log state transitions.

Assertions:
- [ ] `connection` is a module-level singleton — repeated calls return the same instance without reconnecting.
- [ ] The builder configures `withAutomaticReconnect()` and Information-level logging.
- [ ] The header `NavUser` consumes the same client for its notification bell (see [App Shell §1](#1-app-shell--root-layout)).
