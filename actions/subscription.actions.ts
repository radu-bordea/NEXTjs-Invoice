"use server"

import { auth, currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import stripe from "@/lib/stripe"
import prisma from "@/lib/prisma"

/**
 * Starts a Stripe Checkout session for the logged-in user to
 * subscribe to the Pro plan. Redirects the browser straight to
 * Stripe's hosted checkout page — no custom payment form needed.
 *
 * If the user already has a Stripe customer record (from a previous
 * attempt), reuse it instead of creating a duplicate.
 */
export async function createCheckoutSession() {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  const user = await currentUser()
  const email = user?.emailAddresses[0]?.emailAddress

  // Reuse an existing Stripe customer if we've seen this user before,
  // otherwise let Stripe create one during checkout.
  const existing = await prisma.subscription.findUnique({
    where: { userId },
  })

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: existing?.stripeCustomerId,
    customer_email: existing ? undefined : email,
    line_items: [
      {
        price: process.env.STRIPE_PRICE_ID!,
        quantity: 1,
      },
    ],
    // Stripe appends session info to these URLs automatically.
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/invoices?subscribed=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
    // Tags this checkout session with our internal userId so the
    // webhook (built next session) knows who to credit when the
    // payment completes.
    metadata: { userId },
  })

  if (!session.url) throw new Error("Failed to create checkout session")
  redirect(session.url)
}