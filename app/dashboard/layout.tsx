import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <>
      <header className="flex justify-between items-center px-6 h-16 border-b border-zinc-200">
        <nav className="flex gap-6 font-medium text-sm">
          <Link
            href="/dashboard/settings"
            className="hover:text-purple-700 border-r border-zinc-200 pr-6"
          >
            Company Profile
          </Link>
          <Link href="/dashboard/invoices" className="hover:text-purple-700">
            Invoices
          </Link>
          <Link href="/dashboard/reports" className="hover:text-teal-700">
            Reports
          </Link>
        </nav>
        <UserButton />
      </header>
      <main className="flex-1">{children}</main>
    </>
  );
}
