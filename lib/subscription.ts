import prisma from "@/lib/prisma"

// Stripe keeps a subscription "active" until the paid period actually ends,
// even if the user has already cancelled, so this is safe to gate on.
const ACTIVE_STATUSES = ["active", "trialing"]

export async function isUserSubscribed(userId: string): Promise<boolean> {
  const sub = await prisma.subscription.findUnique({ where: { userId } })
  return !!sub && ACTIVE_STATUSES.includes(sub.status)
}