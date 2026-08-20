"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

/**
 * Live-filtering client name search box. Updates the "client" URL
 * query param as the user types, debounced by 300ms so it doesn't
 * trigger a server request on every single keystroke — only once
 * typing pauses briefly.
 *
 * Preserves the existing "status" filter (if any) when updating
 * the URL, so switching one filter never clears the other.
 */
export function ClientSearchInput() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [value, setValue] = useState(searchParams.get("client") ?? "")

  useEffect(() => {
    const timeout = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())

      if (value) {
        params.set("client", value)
      } else {
        params.delete("client")
      }

      router.push(`/dashboard/invoices?${params.toString()}`)
    }, 300)

    // Cancel the pending update if the user types again before
    // the 300ms window elapses — this is the actual debounce.
    return () => clearTimeout(timeout)
  }, [value, router, searchParams])

  return (
    <input
      type="text"
      placeholder="Search client..."
      value={value}
      onChange={(e) => setValue(e.target.value)}
      className="px-3 py-1.5 border rounded-lg text-sm ml-auto"
    />
  )
}