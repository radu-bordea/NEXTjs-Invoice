import { useTranslations } from "next-intl"

export function StatusBadge({ status }: { status: string }) {
  const t = useTranslations("Status")

  const styles =
    {
      DRAFT: "bg-gray-100 text-gray-700",
      SENT: "bg-teal-100 text-teal-800",
      PAID: "bg-green-100 text-green-800",
    }[status] ?? "bg-gray-100 text-gray-700"

  return (
    <span
      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${styles}`}
    >
      {t.has(status) ? t(status) : status}
    </span>
  )
}