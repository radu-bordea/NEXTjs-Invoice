import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PlanBadge } from "@/components/PlanBadge";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const t = await getTranslations("Nav");

  return (
    <>
      {/* Mobile: controls on the first row, links on a second row that
          scrolls inside itself. Desktop (sm+): one row like before. */}
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 sm:px-6 py-2 sm:py-0 sm:h-16 border-b border-zinc-200">
        <div className="order-1 sm:order-2 ml-auto sm:ml-0 flex items-center gap-3 sm:gap-4">
          <LanguageSwitcher />
          <UserButton />
        </div>

        <nav className="order-2 sm:order-1 w-full sm:w-auto min-w-0 flex flex-wrap items-center gap-x-4 gap-y-1 sm:gap-x-6 font-medium text-sm pb-1 sm:pb-0">
          <Link
            href="/dashboard/settings"
            className="hover:text-teal-700 border-r border-zinc-200 pr-5 sm:pr-6"
          >
            {t("companyProfile")}
          </Link>
          <Link href="/dashboard/invoices" className="hover:text-teal-700">
            {t("invoices")}
          </Link>
          <Link href="/dashboard/reports" className="hover:text-teal-700">
            {t("reports")}
          </Link>
          <Link href="/pricing" className="hover:text-teal-700">
            {t("pricing")}
          </Link>
          <span className="shrink-0">
            <PlanBadge />
          </span>
        </nav>
      </header>
      <main className="flex-1 min-w-0">{children}</main>
    </>
  );
}
