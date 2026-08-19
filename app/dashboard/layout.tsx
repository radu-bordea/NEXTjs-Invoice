import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  return (
    <>
      <header className="flex justify-between items-center px-6 h-16 border-b border-zinc-200">
        <nav className="flex gap-6 font-medium text-sm">
          <a href="/dashboard/invoices" className="hover:text-purple-700">
            Invoices
          </a>
          <a href="/dashboard/settings" className="hover:text-purple-700">
            Company Profile
          </a>
        </nav>
        <UserButton />
      </header>
      <main className="flex-1">{children}</main>
    </>
  )
}