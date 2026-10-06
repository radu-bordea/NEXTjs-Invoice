import Link from "next/link"

export function UpgradePrompt({
  title,
  message,
}: {
  title: string
  message: string
}) {
  return (
    <div className="rounded-lg border-2 border-teal-700 p-8 text-center max-w-xl mx-auto">
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <p className="text-gray-600 mb-6">{message}</p>
      <Link
        href="/pricing"
        className="inline-block bg-teal-700 text-white rounded-full font-medium px-6 py-3 hover:bg-teal-800 transition-colors cursor-pointer"
      >
        Upgrade to Pro
      </Link>
    </div>
  )
}