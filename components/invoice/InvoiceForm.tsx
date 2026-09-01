"use client";

import { useActionState, useState } from "react";
import {
  createInvoice,
  updateInvoice,
  type CreateInvoiceState,
} from "@/actions/invoice.actions";
import type { Invoice, WorkLogItem } from "@/app/generated/prisma/client";

type LineItemRow = {
  date: string;
  description: string;
  hours: string;
  rate: string;
};

const emptyRow: LineItemRow = {
  date: "",
  description: "",
  hours: "",
  rate: "",
};

const initialState: CreateInvoiceState = { success: false };

/**
 * Converts Prisma's typed WorkLogItem rows (Decimal, Date) into the
 * plain-string shape this form's local state uses for controlled
 * inputs — the inverse of what happens when the form serializes
 * lineItems to JSON before submitting.
 */
function toLineItemRows(items: WorkLogItem[]): LineItemRow[] {
  return items.map((item) => ({
    date: new Date(item.date).toISOString().split("T")[0],
    description: item.description,
    hours: item.hours.toString(),
    rate: item.rate.toString(),
  }));
}

/**
 * Invoice form for both creating and editing. Pass `invoice` to
 * pre-fill and switch into edit mode (calls `updateInvoice` bound
 * to that invoice's id); omit it for the create flow.
 */
export function InvoiceForm({
  invoice,
}: {
  invoice?: Invoice & { lineItems: WorkLogItem[] };
}) {
  const isEditMode = Boolean(invoice);

  // In edit mode, bind the invoice's id as the first argument so
  // the resulting function matches useActionState's required
  // (prevState, formData) signature — updateInvoice itself takes
  // three arguments, but bind() locks in invoiceId ahead of time.
  const action = isEditMode
    ? updateInvoice.bind(null, invoice!.id)
    : createInvoice;

  const [state, formAction, isPending] = useActionState(action, initialState);

  const [billingType, setBillingType] = useState<"HOURLY" | "FIXED">(
    invoice?.billingType ?? "HOURLY",
  );
  const [lineItems, setLineItems] = useState<LineItemRow[]>(
    invoice?.lineItems && invoice.lineItems.length > 0
      ? toLineItemRows(invoice.lineItems)
      : [{ ...emptyRow }],
  );

  function addRow() {
    setLineItems((rows) => [...rows, { ...emptyRow }]);
  }

  function removeRow(index: number) {
    setLineItems((rows) => rows.filter((_, i) => i !== index));
  }

  function updateRow(index: number, field: keyof LineItemRow, value: string) {
    setLineItems((rows) =>
      rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );
  }

  const hourlyTotal = lineItems.reduce((sum, row) => {
    const hours = parseFloat(row.hours) || 0;
    const rate = parseFloat(row.rate) || 0;
    return sum + hours * rate;
  }, 0);

  return (
    <form action={formAction} className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-1">Billing type</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setBillingType("HOURLY")}
            className={`px-4 py-2 rounded-lg border cursor-pointer ${
              billingType === "HOURLY"
                ? "bg-teal-700 text-white border-teal-700"
                : "border-gray-300"
            }`}
          >
            Hourly
          </button>
          <button
            type="button"
            onClick={() => setBillingType("FIXED")}
            className={`px-4 py-2 rounded-lg border cursor-pointer ${
              billingType === "FIXED"
                ? "bg-teal-700 text-white border-teal-700"
                : "border-gray-300"
            }`}
          >
            Fixed price
          </button>
        </div>
        <input type="hidden" name="billingType" value={billingType} />
      </div>

      <fieldset className="space-y-4 border rounded-lg p-4">
        <legend className="text-sm font-medium px-1">Client</legend>
        <Field
          label="Client name"
          name="clientName"
          required
          defaultValue={
            state.submittedValues?.clientName ?? invoice?.clientName
          }
          error={state.errors?.clientName}
        />
        <Field
          label="Org.nr"
          name="clientOrgNr"
          defaultValue={
            state.submittedValues?.clientOrgNr ?? invoice?.clientOrgNr ?? ""
          }
          error={state.errors?.clientOrgNr}
        />
        <Field
          label="Address"
          name="clientAddress"
          required
          defaultValue={
            state.submittedValues?.clientAddress ?? invoice?.clientAddress
          }
          error={state.errors?.clientAddress}
        />
        <Field
          label="Email"
          name="clientEmail"
          type="email"
          defaultValue={
            state.submittedValues?.clientEmail ?? invoice?.clientEmail ?? ""
          }
          error={state.errors?.clientEmail}
        />
      </fieldset>

      <fieldset className="space-y-4 border rounded-lg p-4">
        <legend className="text-sm font-medium px-1">Invoice details</legend>
        <Field
          label="Invoice date"
          name="invoiceDate"
          type="date"
          required
          defaultValue={
            state.submittedValues?.invoiceDate ??
            (invoice
              ? new Date(invoice.invoiceDate).toISOString().split("T")[0]
              : "")
          }
          error={state.errors?.invoiceDate}
        />
        <Field
          label="Due date"
          name="dueDate"
          type="date"
          required
          defaultValue={
            state.submittedValues?.dueDate ??
            (invoice
              ? new Date(invoice.dueDate).toISOString().split("T")[0]
              : "")
          }
          error={state.errors?.dueDate}
        />
        <Field
          label="Period start"
          name="periodStart"
          type="date"
          defaultValue={
            state.submittedValues?.periodStart ??
            (invoice?.periodStart
              ? new Date(invoice.periodStart).toISOString().split("T")[0]
              : "")
          }
          error={state.errors?.periodStart}
        />
        <Field
          label="Period end"
          name="periodEnd"
          type="date"
          defaultValue={
            state.submittedValues?.periodEnd ??
            (invoice?.periodEnd
              ? new Date(invoice.periodEnd).toISOString().split("T")[0]
              : "")
          }
          error={state.errors?.periodEnd}
        />
        <Field
          label="Project reference"
          name="projectRef"
          defaultValue={
            state.submittedValues?.projectRef ?? invoice?.projectRef ?? ""
          }
          error={state.errors?.projectRef}
        />
        <div>
          <label className="block text-sm font-medium mb-1">Currency</label>
          <select
            name="currency"
            defaultValue={
              state.submittedValues?.currency ?? invoice?.currency ?? "NOK"
            }
            className="w-full px-4 py-2 border rounded-lg"
          >
            <option value="NOK">NOK</option>
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
          </select>
        </div>
      </fieldset>

      {billingType === "HOURLY" && (
        <fieldset className="space-y-3 border rounded-lg p-4">
          <legend className="text-sm font-medium px-1">
            Work log <span className="text-red-600">*</span>
          </legend>

          {lineItems.map((row, index) => (
            <div
              key={index}
              className="
      grid
      grid-cols-1
      sm:grid-cols-2
      gap-3
      p-4
      border
      rounded-lg
      bg-gray-50
      relative
    "
            >
              {/* Date */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={row.date}
                  onChange={(e) => updateRow(index, "date", e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                />
              </div>

              {/* Description */}
              <div className="sm:col-span-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="Description"
                  value={row.description}
                  onChange={(e) =>
                    updateRow(index, "description", e.target.value)
                  }
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                />
              </div>

              {/* Hours */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Hours
                </label>
                <input
                  type="number"
                  step="0.5"
                  placeholder="Hours"
                  value={row.hours}
                  onChange={(e) => updateRow(index, "hours", e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                />
              </div>

              {/* Rate */}
              <div className="relative">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Rate
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Rate"
                  value={row.rate}
                  onChange={(e) => updateRow(index, "rate", e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white pr-10"
                />
              </div>
              <button
                type="button"
                onClick={() => removeRow(index)}
                className="
          absolute
          right-2
          
          text-red-600
          hover:text-red-800
          cursor-pointer
          px-2
          py-1
        "
                aria-label="Remove row"
              >
                ✕
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={addRow}
            className="text-sm text-teal-700 font-medium cursor-pointer"
          >
            + Add row
          </button>

          <p className="text-sm text-gray-500 pt-2">
            Running total: {hourlyTotal.toFixed(2)}
          </p>

          {state.errors?.lineItems && (
            <p className="text-sm text-red-600">{state.errors.lineItems[0]}</p>
          )}

          <input
            type="hidden"
            name="lineItems"
            value={JSON.stringify(lineItems)}
          />
        </fieldset>
      )}

      {billingType === "FIXED" && (
        <fieldset className="border rounded-lg p-4">
          <legend className="text-sm font-medium px-1">Fixed price</legend>
          <Field
            label="Project price"
            name="fixedPrice"
            type="number"
            required
            defaultValue={
              state.submittedValues?.fixedPrice ??
              (invoice?.fixedPrice ? invoice.fixedPrice.toString() : "")
            }
            error={state.errors?.fixedPrice}
          />
        </fieldset>
      )}

      {state.message && (
        <p
          className={
            state.success ? "text-sm text-green-700" : "text-sm text-red-600"
          }
        >
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="bg-teal-700 text-white rounded-full font-medium px-6 py-3 hover:bg-teal-800 transition-colors disabled:opacity-50 cursor-pointer"
      >
        {isPending
          ? "Saving..."
          : isEditMode
            ? "Save changes"
            : "Create invoice"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  error,
  required = false,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  error?: string[];
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">
        {label}
        {required && <span className="text-red-600 ml-0.5">*</span>}
      </label>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        className="w-full px-4 py-2 border rounded-lg"
      />
      {error && <p className="text-sm text-red-600 mt-1">{error[0]}</p>}
    </div>
  );
}
