# CRM Frontend Codebase Patterns & Structure Guide

This document outlines the architectural patterns, directory structures, and recurring components within the CRM frontend codebase. It is designed to act as a reference for building new pages and features within the same context or a new context window.

## 1. Directory Structure

The application uses the Next.js App Router paradigm, organized mainly under `src`:

- `src/app/(main)/[feature-name]/`: The entry point for a main feature page (e.g., `departments`, `requisitions`, `inventory/items`). The primary file is `page.tsx`.
- `src/app/(main)/[feature-name]/_components/`: Feature-specific components that are not shared globally. Typically includes:
  - `types.ts`: TypeScript interfaces and Mock data constants.
  - `[Action]Drawer.tsx` or `[Action]Modal.tsx`: Drawers/Modals for creating or editing entities.
  - `[Entity]Card.tsx`: Card representations of the data (if applicable).
- `src/components/app/`: Reusable, domain-specific UI components built on top of lower-level UI libraries. These are crucial for maintaining a consistent look and feel.
- `src/components/ui/`: Low-level UI components (combinations of Chakra UI wrappers and Shadcn-like components).
- `src/data/api/`: Centralized API handling. The primary file is `ApiHandler.ts`.
- `src/data/schema/`: Zod schemas for form validation.
- `src/data/interface/`: Global TypeScript interfaces for API requests/responses.
- `src/hooks/`: Custom React hooks, most notably for managing URL-based state (`useQuery`, `useModifyQuery`).
- `src/lib/routes.tsx`: Centralized constant definitions for application routes and URL query parameters used for UI state.

## 2. Core Architectural Patterns

### 2.1 URL-Driven UI State (Drawers & Modals)

Instead of using localized React state (`useState(false)`) to open and close drawers and modals, the application uses **URL query parameters**.

**Workflow for a Drawer:**
1. **Define a Route Constant**: Add a constant in `src/lib/routes.tsx` (e.g., `export const APP_MY_FEATURE_DRAWER = 'my_feature_drawer'`).
2. **Hook Usage**: Inside the Drawer component, use `useQuery` to determine if the drawer should be open.
   ```tsx
   import { useQuery } from "@/hooks/use-query";
   const { router, searchParams, open } = useQuery(APP_MY_FEATURE_DRAWER, "true");
   ```
3. **Close Action**: Use `useModifyQuery` to generate the URL that removes the query parameter when the user closes or submits the drawer.
   ```tsx
   import { useModifyQuery } from "@/hooks/use-modify-query";
   const redirectUri = useModifyQuery(null, searchParams, [{ key: APP_MY_FEATURE_DRAWER, value: "true" }]);
   ```
4. **Trigger**: In the parent `page.tsx`, generate the open URL and push it to the router.
   ```tsx
   const drawerUrl = useModifyQuery(null, searchParams, [{ key: APP_MY_FEATURE_DRAWER, value: "true" }], "set");
   <button onClick={() => router.push(drawerUrl)}>Open Drawer</button>
   ```

### 2.2 Data Fetching

Data fetching generally happens at the component level (`page.tsx`) using `useEffect` and the centralized `apiHandler`.

**Standard Fetching Pattern:**
```tsx
import apiHandler from "@/data/api/ApiHandler";

const [data, setData] = useState<MyType[]>([]);
const [loading, setLoading] = useState(true);

const fetchData = useCallback(async () => {
  try {
    if (process.env.NEXT_PUBLIC_DISABLE_MOCK_DATA !== "true") {
      setData(MOCK_DATA);
      return;
    }
    const res = await apiHandler.myFeature.list();
    
    // The backend response format can vary, so flexible parsing is often required:
    if (res?.isSuccess && Array.isArray(res.content)) setData(res.content);
    else if (Array.isArray(res)) setData(res);
    else if (res?.items) setData(res.items);
    else setData([]);
  } catch (e) {
    console.error("Fetch failed", e);
  } finally {
    setLoading(false);
  }
}, []);

useEffect(() => {
  setLoading(true);
  fetchData();
}, [fetchData]);
```

### 2.3 Forms and Validation

The application standardizes on `react-hook-form` paired with `zod` for validation.

**Workflow:**
1. Define a schema in `src/data/schema/[feature].ts`.
2. Use the `useForm` hook with the `zodResolver`.
3. Standardize input styling based on error state:
   ```tsx
   const inputBase = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors";
   const inputOk   = "border-gray-200 focus:ring-green-400 focus:border-green-400";
   const inputErr  = "border-red-400 focus:ring-red-300";
   
   <input
     {...register("fieldName")}
     className={`${inputBase} ${errors.fieldName ? inputErr : inputOk}`}
   />
   {errors.fieldName && <p className="text-xs text-red-500 mt-1">{errors.fieldName.message}</p>}
   ```

## 3. Common Imports and UI Library Usage

When creating new components, ensure you import from the correct local wrappers rather than bare libraries to maintain consistent styling.

- **Icons**: Always use `lucide-react`.
  ```tsx
  import { Plus, Search, Loader, Building2 } from "lucide-react";
  ```
- **Chakra UI General Layout**:
  ```tsx
  import { VStack, HStack, Box } from "@chakra-ui/react";
  ```
- **Custom App UI Components**:
  ```tsx
  import AppDrawer from "@/components/app/app-drawer";
  import AppDialog from "@/components/app/app-dialog";
  import AppTable from "@/components/app/app-chakra-table";
  import AppTabs from "@/components/app/app-tabs";
  import AppLoader from "@/components/app/app-loader";
  ```
- **Lower-level UI Components**:
  ```tsx
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/sdcn-select";
  import { Button } from "@/components/ui/sdcn-button";
  import { PaginationRoot, PaginationItems, PaginationPrevTrigger, PaginationNextTrigger } from "@/components/ui/chakra-pagination";
  ```

## 4. API Handling Structure

All API calls route through `src/data/api/ApiHandler.ts`. This file initializes an Axios instance with an interceptor to automatically attach the authentication token from `next-auth`.

When adding a new feature:
1. Define the endpoints in a new object within `ApiHandler.ts`:
   ```typescript
   const myFeature = {
     list: () => requests.get<any>("/endpoint"),
     create: (data: MyData) => requests.post<any>("/endpoint", data),
     update: (id: string, data: MyData) => requests.put<any>(`/endpoint/${id}`, data),
   };
   ```
2. Export it inside the default `apiHandler` object at the bottom of the file.

## 5. Summary Checklist for New Page Creation

When tasked with building a new feature module, follow these steps:

1. **Define Types & Mocks**: Create `types.ts` in your `_components` directory. Define interfaces and `MOCK_DATA`.
2. **Define Routes**: Add any necessary drawer/modal query parameters to `src/lib/routes.tsx`.
3. **Setup API**: Add the necessary endpoints to `ApiHandler.ts`.
4. **Create Schemas**: If forms are needed, create Zod schemas in `src/data/schema/`.
5. **Build Modals/Drawers**: Build the creation/editing forms using `AppDrawer` or `AppDialog`, integrating `react-hook-form` and handling the mock/API submission.
6. **Build Page Layout**: Assemble `page.tsx` utilizing `useEffect` data fetching, integrating the drawers, and displaying data via lists, custom cards, or `AppTable`. Use `AppLoader` and `AppEmptyState` where appropriate.
