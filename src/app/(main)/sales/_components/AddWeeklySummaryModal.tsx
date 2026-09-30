"use client";

import { useEffect, useState } from "react";
import { WeeklySummary } from "./produce-types";
import { parseNum, saveErrorMessage } from "./types";
import { Field, FormError, SalesModal, TextInput } from "./ui";

interface AddWeeklySummaryModalProps {
  open: boolean;
  submitting?: boolean;
  onCreate: (record: Omit<WeeklySummary, "id">) => void | Promise<void>;
  onClose: () => void;
}

const EMPTY = { weekStart: "", weekEnd: "", totalSales: "0", totalPaid: "0" };

export default function AddWeeklySummaryModal({
  open,
  submitting,
  onCreate,
  onClose,
}: AddWeeklySummaryModalProps) {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setValues(EMPTY);
      setErrors({});
      setSubmitError(null);
    }
  }, [open]);

  const set = (key: keyof typeof EMPTY) => (e: { target: { value: string } }) =>
    setValues((prev) => ({ ...prev, [key]: e.target.value }));

  const totalSales = parseNum(values.totalSales);
  const totalPaid = parseNum(values.totalPaid);
  const balance = totalSales - totalPaid;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!values.weekStart) next.weekStart = "Week start is required";
    if (!values.weekEnd) next.weekEnd = "Week end is required";
    else if (values.weekStart && values.weekEnd < values.weekStart)
      next.weekEnd = "Week end cannot be before week start";
    if (totalSales < 0) next.totalSales = "Enter an amount of 0 or more";
    if (totalPaid < 0) next.totalPaid = "Enter an amount of 0 or more";
    else if (totalPaid > totalSales) next.totalPaid = "Total paid cannot exceed total sales";

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    // The values stay put on failure so a refused save can be retried.
    setSubmitError(null);
    try {
      await onCreate({ weekStart: values.weekStart, weekEnd: values.weekEnd, totalSales, totalPaid });
    } catch (err) {
      setSubmitError(saveErrorMessage(err));
    }
  };

  return (
    <SalesModal
      open={open}
      title="Add Weekly Sales Summary"
      subtitle="Enter weekly aggregate sales data"
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel="Add Week"
      submitting={submitting}
    >
      <FormError message={submitError} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Week Start" required error={errors.weekStart} htmlFor="week-start">
          <TextInput
            id="week-start"
            type="date"
            value={values.weekStart}
            onChange={set("weekStart")}
          />
        </Field>
        <Field label="Week End" required error={errors.weekEnd} htmlFor="week-end">
          <TextInput id="week-end" type="date" value={values.weekEnd} onChange={set("weekEnd")} />
        </Field>
        <Field label="Total Sales (&#8358;)" error={errors.totalSales} htmlFor="week-sales">
          <TextInput
            id="week-sales"
            type="number"
            min={0}
            step="any"
            value={values.totalSales}
            onChange={set("totalSales")}
          />
        </Field>
        <Field label="Total Paid (&#8358;)" error={errors.totalPaid} htmlFor="week-paid">
          <TextInput
            id="week-paid"
            type="number"
            min={0}
            step="any"
            value={values.totalPaid}
            onChange={set("totalPaid")}
          />
        </Field>
      </div>

      <Field label="Balance (&#8358;) &mdash; auto" htmlFor="week-balance">
        <TextInput id="week-balance" type="number" value={balance} readOnly disabled />
      </Field>
    </SalesModal>
  );
}
