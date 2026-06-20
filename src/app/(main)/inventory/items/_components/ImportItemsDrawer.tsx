"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react";
import { VStack } from "@chakra-ui/react";
import AppDrawer from "@/components/app/app-drawer";
import { useQuery } from "@/hooks/use-query";
import { useModifyQuery } from "@/hooks/use-modify-query";
import { processExcelFile } from "@/lib/utils";
import apiHandler from "@/data/api/ApiHandler";

export const APP_IMPORT_ITEMS_DRAWER = "imp_items";

interface ImportItemsDrawerProps {
  onImported: () => void;
}

// Reads a value from a row by trying several header aliases (case/space-insensitive).
function pick(row: Record<string, any>, aliases: string[]): string {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const keyByNorm: Record<string, string> = {};
  for (const k of Object.keys(row)) keyByNorm[norm(k)] = k;
  for (const a of aliases) {
    const k = keyByNorm[norm(a)];
    if (k != null && row[k] != null && String(row[k]).trim() !== "") return String(row[k]).trim();
  }
  return "";
}

function toNumber(v: string): number {
  const m = v.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : 0;
}

export default function ImportItemsDrawer({ onImported }: ImportItemsDrawerProps) {
  const pathName = usePathname();
  const { router, searchParams, open } = useQuery(APP_IMPORT_ITEMS_DRAWER, "true");
  const redirectUri = useModifyQuery(null, searchParams, [
    { key: APP_IMPORT_ITEMS_DRAWER, value: "true" },
  ]);

  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const reset = () => {
    setFileName("");
    setRows([]);
    setResult(null);
  };

  const discardChange = () => {
    reset();
    router.push(pathName.split("?")[0]);
  };

  const handleFile = async (file: File) => {
    setResult(null);
    try {
      await processExcelFile(file, (data) => {
        setFileName(file.name);
        setRows(Array.isArray(data) ? data : []);
      });
    } catch (e) {
      console.error("Failed to parse spreadsheet", e);
      setResult({ ok: false, message: "Could not read that file. Please upload a valid .xlsx/.xls." });
    }
  };

  const buildPayload = async () => {
    // Resolve category names -> ids so a "Category" column can be used in the sheet.
    const categoryIdByName: Record<string, string> = {};
    try {
      const catRes = await apiHandler.categories.list();
      const cats = Array.isArray(catRes) ? catRes : catRes?.content ?? [];
      for (const c of cats) {
        if (c?.name && c?.id) categoryIdByName[String(c.name).toLowerCase()] = c.id;
      }
    } catch {
      /* category resolution is best-effort; unknowns are left unset */
    }

    return rows
      .map((r) => {
        const name = pick(r, ["name", "item", "items", "itemname", "description"]);
        if (!name) return null;
        const sku = pick(r, ["sku", "code", "itemcode"]) ||
          `IMP-${name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8)}-${Math.floor(Math.random() * 9000 + 1000)}`;
        const categoryName = pick(r, ["category", "categoryname", "type"]).toLowerCase();
        return {
          code: "", // backend auto-generates when empty
          sku,
          name,
          unitType: pick(r, ["unittype", "unit", "uom"]) || "piece",
          description: pick(r, ["description", "notes"]) || undefined,
          barcode: pick(r, ["barcode"]) || undefined,
          categoryId: categoryName ? categoryIdByName[categoryName] : undefined,
          quantityOnHand: toNumber(pick(r, ["quantityonhand", "quantity", "qty", "qtyreceived", "stock", "initialstock"])),
          costPrice: pick(r, ["costprice", "cost"]) ? toNumber(pick(r, ["costprice", "cost"])) : undefined,
          sellingPrice: pick(r, ["sellingprice", "price"]) ? toNumber(pick(r, ["sellingprice", "price"])) : undefined,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x != null);
  };

  const onSubmit = async () => {
    setImporting(true);
    setResult(null);
    try {
      const payload = await buildPayload();
      if (payload.length === 0) {
        setResult({ ok: false, message: "No rows with an item name were found. Ensure the sheet has a 'Name' (or 'Item') column." });
        return;
      }
      await apiHandler.items.import(payload);
      setResult({ ok: true, message: `Imported ${payload.length} item${payload.length !== 1 ? "s" : ""} successfully.` });
      onImported();
    } catch (e) {
      console.error("Item import failed", e);
      setResult({ ok: false, message: "Import failed. Please check the file and try again." });
    } finally {
      setImporting(false);
    }
  };

  const previewKeys = rows[0] ? Object.keys(rows[0]).slice(0, 4) : [];

  return (
    <AppDrawer
      title="Import Inventory Items"
      placement="end"
      size="md"
      open={open}
      redirectUri={redirectUri}
      cancelQueryKey={APP_IMPORT_ITEMS_DRAWER}
      onSubmit={onSubmit}
      submitLabel={importing ? "Importing..." : `Import ${rows.length ? rows.length + " rows" : ""}`.trim()}
      hasFooter
    >
      <VStack gap={5} align="stretch" pb={4}>
        <p className="text-sm text-green-600 -mt-2">
          Upload an Excel (.xlsx) file. The first sheet is read; columns such as{" "}
          <b>Name/Item, SKU, Unit, Category, Quantity, Cost, Price</b> are mapped automatically.
        </p>

        <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-xl py-10 cursor-pointer hover:border-green-400 hover:bg-green-50/40 transition-colors">
          <UploadCloud className="w-8 h-8 text-green-500" />
          <span className="text-sm font-medium text-gray-600">Click to choose a spreadsheet</span>
          <span className="text-xs text-gray-400">.xlsx or .xls</span>
          <input
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </label>

        {fileName && (
          <div className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
            <FileSpreadsheet className="w-4 h-4 text-green-600" />
            <span className="font-medium">{fileName}</span>
            <span className="text-gray-400">— {rows.length} row{rows.length !== 1 ? "s" : ""}</span>
          </div>
        )}

        {rows.length > 0 && (
          <div className="border border-gray-100 rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  {previewKeys.map((k) => (
                    <th key={k} className="text-left px-3 py-2 font-semibold truncate">{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 5).map((r, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    {previewKeys.map((k) => (
                      <td key={k} className="px-3 py-1.5 text-gray-600 truncate max-w-[140px]">{String(r[k] ?? "")}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 5 && (
              <p className="text-[11px] text-gray-400 px-3 py-1.5 bg-gray-50">…and {rows.length - 5} more</p>
            )}
          </div>
        )}

        {result && (
          <div className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 ${result.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
            {result.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{result.message}</span>
          </div>
        )}

        {result?.ok && (
          <button onClick={discardChange} className="text-sm text-green-600 font-medium hover:underline self-start">
            Done — close
          </button>
        )}
      </VStack>
    </AppDrawer>
  );
}
