"use client";

import { useEffect, useState } from "react";
import { PAYMENT_MODES, SaleRecord, fmtNaira, saveErrorMessage } from "./types";
import { Field, FormError, SalesModal, SelectInput, TextInput, TextareaInput } from "./ui";

interface AddSaleModalProps {
  open: boolean;
  submitting?: boolean;
  onCreate: (record: Omit<SaleRecord, "id">) => void | Promise<void>;
  onClose: () => void;
}

const EMPTY = {
  date: "",
  customer: "",
  quantity: "0",
  price: "0",
  paid: "0",
  modeOfPayment: "",
  remarks: "",
};

const num = (v: string) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export default function AddSaleModal({ open, submitting, onCreate, onClose }: AddSaleModalProps) {
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

  const total = num(values.quantity) * num(values.price);
  const balance = total - num(values.paid);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!values.date) next.date = "Date is required";
    if (!values.customer.trim()) next.customer = "Customer is required";
    if (!values.modeOfPayment) next.modeOfPayment = "Select a mode of payment";
    if (num(values.quantity) <= 0) next.quantity = "Enter a quantity above 0";
    if (num(values.price) < 0) next.price = "Enter a price of 0 or more";
    if (num(values.paid) < 0) next.paid = "Enter an amount of 0 or more";
    else if (num(values.paid) > total) next.paid = "Amount paid cannot exceed the total";

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    // The values stay put on failure so a refused save can be retried.
    setSubmitError(null);
    try {
      await onCreate({
        date: values.date,
        customer: values.customer.trim(),
        quantity: num(values.quantity),
        price: num(values.price),
        paid: num(values.paid),
        modeOfPayment: values.modeOfPayment,
        remarks: values.remarks.trim() || undefined,
      });
    } catch (err) {
      setSubmitError(saveErrorMessage(err));
    }
  };

  return (
    <SalesModal
      open={open}
      title="Add Sales Record"
      subtitle="Enter details of the sale"
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel="Add Record"
      submitting={submitting}
    >
      <FormError message={submitError} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Date" required error={errors.date} htmlFor="sale-date">
          <TextInput id="sale-date" type="date" value={values.date} onChange={set("date")} />
        </Field>
        <Field label="Customer" required error={errors.customer} htmlFor="sale-customer">
          <TextInput
            id="sale-customer"
            placeholder="Customer name"
            value={values.customer}
            onChange={set("customer")}
          />
        </Field>
        <Field label="Quantity (crates)" error={errors.quantity} htmlFor="sale-qty">
          <TextInput
            id="sale-qty"
            type="number"
            min={0}
            value={values.quantity}
            onChange={set("quantity")}
          />
        </Field>
        <Field label="Price (&#8358;)" error={errors.price} htmlFor="sale-price">
          <TextInput
            id="sale-price"
            type="number"
            min={0}
            step="any"
            value={values.price}
            onChange={set("price")}
          />
        </Field>
        <Field label="Total (&#8358;) &mdash; auto" htmlFor="sale-total">
          <TextInput id="sale-total" type="number" value={total} readOnly disabled />
        </Field>
        <Field label="Paid (&#8358;)" error={errors.paid} htmlFor="sale-paid">
          <TextInput
            id="sale-paid"
            type="number"
            min={0}
            step="any"
            value={values.paid}
            onChange={set("paid")}
          />
        </Field>
        <Field label="Balance (&#8358;) &mdash; auto" htmlFor="sale-balance">
          <TextInput id="sale-balance" type="number" value={balance} readOnly disabled />
        </Field>
        <Field label="Mode of Payment" required error={errors.modeOfPayment} htmlFor="sale-mode">
          <SelectInput id="sale-mode" value={values.modeOfPayment} onChange={set("modeOfPayment")}>
            <option value="">Select mode</option>
            {PAYMENT_MODES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </SelectInput>
        </Field>
      </div>

      <Field label="Remarks" htmlFor="sale-remarks">
        <TextareaInput
          id="sale-remarks"
          placeholder="Additional notes"
          value={values.remarks}
          onChange={set("remarks")}
        />
      </Field>

      <p className="text-sm text-gray-500">
        Total: <span className="font-semibold text-gray-900">{fmtNaira(total)}</span> &middot;
        Balance:{" "}
        <span className={`font-semibold ${balance > 0 ? "text-red-600" : "text-gray-900"}`}>
          {fmtNaira(balance)}
        </span>
      </p>
    </SalesModal>
  );
}
