"use client"

import { deleteInvoice } from "@/actions/invoice.actions"
import { useTransition, useRef } from "react"
import { useTranslations } from "next-intl"

/**
 * "Delete draft" button with a native confirmation dialog.
 * Only rendered by the page for drafts that have no invoice number;
 * the server action checks the same rules again.
 */
export function DeleteInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const t = useTranslations("DeleteInvoice")
  const [isPending, startTransition] = useTransition()
  const isSubmitting = useRef(false)

  function handleDelete() {
    if (isSubmitting.current) return

    if (!window.confirm(t("confirm"))) return

    isSubmitting.current = true

    startTransition(async () => {
      try {
        await deleteInvoice(invoiceId)
      } finally {
        isSubmitting.current = false
      }
    })
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      className="px-4 py-2 rounded-lg border-b text-sm text-red-700 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50"
    >
      {t("button")}
    </button>
  )
}