"use client"

import { updateInvoiceStatus } from "@/actions/invoice.actions"
import { useTransition, useRef } from "react"

/**
 * Buttons to move an invoice through its status lifecycle:
 * DRAFT -> SENT -> PAID, with a one-step-back "Revert to draft"
 * available only from SENT. PAID is a locked, final state.
 *
 * Every transition requires confirmation via a native browser
 * dialog before the server action fires — a safeguard against
 * accidental clicks, especially important now that PAID has no
 * way back.
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

  function handleStatusChange(
    status: "DRAFT" | "SENT" | "PAID",
    confirmMessage: string
  ) {
    if (isSubmitting.current) return

    // Native confirm dialog — user must explicitly click "OK" for
    // the status change to proceed. Clicking "Cancel" aborts here,
    // before the server action is ever called.
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
          onClick={() =>
            handleStatusChange(
              "SENT",
              "Mark this invoice as sent? This means it's been delivered to the client."
            )
          }
          disabled={isPending}
          className="px-4 py-2 rounded-lg bg-teal-700 text-white text-sm hover:bg-teal-800 transition-colors cursor-pointer disabled:opacity-50"
        >
          Mark as sent
        </button>
      )}

      {currentStatus === "SENT" && (
        <>
          <button
            onClick={() =>
              handleStatusChange(
                "PAID",
                "Mark this invoice as paid? This is a final status and cannot be undone."
              )
            }
            disabled={isPending}
            className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700 transition-colors cursor-pointer disabled:opacity-50"
          >
            Mark as paid
          </button>
          <button
            onClick={() =>
              handleStatusChange(
                "DRAFT",
                "Revert this invoice back to draft? It will no longer be marked as sent."
              )
            }
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