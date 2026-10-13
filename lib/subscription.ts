import prisma from "@/lib/prisma"

// Stripe keeps a subscription "active" until the paid period actually ends,
// even if the user has already cancelled, so this is safe to gate on.
const ACTIVE_STATUSES = ["active", "trialing"]

export async function isUserSubscribed(userId: string): Promise<boolean> {
  const sub = await prisma.subscription.findUnique({ where: { userId } })
  return !!sub && ACTIVE_STATUSES.includes(sub.status)
}

export async function getActiveSubscription(userId: string) {
  const sub = await prisma.subscription.findUnique({ where: { userId } })
  if (!sub || !ACTIVE_STATUSES.includes(sub.status)) return null
  return sub
}

export const FREE_INVOICE_LIMIT = 3

// First-month offer (no Stripe involved): starts when the user creates
// their first invoice and lasts TRIAL_DAYS. During it the user gets
// reports access and a higher invoice limit.
export const TRIAL_DAYS = 30
export const TRIAL_INVOICE_LIMIT = 10
const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Trial status. The trial starts at the creation date of the user's
 * oldest invoice. A user with no invoices yet has not started it, so
 * it counts as active with the full number of days left.
 */
export async function getTrialInfo(userId: string) {
  const first = await prisma.invoice.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  })

  if (!first) {
    return {
      active: true,
      started: false,
      daysLeft: TRIAL_DAYS,
      endsAt: null as Date | null,
    }
  }

  const endsAt = new Date(first.createdAt.getTime() + TRIAL_DAYS * DAY_MS)
  const msLeft = endsAt.getTime() - Date.now()

  return {
    active: msLeft > 0,
    started: true,
    daysLeft: Math.max(0, Math.ceil(msLeft / DAY_MS)),
    endsAt: endsAt as Date | null,
  }
}

/** Reports are open to Pro users and to users in their first month. */
export async function canViewReports(userId: string): Promise<boolean> {
  if (await isUserSubscribed(userId)) return true
  const trial = await getTrialInfo(userId)
  return trial.active
}

export async function getMonthlyInvoiceCount(userId: string) {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  return prisma.invoice.count({
    where: { userId, createdAt: { gte: startOfMonth } },
  })
}

export async function getInvoiceQuota(userId: string) {
  const [subscribed, trial] = await Promise.all([
    isUserSubscribed(userId),
    getTrialInfo(userId),
  ])

  const inTrial = !subscribed && trial.active

  // In the trial the limit counts all invoices (they all fall inside
  // the first month); otherwise it counts this calendar month.
  const used = inTrial
    ? await prisma.invoice.count({ where: { userId } })
    : await getMonthlyInvoiceCount(userId)
  const limit = inTrial ? TRIAL_INVOICE_LIMIT : FREE_INVOICE_LIMIT

  return {
    subscribed,
    inTrial,
    trialDaysLeft: inTrial ? trial.daysLeft : null,
    used,
    limit,
    canCreate: subscribed || used < limit,
  }
}

export async function getPlanInfo(userId: string) {
  const sub = await getActiveSubscription(userId)
  if (sub) {
    return {
      plan: "pro" as const,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      periodEnd: sub.currentPeriodEnd,
    }
  }
  const quota = await getInvoiceQuota(userId)
  return {
    plan: "free" as const,
    used: quota.used,
    limit: quota.limit,
    inTrial: quota.inTrial,
    trialDaysLeft: quota.trialDaysLeft,
  }
}