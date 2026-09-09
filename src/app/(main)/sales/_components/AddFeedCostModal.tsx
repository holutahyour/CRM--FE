"use client";

import { useEffect, useState } from "react";
import { FeedCostRecord, fmtNaira, saveErrorMessage } from "./types";
import { Field, FormError, SalesModal, TextInput } from "./ui";

interface AddFeedCostModalProps {
  open: boolean;
  submitting?: boolean;
  onCreate: (record: Omit<FeedCostRecord, "id">) => void | Promise<void>;
  onClose: () => void;
}

const EMPTY = { date: "", feedType: "", quantity: "0", costPerBag: "0" };

const num = (v: string) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export default function AddFeedCostModal({
  open,
  submitting,
  onCreate,
  onClose,
}: AddFeedCostModalProps) {
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

  const total = num(values.quantity) * num(values.costPerBag);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!values.date) next.date = "Date is required";
    if (!values.feedType.trim()) next.feedType = "Feed type is required";
    if (num(values.quantity) <= 0) next.quantity = "Enter a quantity above 0";
    if (num(values.costPerBag) < 0) next.costPerBag = "Enter a cost of 0 or more";

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    // The values stay put on failure so a refused save can be retried.
    setSubmitError(null);
    try {
      await onCreate({
        date: values.date,
        feedType: values.feedType.trim(),
        quantity: num(values.quantity),
        costPerBag: num(values.costPerBag),
      });
    } catch (err) {
      setSubmitError(saveErrorMessage(err));
    }
  };

  return (
    <SalesModal
      open={open}
      title="Add Feed Cost Record"
      subtitle="Enter feed purchase details"
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel="Add Record"
      submitting={submitting}
      size="md"
    >
      <FormError message={submitError} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Date" required error={errors.date} htmlFor="feed-date">
          <TextInput id="feed-date" type="date" value={values.date} onChange={set("date")} />
        </Field>
        <Field label="Feed Type" required error={errors.feedType} htmlFor="feed-type">
          <TextInput
            id="feed-type"
            placeholder="e.g. Layers Mash"
            value={values.feedType}
            onChange={set("feedType")}
          />
        </Field>
        <Field label="Quantity (bags)" error={errors.quantity} htmlFor="feed-qty">
          <TextInput
            id="feed-qty"
            type="number"
            min={0}
            value={values.quantity}
            onChange={set("quantity")}
          />
        </Field>
        <Field label="Cost per Bag (&#8358;)" error={errors.costPerBag} htmlFor="feed-cost">
          <TextInput
            id="feed-cost"
            type="number"
            min={0}
            step="any"
            value={values.costPerBag}
            onChange={set("costPerBag")}
          />
        </Field>
      </div>

      <Field label="Total Cost (&#8358;) &mdash; auto" htmlFor="feed-total">
        <TextInput id="feed-total" type="number" value={total} readOnly disabled />
      </Field>

      <p className="text-sm text-gray-500">
        Total cost: <span className="font-semibold text-gray-900">{fmtNaira(total)}</span>
      </p>
    </SalesModal>
  );
}
