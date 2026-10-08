"use client"

import { useTransition } from "react"
import { useLocale, useTranslations } from "next-intl"
import { setLocale } from "@/actions/locale.actions"
import type { Locale } from "@/i18n/request"

const options: { value: Locale; label: string }[] = [
  { value: "nb", label: "NO" },
  { value: "en", label: "EN" },
]

export function LanguageSwitcher() {
  const current = useLocale()
  const t = useTranslations("Common")
  const [isPending, startTransition] = useTransition()

  return (
    <div role="group" aria-label={t("language")} className="flex gap-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await setLocale(option.value)
            })
          }
          className={
            current === option.value
              ? "px-2 py-1 text-xs rounded-full bg-teal-700 text-white"
              : "px-2 py-1 text-xs rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer"
          }
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}