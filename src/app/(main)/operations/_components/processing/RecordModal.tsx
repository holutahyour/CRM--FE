"use client";

import { useEffect, useState } from "react";
import { Field, OperationsModal, SelectInput, TextInput, TextareaInput } from "../ui";

export interface FieldOption {
  value: string;
  label: string;
}

/** One form field. Every Processing record form is described by a list of these. */
export interface FieldSpec {
  key: string;
  label: string;
  kind: "text" | "textarea" | "date" | "number" | "select";
  required?: boolean;
  placeholder?: string;
  /** Spans both grid columns (long free text). */
  wide?: boolean;
  /** number: upper bound (lower bound is always 0). */
  max?: number;
  /** select: the choices; `emptyLabel` adds a leading "none" choice that sends null. */
  options?: FieldOption[];
  emptyLabel?: string;
}

export type FormValues = Record<string, string>;

interface RecordModalProps {
  open: boolean;
  title: string;
  subtitle?: string;
  submitLabel: string;
  fields: FieldSpec[];
  /** The record being edited (or defaults for a new one); null/undefined for an empty form. */
  initial?: object | null;
  /** Cross-field rules; returns field-key → message. */
  validate?: (values: FormValues) => Record<string, string>;
  submitting?: boolean;
  /** Receives the payload (blank → null, numbers parsed). Throw to show a message in the form. */
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
}

const toValues = (fields: FieldSpec[], initial?: object | null): FormValues =>
  Object.fromEntries(
    fields.map((f) => {
      const v = (initial as Record<string, unknown> | null | undefined)?.[f.key];
      if (v !== undefined && v !== null && v !== "") return [f.key, String(v).slice(0, f.kind === "date" ? 10 : undefined)];
      if (f.kind === "select" && !f.emptyLabel && f.options?.length) return [f.key, f.options[0].value];
      return [f.key, ""];
    })
  );

const toPayload = (fields: FieldSpec[], values: FormValues) =>
  Object.fromEntries(
    fields.map((f) => {
      const raw = (values[f.key] ?? "").trim();
      if (raw === "") return [f.key, null];
      return [f.key, f.kind === "number" ? Number(raw) : raw];
    })
  );

export default function RecordModal({
  open,
  title,
  subtitle,
  submitLabel,
  fields,
  initial,
  validate,
  submitting,
  onSubmit,
  onClose,
}: RecordModalProps) {
  const [values, setValues] = useState<FormValues>(() => toValues(fields, initial));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");

  // Reset whenever the modal opens or switches to a different record (an edited record
  // may arrive after the modal opened, when the list finishes loading).
  const initialId = ((initial as { id?: string } | null | undefined)?.id) ?? "";
  useEffect(() => {
    if (!open) return;
    setValues(toValues(fields, initial));
    setErrors({});
    setFormError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialId]);

  const set = (key: string) => (e: { target: { value: string } }) =>
    setValues((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    for (const f of fields) {
      const raw = (values[f.key] ?? "").trim();
      if (f.required && raw === "") {
        next[f.key] = `${f.label} is required`;
        continue;
      }
      if (f.kind === "number" && raw !== "") {
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 0) next[f.key] = "Enter 0 or more";
        else if (f.max !== undefined && n > f.max) next[f.key] = `Enter ${f.max} or less`;
      }
    }
    Object.assign(next, validate?.(values) ?? {});
    setErrors(next);
    setFormError("");
    if (Object.keys(next).length > 0) return;

    try {
      await onSubmit(toPayload(fields, values));
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <OperationsModal
      open={open}
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel={submitLabel}
      submitting={submitting}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fields.map((f) => {
          const id = `rec-${f.key}`;
          return (
            <div key={f.key} className={f.wide ? "sm:col-span-2" : undefined}>
              <Field label={f.label} required={f.required} error={errors[f.key]} htmlFor={id}>
                {f.kind === "textarea" ? (
                  <TextareaInput id={id} placeholder={f.placeholder} value={values[f.key] ?? ""} onChange={set(f.key)} />
                ) : f.kind === "select" ? (
                  <SelectInput id={id} value={values[f.key] ?? ""} onChange={set(f.key)}>
                    {f.emptyLabel !== undefined && <option value="">{f.emptyLabel}</option>}
                    {f.options?.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </SelectInput>
                ) : (
                  <TextInput
                    id={id}
                    type={f.kind}
                    min={f.kind === "number" ? 0 : undefined}
                    max={f.kind === "number" ? f.max : undefined}
                    step={f.kind === "number" ? "any" : undefined}
                    placeholder={f.placeholder}
                    value={values[f.key] ?? ""}
                    onChange={set(f.key)}
                  />
                )}
              </Field>
            </div>
          );
        })}
      </div>

      {formError && (
        <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {formError}
        </p>
      )}
    </OperationsModal>
  );
}

/** "end must not precede start" rule for a pair of date fields. */
export const dateOrderRule =
  (startKey: string, endKey: string, message: string) =>
  (values: FormValues): Record<string, string> =>
    values[startKey] && values[endKey] && values[endKey] < values[startKey] ? { [endKey]: message } : {};
