/**
 * Small colored pill showing an invoice's status. Shared between
 * the invoice list table and the invoice view page so both stay
 * visually consistent.
 */
export function StatusBadge({ status }: { status: string }) {
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
      {status}
    </span>
  )
}