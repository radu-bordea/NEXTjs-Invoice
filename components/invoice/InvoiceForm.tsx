"use client"

import { useActionState, useState } from "react"
import {
  createInvoice,
  type CreateInvoiceState,
} from "@/actions/invoice.actions"

/**
 * Shape of one work-log row while it's being edited in the form.
 * Purely client-side state — not a Prisma type, since it doesn't
 * exist as a database row until the invoice is actually created.
 */
type LineItemRow = {
  date: string
  description: string
  hours: string
  rate: string
}

const emptyRow: LineItemRow = { date: "", description: "", hours: "", rate: "" }

const initialState: CreateInvoiceState = { success: false }

/**
 * Invoice creation form. Toggles between HOURLY (dynamic work-log
 * table) and FIXED (single price field) billing types.
 *
 * Line items are tracked in local useState (since they don't exist
 * as form fields the browser understands natively), then serialized
 * to JSON into a hidden input right before submit so the server
 * action can read them out of FormData.
 */
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

  // Running total for the HOURLY table, purely for on-screen
  // feedback — the real total is calculated server-side.
  const hourlyTotal = lineItems.reduce((sum, row) => {
    const hours = parseFloat(row.hours) || 0
    const rate = parseFloat(row.rate) || 0
    return sum + hours * rate
  }, 0)

  return (
    <form action={formAction} className="space-y-6">
      {/* Billing type toggle */}
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
        {/* This hidden input is what actually reaches the server
            action's FormData — the buttons above are just UI. */}
        <input type="hidden" name="billingType" value={billingType} />
      </div>

      {/* Client details */}
      <fieldset className="space-y-4 border rounded-lg p-4">
        <legend className="text-sm font-medium px-1">Client</legend>
        <Field label="Client name" name="clientName" error={state.errors?.clientName} />
        <Field label="Org.nr (optional)" name="clientOrgNr" error={state.errors?.clientOrgNr} />
        <Field label="Address" name="clientAddress" error={state.errors?.clientAddress} />
        <Field label="Email (optional)" name="clientEmail" type="email" error={state.errors?.clientEmail} />
      </fieldset>

      {/* Invoice details */}
      <fieldset className="space-y-4 border rounded-lg p-4">
        <legend className="text-sm font-medium px-1">Invoice details</legend>
        <Field label="Invoice date" name="invoiceDate" type="date" error={state.errors?.invoiceDate} />
        <Field label="Due date" name="dueDate" type="date" error={state.errors?.dueDate} />
        <Field label="Period start (optional)" name="periodStart" type="date" error={state.errors?.periodStart} />
        <Field label="Period end (optional)" name="periodEnd" type="date" error={state.errors?.periodEnd} />
        <Field label="Project reference (optional)" name="projectRef" error={state.errors?.projectRef} />
        <div>
          <label className="block text-sm font-medium mb-1">Currency</label>
          <select name="currency" defaultValue="NOK" className="w-full px-4 py-2 border rounded-lg">
            <option value="NOK">NOK</option>
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
          </select>
        </div>
      </fieldset>

      {/* HOURLY: work log table */}
      {billingType === "HOURLY" && (
        <fieldset className="space-y-3 border rounded-lg p-4">
          <legend className="text-sm font-medium px-1">Work log</legend>

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

          {/* Serialized line items — this is what the server action
              actually reads out of FormData. */}
          <input type="hidden" name="lineItems" value={JSON.stringify(lineItems)} />
        </fieldset>
      )}

      {/* FIXED: single price field */}
      {billingType === "FIXED" && (
        <fieldset className="border rounded-lg p-4">
          <legend className="text-sm font-medium px-1">Fixed price</legend>
          <Field label="Project price" name="fixedPrice" type="number" error={state.errors?.fixedPrice} />
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
 * Reusable labeled input with inline error display, same pattern
 * as CompanyProfileForm's Field helper.
 */
function Field({
  label,
  name,
  type = "text",
  error,
}: {
  label: string
  name: string
  type?: string
  error?: string[]
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <input name={name} type={type} className="w-full px-4 py-2 border rounded-lg" />
      {error && <p className="text-sm text-red-600 mt-1">{error[0]}</p>}
    </div>
  )
}