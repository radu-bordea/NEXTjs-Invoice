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
      <header className="flex justify-between items-center px-6 h-16 border-b border-zinc-200">
        <nav className="flex gap-6 font-medium text-sm">
          <Link
            href="/dashboard/settings"
            className="hover:text-purple-700 border-r border-zinc-200 pr-6"
          >
            {t("companyProfile")}
          </Link>
          <Link href="/dashboard/invoices" className="hover:text-purple-700">
            {t("invoices")}
          </Link>
          <Link href="/dashboard/reports" className="hover:text-teal-700">
            {t("reports")}
          </Link>
          <Link href="/pricing" className="hover:text-purple-700">
            {t("pricing")}
          </Link>
          <PlanBadge />
        </nav>
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <UserButton />
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </>
  );
}