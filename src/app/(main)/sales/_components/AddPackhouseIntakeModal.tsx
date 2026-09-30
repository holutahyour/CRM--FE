"use client";

import { useEffect, useState } from "react";
import { PackhouseIntake, intakeAccepted } from "./produce-types";
import { fmtNumber, parseNum, saveErrorMessage } from "./types";
import { Field, FormError, SalesModal, TextInput, TextareaInput } from "./ui";

interface AddPackhouseIntakeModalProps {
  open: boolean;
  submitting?: boolean;
  onCreate: (record: Omit<PackhouseIntake, "id">) => void | Promise<void>;
  onClose: () => void;
}

const EMPTY = {
  date: "",
  produceType: "",
  gradeA: "0",
  gradeB: "0",
  gradeC: "0",
  rejected: "0",
  quantityHarvested: "0",
  remarks: "",
};

const WEIGHTS = ["gradeA", "gradeB", "gradeC", "rejected", "quantityHarvested"] as const;

export default function AddPackhouseIntakeModal({
  open,
  submitting,
  onCreate,
  onClose,
}: AddPackhouseIntakeModalProps) {
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

  const accepted = intakeAccepted({
    gradeA: parseNum(values.gradeA),
    gradeB: parseNum(values.gradeB),
    gradeC: parseNum(values.gradeC),
  });
  const rejected = parseNum(values.rejected);
  const harvested = parseNum(values.quantityHarvested);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!values.date) next.date = "Date is required";
    if (!values.produceType.trim()) next.produceType = "Produce type is required";
    WEIGHTS.forEach((k) => {
      if (parseNum(values[k]) < 0) next[k] = "Enter a weight of 0 or more";
    });
    if (!next.gradeA && accepted + rejected <= 0)
      next.gradeA = "Enter at least one graded or rejected weight";
    if (!next.quantityHarvested && harvested > 0 && accepted + rejected > harvested)
      next.quantityHarvested = `Graded + rejected (${fmtNumber(accepted + rejected)} kg) exceeds the harvest`;

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    // The values stay put on failure so a refused save can be retried.
    setSubmitError(null);
    try {
      await onCreate({
        date: values.date,
        produceType: values.produceType.trim(),
        gradeA: parseNum(values.gradeA),
        gradeB: parseNum(values.gradeB),
        gradeC: parseNum(values.gradeC),
        rejected,
        quantityHarvested: harvested,
        remarks: values.remarks.trim() || undefined,
      });
    } catch (err) {
      setSubmitError(saveErrorMessage(err));
    }
  };

  const weightInput = (key: (typeof WEIGHTS)[number], id: string) => (
    <TextInput id={id} type="number" min={0} step="any" value={values[key]} onChange={set(key)} />
  );

  return (
    <SalesModal
      open={open}
      title="Add Packhouse Intake Record"
      subtitle="Enter produce intake and grading details"
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel="Add Record"
      submitting={submitting}
    >
      <FormError message={submitError} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Date" required error={errors.date} htmlFor="intake-date">
          <TextInput id="intake-date" type="date" value={values.date} onChange={set("date")} />
        </Field>
        <Field label="Produce Type" required error={errors.produceType} htmlFor="intake-type">
          <TextInput
            id="intake-type"
            placeholder="e.g. Habanero"
            value={values.produceType}
            onChange={set("produceType")}
          />
        </Field>
        <Field label="Grade A (kg)" error={errors.gradeA} htmlFor="intake-a">
          {weightInput("gradeA", "intake-a")}
        </Field>
        <Field label="Grade B (kg)" error={errors.gradeB} htmlFor="intake-b">
          {weightInput("gradeB", "intake-b")}
        </Field>
        <Field label="Grade C (kg)" error={errors.gradeC} htmlFor="intake-c">
          {weightInput("gradeC", "intake-c")}
        </Field>
        <Field label="Rejected (kg)" error={errors.rejected} htmlFor="intake-rejected">
          {weightInput("rejected", "intake-rejected")}
        </Field>
        <Field
          label="Quantity Harvested (kg)"
          error={errors.quantityHarvested}
          htmlFor="intake-harvested"
        >
          {weightInput("quantityHarvested", "intake-harvested")}
        </Field>
        <Field label="Accepted (kg) &mdash; auto" htmlFor="intake-accepted">
          <TextInput id="intake-accepted" type="number" value={accepted} readOnly disabled />
        </Field>
        <Field label="Rejected (kg) &mdash; reflected" htmlFor="intake-rejected-reflected">
          <TextInput
            id="intake-rejected-reflected"
            type="number"
            value={rejected}
            readOnly
            disabled
          />
        </Field>
      </div>

      <Field label="Remarks" htmlFor="intake-remarks">
        <TextareaInput
          id="intake-remarks"
          placeholder="Additional notes"
          value={values.remarks}
          onChange={set("remarks")}
        />
      </Field>
    </SalesModal>
  );
}
