"use client";

import { useMemo, useState } from "react";
import apiHandler from "@/data/api/ApiHandler";
import { APP_STOCK_CARD_MODAL } from "@/lib/routes";
import { fmtNumber, fmtText } from "../types";
import { SectionHeader, TableShell, TextInput } from "../ui";
import { useOperationsModal } from "../use-operations-modal";
import StockCardModal from "./StockCardModal";
import { MOCK_STOCK_CARDS, PROCESSING_CATEGORIES, StockCardItem } from "./types";
import { useRecordLog } from "./use-record-log";

const STOCK_API = { list: () => apiHandler.operations.listStockCards() };
const COLUMNS = ["Material", "SKU", "Unit", "Location", "On Hand"];
const cell = "px-4 py-3 whitespace-nowrap text-gray-700";

/**
 * The workbook's stock-card sheets (Warehouse/Cold Room, Packaging Store, Other Materials),
 * as the Inventory items in the three Processing categories. Stock is Inventory's
 * on-hand figure, so it matches the Inventory module.
 */
export default function MaterialStockSection() {
  const { rows, setRows } = useRecordLog<StockCardItem>(STOCK_API, MOCK_STOCK_CARDS);
  const modal = useOperationsModal(APP_STOCK_CARD_MODAL);
  const [search, setSearch] = useState("");

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const match = (i: StockCardItem) => !q || i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q);
    return PROCESSING_CATEGORIES.map((category) => ({
      category,
      items: rows
        .filter((i) => i.categoryName === category && match(i))
        .sort((a, b) => a.name.localeCompare(b.name)),
    }));
  }, [rows, search]);

  const open = modal.value ? rows.find((i) => i.id === modal.value) : undefined;

  return (
    <div className="space-y-6">
      {open && (
        <StockCardModal
          item={open}
          onClose={modal.close}
          onChanged={(item) => setRows((prev) => prev.map((i) => (i.id === item.id ? { ...i, ...item } : i)))}
        />
      )}

      <SectionHeader
        title="Material Stock"
        subtitle="Stock cards for raw produce, ingredients, and packaging & supplies"
      />

      <div className="max-w-sm">
        <label htmlFor="material-search" className="sr-only">
          Search materials
        </label>
        <TextInput
          id="material-search"
          placeholder="Search materials or SKU"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {groups.map(({ category, items }) => (
        <section key={category} className="space-y-3">
          <h3 className="text-base font-bold text-gray-900">{category}</h3>
          <TableShell
            columns={COLUMNS}
            isEmpty={items.length === 0}
            emptyMessage={search ? "No materials match." : "No materials in this category."}
          >
            {items.map((i) => (
              <tr key={i.id} className="border-t border-gray-100">
                <td className={cell}>
                  <button
                    type="button"
                    aria-label={`Open stock card for ${i.name}`}
                    onClick={() => modal.open(i.id)}
                    className="font-medium text-gray-900 hover:text-green-700 hover:underline text-left"
                  >
                    {i.name}
                  </button>
                </td>
                <td className={cell}>{i.sku}</td>
                <td className={cell}>{i.unitType}</td>
                <td className={cell}>{fmtText(i.locationName)}</td>
                <td className={`${cell} text-right font-semibold`}>{fmtNumber(i.quantityOnHand)}</td>
              </tr>
            ))}
          </TableShell>
        </section>
      ))}
    </div>
  );
}
