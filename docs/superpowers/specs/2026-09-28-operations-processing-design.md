# Operations → Processing: Batch Production Scheduling workbook

**Date:** 2026-09-28
**Status:** Approved (sections approved in chat; implementation started on request)
**Scope:** CRM---BE + CRM--FE
**Source document:** `𝐁𝐀𝐓𝐂𝐇 𝐏𝐑𝐎𝐃𝐔𝐂𝐓𝐈𝐎𝐍 𝐒𝐂𝐇𝐄𝐃𝐔𝐋𝐈𝐍𝐆 (1).xlsx` (Eupepsia Place Ltd / Soilless Farm Lab), 11 sheets

## 1. Intent

The processing team runs production from an 11-sheet Excel workbook. Every kind of record in that
workbook must be capturable in the CRM under **Operations → Processing**, so the team can stop using
the workbook for new entries.

**Success criteria**

- Each sheet's record type has a place in Operations → Processing where it can be listed, added and
  (where appropriate) edited.
- Clean reference data from the workbook (products, materials, produce list, statuses) is seeded.
- Stock cards share one stock-on-hand with the existing Inventory module — no second stock system.

**Decisions**

| Decision | Choice |
|---|---|
| Import historical rows? | **No.** Structures + reference data only. Workbook remains the historical record. |
| Linking between records | **Light links.** Optional batch → order request, yield entry → batch. No automatic stock deductions. |
| Stock-card storage | **Existing Inventory module** (`Item` + `InventoryTransaction`). |
| Warehouse/Cold Room location | **Existing "Main Store"** location. |

## 2. Sheet mapping

| Sheet | Lands in | Processing sub-tab |
|---|---|---|
| ORDER REQUEST SHEET - 1 | `ops_order_requests` | Order Requests |
| Batch Production Schedule | `ops_production_batches` | Batch Scheduling |
| PROCESSING ACTIVITIES, 2026 Processing Activities | `ops_yield_entries` (produce = Inventory `Item`) | Yield Log |
| RAW MATERIALS (WAREHOUSECOLDROOM), 2026 Raw Materials | Inventory `Item`s @ **Main Store** | Material Stock |
| RAW MATERIALS (PACKAGING STORE) | Inventory `Item`s @ **Packaging Store** (new) | Material Stock |
| OTHER MATERIALS INVENTORY | Inventory `Item`s @ **Packaging Store** (placement flagged for sign-off) | Material Stock |
| PRODUCT IDENTIFICATION, PRODUCT DURATION | `ops_products` | Products |
| Dropdown keys | `ProcessingStatus` enum | (all status fields) |

## 3. Data model

New entities are `TenantEntity<Guid>` with the `ops_` table prefix.

### 3.1 `ProcessingStatus` (from "Dropdown keys")

`NotStarted = 1, InProgress = 2, Complete = 3, OnHold = 4, Overdue = 5, NeedsReview = 6, NeedsUpdate = 7`

### 3.2 `ops_products` — `ProcessingProduct`

Name (required), ProductCode, Upc, Sku, RawMaterialId, ProcessingDuration (free text, e.g. "12Hrs").

### 3.3 `ops_order_requests` — `OrderRequest`

RequestDate (required), CustomerCode, CustomerName (required), Products (required, multi-line),
ActivitiesRequired, VolumeRequired (free text), DeliveryDate, DeliveryLocation, ProductBatchNumber,
Status, StartDate, DueDate, Duration.

### 3.4 `ops_production_batches` — `ProductionBatch`

OrderRequestId? (light link), ProductId? (light link), RawMaterialBatchId, CustomerCode, CustomerName,
BatchCode, ProductNames (required), ProductCode, Quantity (decimal?), QuantityUnit, QuantityNotes,
StartDate, EndDate, LeadTime, WorkCenters, Operators, TaskDescription, Status, QualityChecks,
DateSent, QuantitySent, LogisticsPersonnel, DeliveryStatus, OnTimeDeliveryPercent (0–100).
`EndDate >= StartDate` when both set.

### 3.5 `ops_yield_entries` — `YieldEntry`

Date (required), ProduceItemId (required → Inventory `Item`), ProductionBatchId? (light link), Shift,
InputQuantity, InputUnit, InputWeightKg, CutWeightKg, DehydratedWeightKg, GrindWeightKg,
SecondGrindWeightKg, WasteKg, Notes. All weights ≥ 0.

Computed on the response, not stored:

- `InputKg` = `InputWeightKg` ?? (`InputQuantity` when `InputUnit` is kg) ?? null
- `OutputKg` = first non-null of SecondGrind → Grind → Dehydrated → Cut
- `YieldPercent` = `OutputKg / InputKg × 100` when both present and `InputKg > 0`
- `WastePercent` = `WasteKg / InputKg × 100`, same guard

### 3.6 Stock cards — existing Inventory

Materials are `Item`s in three new categories: **Processing – Raw Produce**, **Processing –
Ingredients**, **Processing – Packaging & Supplies** (renamed during implementation: the Other Materials
sheet also holds PPE and small tools). Received → `Purchase`; issued out → `Consumption`;
"Where required" → `Notes`. Yield-log produce are Raw Produce items.

## 4. API (`/api/v1/operations/...`, policies `OperationsView` / `OperationsManage`)

| Route | Verbs |
|---|---|
| `/operations/products` | GET, GET {id}, POST, PUT {id}, DELETE {id} |
| `/operations/order-requests` | GET, GET {id}, POST, PUT {id}, DELETE {id} |
| `/operations/batches` | GET, GET {id}, POST, PUT {id}, DELETE {id} |
| `/operations/yield-entries` | GET, GET {id}, POST, PUT {id}, DELETE {id} |
| `/operations/stock-cards` | GET — Items in the Processing categories |
| `/operations/stock-cards/{itemId}` | GET — ledger rows `{ date, opening, received, issued, closing, whereRequired }` |
| `/operations/stock-cards/{itemId}/receive` | POST `{ date, quantity, whereRequired? }` |
| `/operations/stock-cards/{itemId}/issue` | POST `{ date, quantity, whereRequired? }` |

Ledger opening balance = `QuantityOnHand − Σreceived + Σissued`, so the last closing always equals
`QuantityOnHand`. Issue rejects `quantity > QuantityOnHand`; both reject `quantity <= 0` and items
outside the Processing categories. Stock-card postings use their own service (not
`InventoryTransactionService.RecordTransactionAsync`, which ignores the date and clamps at zero).

## 5. Frontend

Processing sub-tabs: Order Requests, Batch Scheduling, Yield Log, Material Stock (overview + stock-card
drawer with Receive/Issue), Products, Machine Usage Logs (unchanged). Seven-status badge map replaces
the old batch statuses. Each section in its own file.

## 6. Reference-data seeding

`tools/import/extract_processing.py` → `Seeds/Data/Eupepsia-Seed-Data/processing/{products,materials}.json`
→ `ProcessingDataSeeder` (SYSTEM tenant, `IgnoreQueryFilters`, idempotent, exact-normalized-name item
reuse, `PROC-0001…` SKUs) → `POST /seed-processing-data` and `Seeder.Intialize()`. Every
created/inferred value logged in `docs/IMPORT-NOTES.md`. Migration `AddOperationsProcessing`
(SqlServer provider, dotnet-ef 9.0.1).

## 7. Validation

Required fields; lengths bounded; quantities/weights ≥ 0; percent ≤ 100; end/due ≥ start.

## 8. Testing

Backend: ledger maths, over-issue rejection, non-processing item rejection, yield maths, validators,
seeder idempotency and reuse. Frontend: each section renders rows/empty state; status map; yield formatting.

## 9. Out of scope

Historical rows; Machine Usage Logs backend; Logistics; Customer entity; automatic stock deduction;
reports/dashboards.
