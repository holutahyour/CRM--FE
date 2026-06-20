"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { UploadCloud, FileSpreadsheet, Info } from "lucide-react";
import { VStack } from "@chakra-ui/react";
import AppDrawer from "@/components/app/app-drawer";
import { useQuery } from "@/hooks/use-query";
import { useModifyQuery } from "@/hooks/use-modify-query";
import { processExcelFile } from "@/lib/utils";

export const APP_IMPORT_USERS_DRAWER = "imp_users";

/**
 * Scaffold for bulk staff import. Parsing + preview are wired so a staff sheet can be reviewed,
 * but the actual import is intentionally GATED: creating a CRM user requires an Email and a
 * Microsoft Entra (Azure AD) object id per person, neither of which the Role Allocation document
 * provides. Once those columns are supplied AND a backend POST /users/import endpoint exists,
 * enable the submit path (map columns -> CreateUserRequest incl. Position, ManagerId, role).
 */
export default function ImportUsersDrawer() {
  const pathName = usePathname();
  const { router, searchParams, open } = useQuery(APP_IMPORT_USERS_DRAWER, "true");
  const redirectUri = useModifyQuery(null, searchParams, [
    { key: APP_IMPORT_USERS_DRAWER, value: "true" },
  ]);

  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<Record<string, any>[]>([]);

  const discardChange = () => {
    setFileName("");
    setRows([]);
    router.push(pathName.split("?")[0]);
  };

  const handleFile = async (file: File) => {
    try {
      await processExcelFile(file, (data) => {
        setFileName(file.name);
        setRows(Array.isArray(data) ? data : []);
      });
    } catch (e) {
      console.error("Failed to parse staff sheet", e);
    }
  };

  const previewKeys = rows[0] ? Object.keys(rows[0]).slice(0, 5) : [];

  return (
    <AppDrawer
      title="Import Staff / Users"
      placement="end"
      size="md"
      open={open}
      redirectUri={redirectUri}
      cancelQueryKey={APP_IMPORT_USERS_DRAWER}
      // No submit handler yet — import is gated (see notice below).
      hasFooter={false}
    >
      <VStack gap={5} align="stretch" pb={4}>
        <div className="flex items-start gap-2 text-sm rounded-lg px-3 py-3 bg-amber-50 text-amber-800 border border-amber-100">
          <Info className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            Creating users requires an <b>Email</b> and a <b>Microsoft Entra (Azure AD) ID</b> for each
            person — the Role Allocation document does not provide these, so import is disabled for now.
            Add those columns (alongside Name, Position, Role, Department, Manager) to enable it. The
            backend already has <code>Position</code> and <code>ManagerId</code> fields ready for this.
          </span>
        </div>

        <p className="text-sm text-gray-500 -mt-1">
          You can still upload a staff sheet to preview how it will be read.
        </p>

        <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-xl py-10 cursor-pointer hover:border-green-400 hover:bg-green-50/40 transition-colors">
          <UploadCloud className="w-8 h-8 text-green-500" />
          <span className="text-sm font-medium text-gray-600">Click to choose a staff spreadsheet</span>
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
          </div>
        )}

        <button onClick={discardChange} className="text-sm text-gray-500 font-medium hover:underline self-start">
          Close
        </button>
      </VStack>
    </AppDrawer>
  );
}
