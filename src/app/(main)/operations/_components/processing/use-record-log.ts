"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SAVE_FAILED, apiErrorMessage } from "./types";

const USE_MOCK = process.env.NEXT_PUBLIC_DISABLE_MOCK_DATA !== "true";

export const isMockMode = () => USE_MOCK;

export interface RecordLogApi {
  list: () => Promise<any>;
  create?: (data: any) => Promise<any>;
  update?: (id: string, data: any) => Promise<any>;
  remove?: (id: string) => Promise<any>;
}

const asList = <T,>(res: any): T[] | undefined =>
  res?.isSuccess && Array.isArray(res.content) ? (res.content as T[]) : undefined;

/**
 * One Processing record log (order requests, batches, yield entries, products): loads
 * it, and saves/removes through the API when it is live, or locally in mock mode.
 *
 * A save reaches the list only once the API confirms it; a refusal throws an Error
 * carrying the API's reason, which the form shows. Deletes are optimistic and roll
 * back if the API refuses.
 */
export function useRecordLog<T extends { id: string }>(
  api: RecordLogApi,
  mock: T[],
  sort?: (a: T, b: T) => number
) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // The api/sort arguments are module-level constants in practice; a ref keeps the
  // callbacks stable even if a caller passes fresh objects each render.
  const apiRef = useRef(api);
  const sortRef = useRef(sort);
  apiRef.current = api;
  sortRef.current = sort;

  const ordered = useCallback((list: T[]) => (sortRef.current ? [...list].sort(sortRef.current) : list), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (USE_MOCK) {
          setRows(ordered(mock));
          return;
        }
        const list = asList<T>(await apiRef.current.list());
        if (list && !cancelled) setRows(ordered(list));
      } catch (e) {
        console.error("Failed to load processing records", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // `mock` is a module constant; loading once on mount is intended.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ordered]);

  /** Create (id null) or update a record. Throws an Error whose message the form shows. */
  const save = useCallback(
    async (id: string | null, payload: Omit<T, "id">) => {
      setSubmitting(true);
      try {
        let saved = { ...payload, id: id ?? `local-${Date.now()}` } as T;
        if (!USE_MOCK) {
          const call = id ? apiRef.current.update : apiRef.current.create;
          if (!call) throw new Error(SAVE_FAILED);
          let res: any;
          try {
            res = id ? await call(id, payload) : await (call as (d: any) => Promise<any>)(payload);
          } catch (e) {
            console.error("Failed to save processing record", e);
            throw new Error(apiErrorMessage(e));
          }
          if (!res?.isSuccess) throw new Error(apiErrorMessage(res));
          // Create returns the stored record; update only confirms.
          if (!id && res.content && typeof res.content === "object") saved = res.content as T;
        }
        setRows((prev) => ordered(id ? prev.map((r) => (r.id === id ? saved : r)) : [...prev, saved]));
        return saved;
      } finally {
        setSubmitting(false);
      }
    },
    [ordered]
  );

  const remove = useCallback(async (id: string) => {
    let snapshot: T[] = [];
    setRows((prev) => {
      snapshot = prev;
      return prev.filter((r) => r.id !== id);
    });
    if (USE_MOCK || !apiRef.current.remove) return;
    try {
      const res = await apiRef.current.remove(id);
      if (res && res.isSuccess === false) setRows(snapshot);
    } catch (e) {
      console.error("Failed to delete processing record", e);
      setRows(snapshot);
    }
  }, []);

  return { rows, setRows, loading, submitting, save, remove };
}

/** Newest first, by the given date field; undated records last. */
export const byDateDesc =
  <T,>(field: keyof T) =>
  (a: T, b: T) =>
    String(b[field] ?? "").localeCompare(String(a[field] ?? ""));
