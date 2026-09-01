"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { useEffect } from "react"
import { toast } from "sonner"

/**
 * Shows a toast when the invoice view page is reached with a
 * "notice" query param — e.g. after being redirected away from
 * the edit page because the invoice is no longer a draft.
 *
 * Strips the query param from the URL right after showing the
 * toast, so refreshing the page doesn't re-trigger it.
 */
export function ViewNotice() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const notice = searchParams.get("notice")

  useEffect(() => {
    if (notice === "edit-blocked") {
      toast.error("Only draft invoices can be edited.", {
        description: "This invoice has already been sent or paid.",
      })
      // Remove the query param so a page refresh doesn't show the
      // toast again.
      router.replace(window.location.pathname)
    }
  }, [notice, router])

  return null
}