"use client";

import React, { useCallback, useState } from "react";
import { SAVE_FAILED } from "./types";

export const USE_MOCK = process.env.NEXT_PUBLIC_DISABLE_MOCK_DATA !== "true";

export const asList = <T,>(res: any): T[] | undefined =>
  res?.isSuccess && Array.isArray(res.content) ? (res.content as T[]) : undefined;

/**
 * Create and delete for the Sales record logs, shared by the EPL Poultry and
 * Fresh Produce providers. Rows are kept sorted by `sortKey` (the record's
 * date, by default) so the newest record reads last.
 */
export function useRecordStore() {
  const [submitting, setSubmitting] = useState(false);

  /**
   * Create through the API when it is live, otherwise fall back to a local id.
   *
   * Nothing reaches the table until the API confirms the record was stored — a
   * refused save has to raise, or the tab would show a row that only exists in
   * this browser and disappears on the next refresh. The message thrown is the
   * one the form shows, so it carries the API's reason when it gives one.
   */
  const create = useCallback(
    async <T extends { id: string }>(
      record: Omit<T, "id">,
      prefix: string,
      call: (data: any) => Promise<any>,
      setRows: React.Dispatch<React.SetStateAction<T[]>>,
      sortKey: (row: T) => string = (row: any) => row.date
    ) => {
      setSubmitting(true);
      try {
        let created = { ...record, id: `${prefix}-${Date.now()}` } as T;
        if (!USE_MOCK) {
          let res: any;
          try {
            res = await call(record);
          } catch (e) {
            // A transport failure has no reason worth showing the user.
            console.error(`Failed to add ${prefix} record`, e);
            throw new Error(SAVE_FAILED);
          }
          if (!res?.isSuccess) throw new Error(res?.message?.trim() || SAVE_FAILED);
          if (res.content) created = res.content as T;
        }
        setRows((prev) =>
          [...prev, created].sort((a, b) => sortKey(a).localeCompare(sortKey(b)))
        );
      } finally {
        setSubmitting(false);
      }
    },
    []
  );

  /** Optimistic delete — the row goes immediately and comes back if the API refuses. */
  const remove = useCallback(
    async <T extends { id: string }>(
      id: string,
      rows: T[],
      call: (id: string) => Promise<any>,
      setRows: React.Dispatch<React.SetStateAction<T[]>>
    ) => {
      const snapshot = rows;
      setRows(rows.filter((r) => r.id !== id));
      if (USE_MOCK) return;
      try {
        const res = await call(id);
        if (res && res.isSuccess === false) setRows(snapshot);
      } catch (e) {
        console.error("Failed to delete record", e);
        setRows(snapshot);
      }
    },
    []
  );

  return { submitting, create, remove };
}
