"use client";

import { useActionState, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import {
  createInvoice,
  updateInvoice,
  type CreateInvoiceState,
} from "@/actions/invoice.actions";
import type { Invoice, WorkLogItem } from "@/app/generated/prisma/client";
import { ClientPicker } from "./ClientPicker";

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
 * inputs.
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
 * pre-fill and switch into edit mode; pass `template` to prefill a
 * new invoice (duplicate); omit both for an empty form.
 */
export function InvoiceForm({
  invoice,
  template,
  mvaRegistered = true,
}: {
  invoice?: Invoice & { lineItems: WorkLogItem[] };
  template?: Invoice & { lineItems: WorkLogItem[] };
  mvaRegistered?: boolean;
}) {
  const t = useTranslations("InvoiceForm");
  const tBilling = useTranslations("BillingType");
  const format = useFormatter();

  const te = useTranslations("Errors");
  const tr = (m?: string) => (m && te.has(m) ? te(m) : m);

  const isEditMode = Boolean(invoice);
  const source = invoice ?? template;

  // When editing, use the invoice's own snapshot of the registration date;
  // for new invoices, use what the page tells us about the company profile.
  const showVatRate = invoice
    ? Boolean(invoice.mvaRegisteredFrom)
    : mvaRegistered;

  const action = isEditMode
    ? updateInvoice.bind(null, invoice!.id)
    : createInvoice;

  const [state, formAction, isPending] = useActionState(action, initialState);

  const [billingType, setBillingType] = useState<"HOURLY" | "FIXED">(
    source?.billingType ?? "HOURLY",
  );

  const [clientFields, setClientFields] = useState({
    clientName: source?.clientName ?? "",
    clientOrgNr: source?.clientOrgNr ?? "",
    clientAddress: source?.clientAddress ?? "",
    clientEmail: source?.clientEmail ?? "",
  });

  const [lineItems, setLineItems] = useState<LineItemRow[]>(
    source?.lineItems && source.lineItems.length > 0
      ? toLineItemRows(source.lineItems)
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
        <label className="block text-sm font-medium mb-1">
          {t("billingType")}
        </label>
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
            {tBilling("HOURLY")}
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
            {tBilling("FIXED")}
          </button>
        </div>
        <input type="hidden" name="billingType" value={billingType} />
      </div>

      {!isEditMode && !template && (
        <ClientPicker
          onSelect={(client) => {
            setClientFields(
              client
                ? {
                    clientName: client.clientName,
                    clientOrgNr: client.clientOrgNr ?? "",
                    clientAddress: client.clientAddress,
                    clientEmail: client.clientEmail ?? "",
                  }
                : {
                    clientName: "",
                    clientOrgNr: "",
                    clientAddress: "",
                    clientEmail: "",
                  },
            );
          }}
        />
      )}

      <fieldset className="space-y-4 border rounded-lg p-4">
        <legend className="text-sm font-medium px-1">{t("client")}</legend>
        <div>
          <label className="block text-sm font-medium mb-1">
            {t("clientName")}
            <span className="text-red-600 ml-0.5">*</span>
          </label>
          <input
            name="clientName"
            value={clientFields.clientName}
            onChange={(e) =>
              setClientFields((f) => ({ ...f, clientName: e.target.value }))
            }
            className="w-full px-4 py-2 border rounded-lg"
          />
          {state.errors?.clientName && (
            <p className="text-sm text-red-600 mt-1">
              {tr(state.errors.clientName[0])}
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{t("orgNr")}</label>
          <input
            name="clientOrgNr"
            value={clientFields.clientOrgNr}
            onChange={(e) =>
              setClientFields((f) => ({ ...f, clientOrgNr: e.target.value }))
            }
            className="w-full px-4 py-2 border rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            {t("address")}
            <span className="text-red-600 ml-0.5">*</span>
          </label>
          <input
            name="clientAddress"
            value={clientFields.clientAddress}
            onChange={(e) =>
              setClientFields((f) => ({ ...f, clientAddress: e.target.value }))
            }
            className="w-full px-4 py-2 border rounded-lg"
          />
          {state.errors?.clientAddress && (
            <p className="text-sm text-red-600 mt-1">
              {tr(state.errors.clientAddress[0])}
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{t("email")}</label>
          <input
            name="clientEmail"
            type="email"
            value={clientFields.clientEmail}
            onChange={(e) =>
              setClientFields((f) => ({ ...f, clientEmail: e.target.value }))
            }
            className="w-full px-4 py-2 border rounded-lg"
          />
        </div>
      </fieldset>

      <fieldset className="space-y-4 border rounded-lg p-4">
        <legend className="text-sm font-medium px-1">{t("details")}</legend>
        <Field
          label={t("invoiceDate")}
          name="invoiceDate"
          type="date"
          required
          defaultValue={
            state.submittedValues?.invoiceDate ??
            (source
              ? new Date(source.invoiceDate).toISOString().split("T")[0]
              : "")
          }
          error={state.errors?.invoiceDate}
        />
        <Field
          label={t("dueDate")}
          name="dueDate"
          type="date"
          required
          defaultValue={
            state.submittedValues?.dueDate ??
            (source ? new Date(source.dueDate).toISOString().split("T")[0] : "")
          }
          error={state.errors?.dueDate}
        />
        <Field
          label={t("periodStart")}
          name="periodStart"
          type="date"
          defaultValue={
            state.submittedValues?.periodStart ??
            (source?.periodStart
              ? new Date(source.periodStart).toISOString().split("T")[0]
              : "")
          }
          error={state.errors?.periodStart}
        />
        <Field
          label={t("periodEnd")}
          name="periodEnd"
          type="date"
          defaultValue={
            state.submittedValues?.periodEnd ??
            (source?.periodEnd
              ? new Date(source.periodEnd).toISOString().split("T")[0]
              : "")
          }
          error={state.errors?.periodEnd}
        />
        <Field
          label={t("projectRef")}
          name="projectRef"
          defaultValue={
            state.submittedValues?.projectRef ?? source?.projectRef ?? ""
          }
          error={state.errors?.projectRef}
        />
        {showVatRate ? (
          <div>
            <label className="block text-sm font-medium mb-1">
              {t("vatRate")}
            </label>
            <select
              name="vatRate"
              defaultValue={
                state.submittedValues?.vatRate ?? String(source?.vatRate ?? 25)
              }
              className="w-full px-4 py-2 border rounded-lg bg-white"
            >
              <option value="25">25 %</option>
              <option value="15">15 %</option>
              <option value="12">12 %</option>
              <option value="0">0 %</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">{t("vatRateHint")}</p>
            {state.errors?.vatRate && (
              <p className="text-sm text-red-600 mt-1">
                {tr(state.errors.vatRate[0])}
              </p>
            )}
          </div>
        ) : (
          <>
            <input type="hidden" name="vatRate" value="25" />
            <p className="text-sm text-gray-500">{t("vatNotRegistered")}</p>
          </>
        )}
        <input type="hidden" name="currency" value="NOK" />
      </fieldset>

      {billingType === "HOURLY" && (
        <fieldset className="space-y-3 border rounded-lg p-4">
          <legend className="text-sm font-medium px-1">
            {t("workLog")} <span className="text-red-600">*</span>
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
                  {t("rowDate")}
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
                  {t("description")}
                </label>
                <input
                  type="text"
                  placeholder={t("description")}
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
                  {t("hours")}
                </label>
                <input
                  type="number"
                  step="0.5"
                  placeholder={t("hours")}
                  value={row.hours}
                  onChange={(e) => updateRow(index, "hours", e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                />
              </div>

              {/* Rate */}
              <div className="relative">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {t("rate")}
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder={t("rate")}
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
                aria-label={t("removeRow")}
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
            {t("addRow")}
          </button>

          <p className="text-sm text-gray-500 pt-2">
            {t("runningTotal", {
              total: format.number(hourlyTotal, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }),
            })}
          </p>

          {state.errors?.lineItems && (
            <p className="text-sm text-red-600">
              {tr(state.errors.lineItems[0])}
            </p>
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
          <legend className="text-sm font-medium px-1">
            {tBilling("FIXED")}
          </legend>
          <Field
            label={t("projectPrice")}
            name="fixedPrice"
            type="number"
            required
            defaultValue={
              state.submittedValues?.fixedPrice ??
              (source?.fixedPrice ? source.fixedPrice.toString() : "")
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
        {isPending ? t("saving") : isEditMode ? t("saveChanges") : t("create")}
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
  const te = useTranslations("Errors");

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
      {error && (
        <p className="text-sm text-red-600 mt-1">
          {te.has(error[0]) ? te(error[0]) : error[0]}
        </p>
      )}
    </div>
  );
}
