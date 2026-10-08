"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { useEffect } from "react"
import { toast } from "sonner"
import { useTranslations } from "next-intl"

export function ViewNotice() {
  const t = useTranslations("ViewNotice")
  const searchParams = useSearchParams()
  const router = useRouter()
  const notice = searchParams.get("notice")

  useEffect(() => {
    if (notice === "edit-blocked") {
      toast.error(t("editBlockedTitle"), {
        description: t("editBlockedDescription"),
      })
      // Remove the query param so a page refresh doesn't show the
      // toast again.
      router.replace(window.location.pathname)
    }
  }, [notice, router, t])

  return null
}