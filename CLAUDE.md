# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Start dev server (proxies to http://localhost:5000)  ← use pnpm, not npm
pnpm build        # Production build
pnpm lint         # ESLint via next lint
pnpm test         # Run Jest unit tests (10 test suites as of approval workflow feature)
pnpm test:watch   # Jest in watch mode
npx playwright test                        # Run all E2E tests (starts dev server automatically)
npx playwright test e2e/approval-workflows.spec.ts   # Run a specific spec
npx playwright test --reporter=list        # Verbose output (easier to read in PowerShell)
```

> **Package manager is pnpm** — the project was migrated from npm during development. Always use `pnpm` for installs and script runs.

E2E tests use Playwright. `playwright.config.ts` at the project root configures the dev server (`webServer`), `workers: 1` (sequential), `retries: 1`, and `baseURL: http://localhost:3000`.

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_API_URL=          # Backend API base URL
AZURE_AD_CLIENT_ID=
AZURE_AD_CLIENT_SECRET=
AZURE_AD_TENANT_ID=
AZURE_SCOPE=                  # Additional OAuth scope (appended to openid profile email offline_access)
AUTH_SECRET=                  # next-auth secret
NEXT_PUBLIC_DISABLE_MOCK_DATA=true   # Set to "true" to use real API; omit/false to use mock data
```

## Architecture

**Framework**: Next.js 14 App Router, TypeScript, Tailwind CSS.

### Auth Flow

Authentication is Azure AD via `next-auth`. The token is injected automatically into every Axios request by `src/data/api/ApiHandler.ts` (reads `session.accessToken`). The `AzureAuthProvider` in `src/context/auth-context.tsx` wraps the whole app and handles redirect-to-login when unauthenticated, forces re-login on `RefreshAccessTokenError`, and exposes `useAzureAuth()` for user/role access.

Provider stack (root layout → `src/components/ui/chakra-provider.tsx`):
`ChakraProvider → SessionProvider → AzureAuthProvider → RoleSelectionProvider → ColorModeProvider`

### Routing & Layout

All authenticated pages live under `src/app/(main)/`. The shell (`src/app/_components/page-layout.tsx`) renders the collapsible sidebar, breadcrumbs, and user nav. It blocks render with a loader until auth is resolved.

Sidebar navigation is fetched at runtime from `/menus/my-menus` (not static) — see `src/components/scdn-app-sidebar.tsx`.

### API Layer

All API calls go through `src/data/api/ApiHandler.ts`, a single export with typed namespaces: `users`, `roles`, `menus`, `erpSettings`, `notification`, `dashboard`, `requisitions`, `itemRequests`, `incidents`, `monthlyReports`, `items`, `departments`, `categories`, `vendors`, `locations`.

API responses follow `IApiResponse<T>` (`src/data/interface/IApiResponse.ts`):
```ts
{ isSuccess: boolean, content: T, metaData?: IPaginationMetaData, ... }
```

Error toasts on mutating requests (POST/PUT/DELETE) are fired automatically by the Axios response interceptor — don't add redundant error toasts in page components.

### UI Component System

Two component libraries co-exist:

| Prefix | Source | Location |
|--------|--------|----------|
| `chakra-*` | Chakra UI v3 | `src/components/ui/chakra-*.tsx` |
| `sdcn-*` | Radix UI / shadcn-style | `src/components/ui/sdcn-*.tsx` |

Shared app-level components (tables, drawers, page headers, stats) are in `src/components/app/`.

### URL-Driven Drawer/Modal Pattern

Drawers are opened and closed via URL query parameters. Constants for all query keys are in `src/lib/routes.tsx` (e.g. `APP_UPDATE_USER_DRAWER`, `APP_INCIDENT_DRAWER`).

- `useQuery(key, value)` — returns `{ open, router, searchParams }`. Open state is true when `searchParams.get(key) === value`.
- `useModifyQuery(route, searchParams, queries, type)` — builds URLs that add or remove query params.
- `AppDrawer` (`src/components/app/app-drawer.tsx`) wraps Chakra's DrawerRoot and is controlled entirely by its `cancelQueryKey` prop matching a URL param.

To open a drawer from a page: push a URL with the drawer's query key set to the relevant value (usually a record ID or `"true"`).

### E2E Testing Patterns

E2E tests live in `e2e/`. All API and auth calls are intercepted with `page.route()` stubs — the suite runs without a live backend or Azure AD account.

#### Ark UI `inert` backdrop — critical for drawer tests

When an Ark UI (Chakra UI v3) drawer is open, **all background content receives the HTML `inert` attribute** for its focus-trap / a11y. Playwright's `isVisible()` returns `false` for `inert` elements even when they are fully rendered in the DOM.

**Rule**: After opening a drawer, only assert on content *inside* the drawer. Never wait for background card headings or other page content while a drawer is open — those assertions will always time out.

```ts
// ✅ Correct — assert on drawer content
await expect(page.getByText("Edit Workflow Steps")).toBeVisible({ timeout: 30_000 });

// ❌ Wrong — "Requisitions" heading is inert/invisible while drawer is open
await expect(page.getByRole("heading", { name: "Requisitions" })).toBeVisible();
```

#### Open drawers with `page.goto()`, not by clicking

Clicking the "Edit Steps" button calls `router.push()`, which triggers a Next.js RSC re-render. During that reconciliation, Ark UI's Portal calls `flushSync()` which loses the ChakraProvider context in dev mode — crashing the app.

**Rule**: Always navigate to the drawer URL directly using `page.goto("/page?drawer_key=id")` in E2E tests. This avoids the RSC re-render path entirely.

#### Drawer opens before async data arrives

The URL-driven drawer pattern opens the drawer immediately from the query param, before the templates API call has returned. Test helpers that open a drawer must wait for *both* the drawer title **and** any expected pre-loaded step inputs before interacting with step rows or counting selects.

```ts
async function openDrawer(page: Page) {
  await page.goto(`/approval-workflows?workflow_drawer=${REQ_ID}`);
  await expect(page.getByText("Edit Workflow Steps")).toBeVisible({ timeout: 30_000 });
  // Also wait for the pre-loaded step — templates load asynchronously after the drawer opens
  await expect(page.locator('input[placeholder="Step name"]').first()).toBeVisible({ timeout: 15_000 });
}
```

#### Running Playwright in PowerShell

Never pipe Playwright through `| Select-Object -First N` or `| head` — it sends a kill signal to the process after N lines, giving exit code 255 with no test results. Redirect to a temp file instead:

```powershell
npx playwright test > "$env:TEMP\pw-results.txt" 2>&1
Get-Content "$env:TEMP\pw-results.txt" | Select-Object -Last 60
```

### Mock Data

Pages check `process.env.NEXT_PUBLIC_DISABLE_MOCK_DATA !== "true"` to decide whether to use bundled mock data or call the real API. When adding a new page, follow the same `USE_MOCK` pattern for local development without a backend.

---

## Unit Testing (Jest + React Testing Library)

Test stack: **Jest 30, React Testing Library 16, @testing-library/jest-dom 6, jsdom**
Config: `jest.config.ts` (next/jest SWC wrapper) + `jest.setup.ts`

```bash
pnpm test                               # Run all tests
pnpm test -- --testPathPatterns="Foo"   # Filter by name (note: --testPathPatterns plural in Jest 30+)
```

### Test File Conventions

- Test files live in `src/components/app/__tests__/` (co-located with components)
- Filename pattern: `ComponentName.test.tsx`
- Import the component using a relative path: `import Foo from '../Foo'`
- Path alias `@/` maps to `src/` — use `@/data/interface/IWorkflow` in tests

### Key Patterns

**Component renders null guard** — test that a component returns `null` via `container.firstChild`:
```tsx
const { container } = render(<Comp reason={undefined} />);
expect(container.firstChild).toBeNull();
```

**`data-testid` for targeted assertions** — when a rendered element contains mixed text (name + status symbol), use `data-testid` rather than `getByText`:
```tsx
// Component:
<span data-testid={`step-${step.name}`} className={statusStyles[step.status]}>
  {step.name}
</span>
// Test:
const badge = screen.getByTestId('step-Supervisor');
expect(badge).toHaveClass('bg-green-600');
```

**`getByText` exact-match caveat** — `screen.getByText('Supervisor')` fails if the element contains extra text. Keep the step name in its own child element with no surrounding text nodes.

**Jest 30 deprecation** — `--testPathPattern` (singular) is deprecated; use `--testPathPatterns` (plural).

---

## API Handler Namespaces

`src/data/api/ApiHandler.ts` exports a single `apiHandler` object. Full namespace list as of the approval workflow feature:

`users`, `roles`, `menus`, `erpSettings`, `notification`, `dashboard`, `requisitions`, `itemRequests`, `incidents`, `monthlyReports`, `items`, `departments`, `categories`, `vendors`, `locations`, **`workflowTemplates`**

### Key Methods Added for Approval Workflow

```typescript
apiHandler.workflowTemplates.list()                        // GET /workflows
apiHandler.workflowTemplates.getByType(type: number)       // GET /workflows/{type}
apiHandler.workflowTemplates.create(data)                  // POST /workflows
apiHandler.workflowTemplates.upsertSteps(id, steps)        // PUT /workflows/{id}/steps

apiHandler.requisitions.getApprovalHistory(id)             // GET /requisitions/{id}/approval-history
apiHandler.requisitions.createWithFile(formData: FormData) // POST /requisitions (multipart)

apiHandler.itemRequests.getApprovalHistory(id)             // GET /itemrequests/{id}/approval-history
```

`createWithFile` uses `axiosInstance.post` directly with `{ headers: { 'Content-Type': 'multipart/form-data' } }`, bypassing the `requests.post` helper so the browser sets the multipart boundary automatically.

---

## Approval Workflow Feature — New Files

### New Interfaces

`src/data/interface/IWorkflow.ts` exports:
- `ApprovalStatus` type: `'Pending' | 'Approved' | 'Rejected'`
- `WorkflowStepStatus` type: `'approved' | 'rejected' | 'pending' | 'waiting'`
- `IWorkflowStep`, `IApprovalRecord`, `IApprovalHistory`, `IWorkflowTemplate`, `IWorkflowStepRequest`

### New Components (`src/components/app/`)

| Component | Props | Purpose |
|---|---|---|
| `ApprovalWorkflowStepper` | `steps: { name: string; status: WorkflowStepStatus }[]` | Coloured pill chain showing each approval step |
| `ApprovalHistoryTimeline` | `records: IApprovalRecord[]` | Timeline of past approve/reject actions with actor and notes |
| `RejectionReasonBanner` | `reason: string \| undefined` | Pink banner — renders `null` when reason is empty/undefined |

### React-Dropzone File Upload Pattern

File state lives **outside** the react-hook-form schema — Zod validates form fields, the file is held in `useState<File | null>`:

```typescript
const [uploadedFile, setUploadedFile] = useState<File | null>(null);
const { getRootProps, getInputProps, isDragActive } = useDropzone({
  onDrop: useCallback((files: File[]) => setUploadedFile(files[0] ?? null), []),
  accept: { 'application/pdf': ['.pdf'], 'image/*': ['.png', '.jpg', '.jpeg'] },
  maxFiles: 1,
  maxSize: 10 * 1024 * 1024,
});
```

On submit, build `FormData` manually and call `apiHandler.requisitions.createWithFile(formData)`. Reset `setUploadedFile(null)` after success alongside `form.reset()`.

### Route Constants

`src/lib/routes.tsx` — add new drawer keys here:
- `APP_WORKFLOW_DRAWER = 'workflow_drawer'` — used by WorkflowStepsDrawer

### Approval Workflow Admin Page

`src/app/(main)/approval-workflows/page.tsx` — shows two cards (Requisitions / Item Requests). Each card displays the configured steps via `ApprovalWorkflowStepper` (all `waiting` status for preview) and an "Edit Steps" button that opens `WorkflowStepsDrawer`.

`WorkflowStepsDrawer` uses **react-dnd** (`DndProvider` + `HTML5Backend`) for drag-to-reorder. Each step row uses `useDrag`/`useDrop` with type `'STEP'`. `stepOrder` values are recalculated as 1-based index after every move/remove. The drawer follows the URL-driven pattern using `useQuery(APP_WORKFLOW_DRAWER, templateId)` where the value is the template's ID (not `"true"`).
