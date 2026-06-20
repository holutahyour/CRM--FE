# Feature Documentation Catalog — Design

**Date:** 2026-06-15
**Status:** Approved
**Author:** software@lagetronix.com (with Claude)

## Goal

Produce a single master catalog documenting **every feature on every page** of the
CRM/IMS frontend, written so each feature maps directly to a test. The catalog is
developer-focused and detailed enough to drive a test suite that covers all features.

## Source of Truth

The actual page code is authoritative: each `app/.../page.tsx` plus its `_components`,
the hooks it calls, and the API endpoints it hits. Features are derived from code, not
assumed, so the catalog reflects what the app really does.

## Location

`CRM--FE/docs/FEATURES.md` — one master catalog, one section per page, with a
table-of-contents (anchor links) at the top for navigation.

## Audience

Developers maintaining the app and writing tests. No end-user manual content.

## Per-Page Section Template (Hybrid Format)

```markdown
## <Page Name>
- **Route:** /inventory/items
- **Purpose:** one-line summary
- **Key components / hooks:** ItemsTable, useItems, ...
- **API endpoints used:** GET /api/items, POST /api/items, ...

### Features

**<Feature name>** — short summary

Scenarios (Given/When/Then) for the important flows:
- Given <precondition> When <action> Then <expected result>

Assertions (checklist for smaller behaviors):
- [ ] Clicking Save with empty name shows validation error
- [ ] Pagination loads next 20 rows
```

For each feature: a one-line summary, Given/When/Then scenarios for the important
flows, and a checklist of smaller assertions. Cover actions, validations, states,
filters, permissions, edge cases, and API interactions.

## Coverage

All pages under `CRM--FE/src/app`:

1. Auth — sign-in
2. Dashboard
3. Inventory — items
4. Requisitions
5. Item requests
6. Reports — billing-report
7. Reports — outstanding-balance
8. Reports — student-not-billed
9. Monthly reports
10. Incident reports
11. Admin — users
12. Departments
13. Approval workflows
14. Configurations
15. Parameters
16. Notifications (inbox)
17. App shell / root layout (navigation, auth guard, common chrome)

## Process

Work page-by-page. For each page:
1. Read `page.tsx` and its `_components`, plus referenced hooks and data/types.
2. Identify the API endpoints used.
3. Enumerate every feature and behavior.
4. Write the page's section using the template.

Progress is tracked with a task list (one task per page) so no page is missed.
Each page section is reviewable independently.

## Non-Goals

- No end-user manual / business stakeholder content.
- Not documenting the backend (.NET) internals; only the API endpoints the frontend calls.
- Not writing the tests themselves — the catalog is the basis for them.

## Open Decisions (resolved)

- Audience: Developers.
- Depth: Detailed enough to write tests covering all features.
- Structure: Single master catalog (`FEATURES.md`) with TOC.
- Format: Hybrid (summary + Given/When/Then + checklist).
