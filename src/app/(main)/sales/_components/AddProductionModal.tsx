"use client";

import { useEffect, useState } from "react";
import { DailyProduction, saveErrorMessage } from "./types";
import { Field, FormError, SalesModal, TextInput } from "./ui";

interface AddProductionModalProps {
  open: boolean;
  submitting?: boolean;
  onCreate: (record: Omit<DailyProduction, "id">) => void | Promise<void>;
  onClose: () => void;
}

const EMPTY = {
  date: "",
  openingBirds: "0",
  eggsMorning: "0",
  totalEggs: "0",
  totalEggsCrates: "0",
  cracked: "0",
  bad: "0",
  smallEggs: "0",
};

const num = (v: string) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export default function AddProductionModal({
  open,
  submitting,
  onCreate,
  onClose,
}: AddProductionModalProps) {
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

  const totalLoss = num(values.cracked) + num(values.bad);
  const goodEggs = Math.max(0, num(values.totalEggs) - totalLoss - num(values.smallEggs));

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!values.date) next.date = "Date is required";
    (["openingBirds", "eggsMorning", "totalEggs", "totalEggsCrates", "cracked", "bad", "smallEggs"] as const).forEach(
      (k) => {
        if (num(values[k]) < 0) next[k] = "Enter 0 or more";
      }
    );
    if (totalLoss + num(values.smallEggs) > num(values.totalEggs))
      next.totalEggs = "Losses and small eggs exceed the day's total eggs";

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    // The values stay put on failure so a refused save can be retried.
    setSubmitError(null);
    try {
      await onCreate({
        date: values.date,
        openingBirds: num(values.openingBirds),
        eggsMorning: num(values.eggsMorning),
        totalEggs: num(values.totalEggs),
        totalEggsCrates: num(values.totalEggsCrates),
        cracked: num(values.cracked),
        bad: num(values.bad),
        smallEggs: num(values.smallEggs),
      });
    } catch (err) {
      setSubmitError(saveErrorMessage(err));
    }
  };

  return (
    <SalesModal
      open={open}
      title="Add Daily Production Record"
      subtitle="Enter production data for the day"
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel="Add Record"
      submitting={submitting}
    >
      <FormError message={submitError} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Date" required error={errors.date} htmlFor="prod-date">
          <TextInput id="prod-date" type="date" value={values.date} onChange={set("date")} />
        </Field>
        <Field label="Opening Birds" error={errors.openingBirds} htmlFor="prod-birds">
          <TextInput id="prod-birds" type="number" min={0} value={values.openingBirds} onChange={set("openingBirds")} />
        </Field>
        <Field label="Eggs (Morning)" error={errors.eggsMorning} htmlFor="prod-morning">
          <TextInput id="prod-morning" type="number" min={0} value={values.eggsMorning} onChange={set("eggsMorning")} />
        </Field>
        <Field label="Total Eggs" error={errors.totalEggs} htmlFor="prod-total">
          <TextInput id="prod-total" type="number" min={0} value={values.totalEggs} onChange={set("totalEggs")} />
        </Field>
        <Field label="Total Eggs (Crates)" error={errors.totalEggsCrates} htmlFor="prod-crates">
          <TextInput id="prod-crates" type="number" min={0} value={values.totalEggsCrates} onChange={set("totalEggsCrates")} />
        </Field>
        <Field label="Cracked" error={errors.cracked} htmlFor="prod-cracked">
          <TextInput id="prod-cracked" type="number" min={0} value={values.cracked} onChange={set("cracked")} />
        </Field>
        <Field label="Bad" error={errors.bad} htmlFor="prod-bad">
          <TextInput id="prod-bad" type="number" min={0} value={values.bad} onChange={set("bad")} />
        </Field>
        <Field label="Total Loss (auto-calculated)" htmlFor="prod-loss">
          <TextInput id="prod-loss" type="number" value={totalLoss} readOnly disabled />
        </Field>
        <Field label="Small Eggs" error={errors.smallEggs} htmlFor="prod-small">
          <TextInput id="prod-small" type="number" min={0} value={values.smallEggs} onChange={set("smallEggs")} />
        </Field>
        <Field label="Good Eggs (auto-calculated)" htmlFor="prod-good">
          <TextInput id="prod-good" type="number" value={goodEggs} readOnly disabled />
        </Field>
      </div>
    </SalesModal>
  );
}
