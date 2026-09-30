"use client";

import { useEffect, useState } from "react";
import {
  PAYMENT_STATUSES,
  PRODUCE_CATEGORIES,
  PRODUCE_GRADES,
  ProduceSale,
} from "./produce-types";
import { PAYMENT_MODES, fmtNaira, parseNum, saveErrorMessage } from "./types";
import { Field, FormError, SalesModal, SelectInput, TextInput } from "./ui";

interface AddProduceSaleModalProps {
  open: boolean;
  submitting?: boolean;
  onCreate: (record: Omit<ProduceSale, "id">) => void | Promise<void>;
  onClose: () => void;
}

const EMPTY = {
  date: "",
  customer: "",
  location: "",
  produceType: "",
  grade: "",
  category: "",
  quantity: "0",
  pricePerKg: "0",
  paid: "0",
  modeOfPayment: "",
  paymentStatus: "",
};

function Options({ placeholder, values }: { placeholder: string; values: readonly string[] }) {
  return (
    <>
      <option value="">{placeholder}</option>
      {values.map((v) => (
        <option key={v} value={v}>
          {v}
        </option>
      ))}
    </>
  );
}

export default function AddProduceSaleModal({
  open,
  submitting,
  onCreate,
  onClose,
}: AddProduceSaleModalProps) {
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

  const total = parseNum(values.quantity) * parseNum(values.pricePerKg);
  const balance = total - parseNum(values.paid);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!values.date) next.date = "Date is required";
    if (!values.customer.trim()) next.customer = "Customer is required";
    if (!values.category) next.category = "Select a product category";
    if (!values.modeOfPayment) next.modeOfPayment = "Select a payment mode";
    if (!values.paymentStatus) next.paymentStatus = "Select a payment status";
    if (parseNum(values.quantity) <= 0) next.quantity = "Enter a quantity above 0";
    if (parseNum(values.pricePerKg) < 0) next.pricePerKg = "Enter a price of 0 or more";
    if (parseNum(values.paid) < 0) next.paid = "Enter an amount of 0 or more";
    else if (parseNum(values.paid) > total) next.paid = "Amount paid cannot exceed the total";

    // The status is chosen by hand, so hold it to the figures it describes.
    if (!next.paymentStatus && !next.paid && !next.quantity) {
      if (values.paymentStatus === "Fully Paid" && balance > 0)
        next.paymentStatus = `A balance of ${fmtNaira(balance)} is still owed`;
      if (values.paymentStatus === "Outstanding" && balance <= 0)
        next.paymentStatus = "Nothing is outstanding on this sale";
    }

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    // The values stay put on failure so a refused save can be retried.
    setSubmitError(null);
    try {
      await onCreate({
        date: values.date,
        customer: values.customer.trim(),
        location: values.location.trim() || undefined,
        produceType: values.produceType.trim() || undefined,
        grade: values.grade || undefined,
        category: values.category,
        quantity: parseNum(values.quantity),
        pricePerKg: parseNum(values.pricePerKg),
        paid: parseNum(values.paid),
        modeOfPayment: values.modeOfPayment,
        paymentStatus: values.paymentStatus,
      });
    } catch (err) {
      setSubmitError(saveErrorMessage(err));
    }
  };

  return (
    <SalesModal
      open={open}
      title="Add Fresh Produce Sale"
      subtitle="Enter fresh produce sale details"
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel="Add Record"
      submitting={submitting}
    >
      <FormError message={submitError} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Date" required error={errors.date} htmlFor="psale-date">
          <TextInput id="psale-date" type="date" value={values.date} onChange={set("date")} />
        </Field>
        <Field label="Customer" required error={errors.customer} htmlFor="psale-customer">
          <TextInput
            id="psale-customer"
            placeholder="Customer name"
            value={values.customer}
            onChange={set("customer")}
          />
        </Field>
        <Field label="Location" htmlFor="psale-location">
          <TextInput
            id="psale-location"
            placeholder="City / State"
            value={values.location}
            onChange={set("location")}
          />
        </Field>
        <Field label="Produce Type" htmlFor="psale-type">
          <TextInput
            id="psale-type"
            placeholder="e.g. Habanero"
            value={values.produceType}
            onChange={set("produceType")}
          />
        </Field>
        <Field label="Grade" htmlFor="psale-grade">
          <SelectInput id="psale-grade" value={values.grade} onChange={set("grade")}>
            <Options placeholder="Select grade" values={PRODUCE_GRADES} />
          </SelectInput>
        </Field>
        <Field label="Product Category" required error={errors.category} htmlFor="psale-category">
          <SelectInput id="psale-category" value={values.category} onChange={set("category")}>
            <Options placeholder="Select category" values={PRODUCE_CATEGORIES} />
          </SelectInput>
        </Field>
        <Field label="Qty Sold (kg)" error={errors.quantity} htmlFor="psale-qty">
          <TextInput
            id="psale-qty"
            type="number"
            min={0}
            step="any"
            value={values.quantity}
            onChange={set("quantity")}
          />
        </Field>
        <Field label="Price/kg (&#8358;)" error={errors.pricePerKg} htmlFor="psale-price">
          <TextInput
            id="psale-price"
            type="number"
            min={0}
            step="any"
            value={values.pricePerKg}
            onChange={set("pricePerKg")}
          />
        </Field>
        <Field label="Total (&#8358;) &mdash; auto" htmlFor="psale-total">
          <TextInput id="psale-total" type="number" value={total} readOnly disabled />
        </Field>
        <Field label="Paid (&#8358;)" error={errors.paid} htmlFor="psale-paid">
          <TextInput
            id="psale-paid"
            type="number"
            min={0}
            step="any"
            value={values.paid}
            onChange={set("paid")}
          />
        </Field>
        <Field label="Balance (&#8358;) &mdash; auto" htmlFor="psale-balance">
          <TextInput id="psale-balance" type="number" value={balance} readOnly disabled />
        </Field>
        <Field
          label="Remarks (Payment Mode)"
          required
          error={errors.modeOfPayment}
          htmlFor="psale-mode"
        >
          <SelectInput id="psale-mode" value={values.modeOfPayment} onChange={set("modeOfPayment")}>
            <Options placeholder="Select mode" values={PAYMENT_MODES} />
          </SelectInput>
        </Field>
        <Field label="Payment Status" required error={errors.paymentStatus} htmlFor="psale-status">
          <SelectInput
            id="psale-status"
            value={values.paymentStatus}
            onChange={set("paymentStatus")}
          >
            <Options placeholder="Select status" values={PAYMENT_STATUSES} />
          </SelectInput>
        </Field>
      </div>
    </SalesModal>
  );
}
