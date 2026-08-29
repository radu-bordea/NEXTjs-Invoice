"use client"

import { updateInvoiceStatus } from "@/actions/invoice.actions"
import { useTransition, useRef } from "react"

/**
 * Buttons to move an invoice through its status lifecycle:
 * DRAFT -> SENT -> PAID, with a one-step-back "Revert to draft"
 * available only from SENT (covers accidental clicks before
 * anything's actually been paid). PAID is a locked, final state —
 * no buttons shown, since a paid invoice shouldn't casually flip
 * back once it's a closed financial record.
 *
 * Colors are semantic: teal = move forward (matches the app's
 * primary accent), green = success/complete, amber = a cautious
 * secondary action (reverting), gray = nothing has happened yet.
 */
export function StatusButtons({
  invoiceId,
  currentStatus,
}: {
  invoiceId: string
  currentStatus: string
}) {
  const [isPending, startTransition] = useTransition()
  const isSubmitting = useRef(false)

  function handleStatusChange(status: "DRAFT" | "SENT" | "PAID") {
    // Extra guard beyond `disabled={isPending}` — closes the small
    // timing gap where a fast double-click could fire before React
    // has re-rendered the disabled state.
    if (isSubmitting.current) return
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
          onClick={() => handleStatusChange("SENT")}
          disabled={isPending}
          className="px-4 py-2 rounded-lg bg-teal-700 text-white text-sm hover:bg-teal-800 transition-colors cursor-pointer disabled:opacity-50"
        >
          Mark as sent
        </button>
      )}

      {currentStatus === "SENT" && (
        <>
          <button
            onClick={() => handleStatusChange("PAID")}
            disabled={isPending}
            className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700 transition-colors cursor-pointer disabled:opacity-50"
          >
            Mark as paid
          </button>
          <button
            onClick={() => handleStatusChange("DRAFT")}
            disabled={isPending}
            className="px-4 py-2 rounded-lg border border-amber-300 text-amber-700 text-sm hover:bg-amber-50 transition-colors cursor-pointer disabled:opacity-50"
          >
            Revert to draft
          </button>
        </>
      )}

      {currentStatus === "PAID" && (
        <p className="text-sm text-green-700 font-medium">
          ✓ This invoice is marked as paid.
        </p>
      )}
    </div>
  )
}