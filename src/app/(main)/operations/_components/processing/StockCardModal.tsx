"use client";

import { useEffect, useState } from "react";
import { Loader, X } from "lucide-react";
import apiHandler from "@/data/api/ApiHandler";
import { fmtDate, fmtNumber, fmtText } from "../types";
import { Field, PrimaryButton, TextInput } from "../ui";
import { StockCard, StockCardItem, StockMovement, apiErrorMessage } from "./types";
import { isMockMode } from "./use-record-log";

/**
 * One material's stock card — the workbook's OPENING / RECEIVED / ISSUED OUT / CLOSING /
 * WHERE REQUIRED ledger — with Receive and Issue. Balances come from the API, which
 * replays Inventory transactions; nothing here computes stock except in mock mode.
 */
export default function StockCardModal({
  item,
  onChanged,
  onClose,
}: {
  item: StockCardItem;
  /** Called with the item's new on-hand figure after a posting. */
  onChanged: (item: StockCardItem) => void;
  onClose: () => void;
}) {
  const [card, setCard] = useState<StockCard>({ item, rows: [] });
  const [loading, setLoading] = useState(!isMockMode());
  const [values, setValues] = useState({ date: "", quantity: "", whereRequired: "" });
  const [error, setError] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (isMockMode()) return;
    let cancelled = false;
    apiHandler.operations
      .getStockCard(item.id)
      .then((res: any) => {
        if (!cancelled && res?.isSuccess && res.content) setCard(res.content);
      })
      .catch((e: unknown) => console.error("Failed to load stock card", e))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [item.id]);

  const set = (key: keyof typeof values) => (e: { target: { value: string } }) =>
    setValues((prev) => ({ ...prev, [key]: e.target.value }));

  const post = async (kind: "receive" | "issue") => {
    const quantity = Number(values.quantity);
    if (!values.date) return setError("Date is required");
    if (!values.quantity || !Number.isFinite(quantity) || quantity <= 0)
      return setError("Quantity must be greater than zero");
    setError("");

    const movement: StockMovement = {
      date: values.date,
      quantity,
      ...(values.whereRequired.trim() ? { whereRequired: values.whereRequired.trim() } : {}),
    };

    setPosting(true);
    try {
      let next: StockCard;
      if (isMockMode()) {
        next = mockPost(card, movement, kind);
      } else {
        const call = kind === "receive" ? apiHandler.operations.receiveStock : apiHandler.operations.issueStock;
        let res: any;
        try {
          res = await call(item.id, movement);
        } catch (e) {
          throw new Error(apiErrorMessage(e));
        }
        if (!res?.isSuccess || !res.content) throw new Error(apiErrorMessage(res));
        next = res.content;
      }
      setCard(next);
      onChanged(next.item);
      setValues({ date: values.date, quantity: "", whereRequired: "" });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPosting(false);
    }
  };

  const unit = card.item.unitType;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={card.item.name}
        className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 space-y-5"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900">{card.item.name}</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {[card.item.sku, card.item.categoryName, card.item.locationName].filter(Boolean).join(" · ")}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="rounded-xl bg-green-50 border border-green-100 px-4 py-3">
          <p className="text-xs font-medium text-green-800 uppercase tracking-wide">On hand</p>
          <p className="text-2xl font-bold text-green-900">
            {fmtNumber(card.item.quantityOnHand)} <span className="text-base font-medium">{unit}</span>
          </p>
        </div>

        <div className="bg-white border border-gray-100 rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                {["Date", "Opening", "Received", "Issued", "Closing", "Where Required"].map((c) => (
                  <th key={c} scope="col" className="text-left font-semibold text-gray-600 px-4 py-2.5 whitespace-nowrap">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center">
                    <Loader className="w-5 h-5 text-green-500 animate-spin inline" />
                  </td>
                </tr>
              ) : card.rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-sm text-gray-400 py-8">
                    No movements recorded on this card yet.
                  </td>
                </tr>
              ) : (
                card.rows.map((r) => (
                  <tr key={r.transactionId} className="border-t border-gray-100">
                    <td className="px-4 py-2.5 whitespace-nowrap">{fmtDate(r.date)}</td>
                    <td className="px-4 py-2.5 text-right">{fmtNumber(r.opening)}</td>
                    <td className="px-4 py-2.5 text-right text-green-700">{r.received ? fmtNumber(r.received) : "—"}</td>
                    <td className="px-4 py-2.5 text-right text-red-600">{r.issued ? fmtNumber(r.issued) : "—"}</td>
                    <td className="px-4 py-2.5 text-right font-semibold">{fmtNumber(r.closing)}</td>
                    <td className="px-4 py-2.5">{fmtText(r.whereRequired)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-900">Record a movement</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Date" required htmlFor="stock-date">
              <TextInput id="stock-date" type="date" value={values.date} onChange={set("date")} />
            </Field>
            <Field label={`Quantity (${unit})`} required htmlFor="stock-qty">
              <TextInput id="stock-qty" type="number" min={0} step="any" value={values.quantity} onChange={set("quantity")} />
            </Field>
            <Field label="Where Required" htmlFor="stock-where">
              <TextInput
                id="stock-where"
                placeholder="e.g. Processing facility"
                value={values.whereRequired}
                onChange={set("whereRequired")}
              />
            </Field>
          </div>
          {error && (
            <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <PrimaryButton type="button" disabled={posting} onClick={() => post("receive")}>
              Receive
            </PrimaryButton>
            <button
              type="button"
              disabled={posting}
              onClick={() => post("issue")}
              className="inline-flex items-center gap-2 bg-white text-red-600 border border-red-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Issue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Mock mode only: post locally with the same rules the API enforces. */
function mockPost(card: StockCard, m: StockMovement, kind: "receive" | "issue"): StockCard {
  const onHand = card.item.quantityOnHand;
  if (kind === "issue" && m.quantity > onHand)
    throw new Error(`Cannot issue ${m.quantity} ${card.item.unitType} of ${card.item.name}: only ${onHand} ${card.item.unitType} on hand.`);
  const closing = kind === "receive" ? onHand + m.quantity : onHand - m.quantity;
  return {
    item: { ...card.item, quantityOnHand: closing },
    rows: [
      ...card.rows,
      {
        transactionId: `local-${Date.now()}`,
        date: m.date,
        opening: onHand,
        received: kind === "receive" ? m.quantity : 0,
        issued: kind === "issue" ? m.quantity : 0,
        closing,
        whereRequired: m.whereRequired ?? null,
      },
    ],
  };
}
