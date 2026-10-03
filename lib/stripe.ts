import Stripe from "stripe"

/**
 * Shared Stripe client, initialized once and reused across the app —
 * same singleton pattern as lib/prisma.ts, so we don't create a new
 * connection on every server action or route call.
 */
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-09-30.endive",
})

export default stripe