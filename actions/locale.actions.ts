"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { locales, type Locale } from "@/i18n/request"

export async function setLocale(locale: Locale) {
  if (!locales.includes(locale)) return
  const store = await cookies()
  store.set("locale", locale, { path: "/", maxAge: 60 * 60 * 24 * 365 })
  revalidatePath("/", "layout")
}