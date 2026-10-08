"use client"

import { updateInvoiceStatus } from "@/actions/invoice.actions"
import { useTransition, useRef } from "react"
import { useTranslations } from "next-intl"

/**
 * Buttons to move an invoice through its status lifecycle:
 * DRAFT -> SENT -> PAID, with a one-step-back "Revert to draft"
 * available only from SENT. PAID is a locked, final state.
 *
 * Every transition requires confirmation via a native browser
 * dialog before the server action fires.
 */
export function StatusButtons({
  invoiceId,
  currentStatus,
}: {
  invoiceId: string
  currentStatus: string
}) {
  const t = useTranslations("StatusButtons")
  const [isPending, startTransition] = useTransition()
  const isSubmitting = useRef(false)

  function handleStatusChange(
    status: "DRAFT" | "SENT" | "PAID",
    confirmMessage: string
  ) {
    if (isSubmitting.current) return

    // Native confirm dialog: the user must click "OK" for the
    // status change to proceed.
    const confirmed = window.confirm(confirmMessage)
    if (!confirmed) return

    isSubmitting.current = true

    startTransition(async () => {
      await updateInvoiceStatus(invoiceId, status)
      isSubmitting.current = false
    })
  }

  return (
    <div className="flex gap-2 items-center">
      {currentStatus === "DRAFT" && (
        <button
          onClick={() => handleStatusChange("SENT", t("confirmSent"))}
          disabled={isPending}
          className="px-4 py-2 rounded-lg bg-teal-700 text-white text-sm hover:bg-teal-800 transition-colors cursor-pointer disabled:opacity-50"
        >
          {t("markSent")}
        </button>
      )}

      {currentStatus === "SENT" && (
        <>
          <button
            onClick={() => handleStatusChange("PAID", t("confirmPaid"))}
            disabled={isPending}
            className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700 transition-colors cursor-pointer disabled:opacity-50"
          >
            {t("markPaid")}
          </button>
          <button
            onClick={() => handleStatusChange("DRAFT", t("confirmRevert"))}
            disabled={isPending}
            className="px-4 py-2 rounded-lg border border-amber-300 text-amber-700 text-sm hover:bg-amber-50 transition-colors cursor-pointer disabled:opacity-50"
          >
            {t("revert")}
          </button>
        </>
      )}

      {currentStatus === "PAID" && (
        <p className="text-sm text-green-700 font-medium">{t("paidNote")}</p>
      )}
    </div>
  )
}