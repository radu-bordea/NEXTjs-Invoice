"use client"

import { useActionState, useState } from "react"
import {
  createInvoice,
  type CreateInvoiceState,
} from "@/actions/invoice.actions"

type LineItemRow = {
  date: string
  description: string
  hours: string
  rate: string
}

const emptyRow: LineItemRow = { date: "", description: "", hours: "", rate: "" }

const initialState: CreateInvoiceState = { success: false }

export function InvoiceForm() {
  const [state, formAction, isPending] = useActionState(
    createInvoice,
    initialState
  )

  const [billingType, setBillingType] = useState<"HOURLY" | "FIXED">("HOURLY")
  const [lineItems, setLineItems] = useState<LineItemRow[]>([{ ...emptyRow }])

  function addRow() {
    setLineItems((rows) => [...rows, { ...emptyRow }])
  }

  function removeRow(index: number) {
    setLineItems((rows) => rows.filter((_, i) => i !== index))
  }

  function updateRow(index: number, field: keyof LineItemRow, value: string) {
    setLineItems((rows) =>
      rows.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    )
  }

  const hourlyTotal = lineItems.reduce((sum, row) => {
    const hours = parseFloat(row.hours) || 0
    const rate = parseFloat(row.rate) || 0
    return sum + hours * rate
  }, 0)

  return (
    <form action={formAction} className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-1">Billing type</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setBillingType("HOURLY")}
            className={`px-4 py-2 rounded-lg border ${
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
            className={`px-4 py-2 rounded-lg border ${
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
          defaultValue={state.submittedValues?.clientName}
          error={state.errors?.clientName}
        />
        <Field
          label="Org.nr"
          name="clientOrgNr"
          defaultValue={state.submittedValues?.clientOrgNr}
          error={state.errors?.clientOrgNr}
        />
        <Field
          label="Address"
          name="clientAddress"
          required
          defaultValue={state.submittedValues?.clientAddress}
          error={state.errors?.clientAddress}
        />
        <Field
          label="Email"
          name="clientEmail"
          type="email"
          defaultValue={state.submittedValues?.clientEmail}
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
          defaultValue={state.submittedValues?.invoiceDate}
          error={state.errors?.invoiceDate}
        />
        <Field
          label="Due date"
          name="dueDate"
          type="date"
          required
          defaultValue={state.submittedValues?.dueDate}
          error={state.errors?.dueDate}
        />
        <Field
          label="Period start"
          name="periodStart"
          type="date"
          defaultValue={state.submittedValues?.periodStart}
          error={state.errors?.periodStart}
        />
        <Field
          label="Period end"
          name="periodEnd"
          type="date"
          defaultValue={state.submittedValues?.periodEnd}
          error={state.errors?.periodEnd}
        />
        <Field
          label="Project reference"
          name="projectRef"
          defaultValue={state.submittedValues?.projectRef}
          error={state.errors?.projectRef}
        />
        <div>
          <label className="block text-sm font-medium mb-1">Currency</label>
          <select
            name="currency"
            defaultValue={state.submittedValues?.currency ?? "NOK"}
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
            <div key={index} className="grid grid-cols-[1fr_2fr_80px_80px_auto] gap-2 items-start">
              <input
                type="date"
                value={row.date}
                onChange={(e) => updateRow(index, "date", e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm"
              />
              <input
                type="text"
                placeholder="Description"
                value={row.description}
                onChange={(e) => updateRow(index, "description", e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm"
              />
              <input
                type="number"
                step="0.5"
                placeholder="Hours"
                value={row.hours}
                onChange={(e) => updateRow(index, "hours", e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm"
              />
              <input
                type="number"
                step="0.01"
                placeholder="Rate"
                value={row.rate}
                onChange={(e) => updateRow(index, "rate", e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm"
              />
              <button
                type="button"
                onClick={() => removeRow(index)}
                className="text-red-600 text-sm px-2 py-2"
                aria-label="Remove row"
              >
                ✕
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={addRow}
            className="text-sm text-teal-700 font-medium"
          >
            + Add row
          </button>

          <p className="text-sm text-gray-500 pt-2">
            Running total: {hourlyTotal.toFixed(2)}
          </p>

          {state.errors?.lineItems && (
            <p className="text-sm text-red-600">{state.errors.lineItems[0]}</p>
          )}

          <input type="hidden" name="lineItems" value={JSON.stringify(lineItems)} />
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
            defaultValue={state.submittedValues?.fixedPrice}
            error={state.errors?.fixedPrice}
          />
        </fieldset>
      )}

      {state.message && (
        <p className={state.success ? "text-sm text-green-700" : "text-sm text-red-600"}>
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="bg-teal-700 text-white rounded-full font-medium px-6 py-3 hover:bg-teal-800 transition-colors disabled:opacity-50"
      >
        {isPending ? "Creating..." : "Create invoice"}
      </button>
    </form>
  )
}

/**
 * Reusable labeled input with inline error display and an
 * asterisk next to the label when the field is required, so the
 * user knows before submitting — not only after a failed validation.
 */
function Field({
  label,
  name,
  type = "text",
  error,
  required = false,
  defaultValue,
}: {
  label: string
  name: string
  type?: string
  error?: string[]
  required?: boolean
  defaultValue?: string
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
  )
}