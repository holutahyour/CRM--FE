# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server (proxies to http://localhost:5000)
npm run build     # Production build
npm run lint      # ESLint via next lint
```

No test runner is configured.

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

### Mock Data

Pages check `process.env.NEXT_PUBLIC_DISABLE_MOCK_DATA !== "true"` to decide whether to use bundled mock data or call the real API. When adding a new page, follow the same `USE_MOCK` pattern for local development without a backend.
