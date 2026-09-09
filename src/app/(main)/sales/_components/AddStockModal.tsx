"use client";

import { useEffect, useState } from "react";
import { EGGS_PER_CRATE, StockRecord, saveErrorMessage, toCrates } from "./types";
import { Field, FormError, SalesModal, TextInput } from "./ui";

interface AddStockModalProps {
  open: boolean;
  submitting?: boolean;
  onCreate: (record: Omit<StockRecord, "id">) => void | Promise<void>;
  onClose: () => void;
}

const EMPTY = {
  date: "",
  openingEggs: "0",
  openingCrates: "0",
  produced: "0",
  sold: "0",
  soldCrates: "0",
  loss: "0",
  lossCrates: "0",
};

const num = (v: string) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export default function AddStockModal({
  open,
  submitting,
  onCreate,
  onClose,
}: AddStockModalProps) {
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

  const closing = num(values.openingEggs) + num(values.produced) - num(values.sold) - num(values.loss);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!values.date) next.date = "Date is required";
    (Object.keys(EMPTY) as (keyof typeof EMPTY)[])
      .filter((k) => k !== "date")
      .forEach((k) => {
        if (num(values[k]) < 0) next[k] = "Enter 0 or more";
      });
    if (closing < 0) next.sold = "Sold and lost eggs exceed the stock available";

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    // The values stay put on failure so a refused save can be retried.
    setSubmitError(null);
    try {
      await onCreate({
        date: values.date,
        openingEggs: num(values.openingEggs),
        openingCrates: num(values.openingCrates),
        produced: num(values.produced),
        sold: num(values.sold),
        soldCrates: num(values.soldCrates),
        loss: num(values.loss),
        lossCrates: num(values.lossCrates),
      });
    } catch (err) {
      setSubmitError(saveErrorMessage(err));
    }
  };

  return (
    <SalesModal
      open={open}
      title="Add Stock Record"
      subtitle="Enter daily stock movement data"
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel="Add Record"
      submitting={submitting}
    >
      <FormError message={submitError} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Date" required error={errors.date} htmlFor="stock-date">
          <TextInput id="stock-date" type="date" value={values.date} onChange={set("date")} />
        </Field>
        <Field label="Opening (eggs)" error={errors.openingEggs} htmlFor="stock-opening">
          <TextInput
            id="stock-opening"
            type="number"
            min={0}
            value={values.openingEggs}
            onChange={set("openingEggs")}
          />
        </Field>
        <Field label="Opening (crates)" error={errors.openingCrates} htmlFor="stock-opening-crates">
          <TextInput
            id="stock-opening-crates"
            type="number"
            min={0}
            value={values.openingCrates}
            onChange={set("openingCrates")}
          />
        </Field>
        <Field label="Produced" error={errors.produced} htmlFor="stock-produced">
          <TextInput
            id="stock-produced"
            type="number"
            min={0}
            value={values.produced}
            onChange={set("produced")}
          />
        </Field>
        <Field label="Sold" error={errors.sold} htmlFor="stock-sold">
          <TextInput
            id="stock-sold"
            type="number"
            min={0}
            value={values.sold}
            onChange={set("sold")}
          />
        </Field>
        <Field label="Sold (crates)" error={errors.soldCrates} htmlFor="stock-sold-crates">
          <TextInput
            id="stock-sold-crates"
            type="number"
            min={0}
            value={values.soldCrates}
            onChange={set("soldCrates")}
          />
        </Field>
        <Field label="Loss" error={errors.loss} htmlFor="stock-loss">
          <TextInput
            id="stock-loss"
            type="number"
            min={0}
            value={values.loss}
            onChange={set("loss")}
          />
        </Field>
        <Field label="Loss (crates)" error={errors.lossCrates} htmlFor="stock-loss-crates">
          <TextInput
            id="stock-loss-crates"
            type="number"
            min={0}
            value={values.lossCrates}
            onChange={set("lossCrates")}
          />
        </Field>
        <Field label="Closing (eggs) &mdash; auto" htmlFor="stock-closing">
          <TextInput id="stock-closing" type="number" value={closing} readOnly disabled />
        </Field>
        <Field label="Closing (crates) &mdash; auto" htmlFor="stock-closing-crates">
          <TextInput
            id="stock-closing-crates"
            type="number"
            value={toCrates(closing)}
            readOnly
            disabled
          />
        </Field>
      </div>

      <p className="text-sm text-gray-500">{EGGS_PER_CRATE} eggs = 1 crate.</p>
    </SalesModal>
  );
}
