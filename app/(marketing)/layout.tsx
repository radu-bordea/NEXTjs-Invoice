import Link from "next/link"
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs"
import { useTranslations } from "next-intl"
import { Footer } from "@/components/Footer"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const t = useTranslations("Nav")

  return (
    <div className="flex flex-col flex-1">
      <header className="flex justify-between items-center p-4 h-16">
        <Link href="/" className="font-semibold text-lg hover:text-teal-700">
          nextjs-invoice
        </Link>
        <div className="flex gap-4 items-center">
          <Link href="/pricing" className="text-sm font-medium hover:text-teal-700">
            {t("pricing")}
          </Link>
          <LanguageSwitcher />
          <Show when="signed-out">
            <SignInButton>
              <button className="text-sm font-medium cursor-pointer hover:text-teal-700">
                {t("signIn")}
              </button>
            </SignInButton>
            <SignUpButton>
              <button className="bg-teal-700 text-white rounded-full font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 cursor-pointer hover:bg-teal-800 transition-colors">
                {t("signUp")}
              </button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <Link
              href="/dashboard/invoices"
              className="text-sm font-medium hover:text-teal-700"
            >
              {t("dashboard")}
            </Link>
            <UserButton />
          </Show>
        </div>
      </header>
      <div className="flex-1 flex flex-col">{children}</div>
      <Footer />
    </div>
  )
}