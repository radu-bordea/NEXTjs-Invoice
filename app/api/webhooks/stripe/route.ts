import { headers } from "next/headers"
import { NextResponse } from "next/server"
import type Stripe from "stripe"
import stripe from "@/lib/stripe"
import prisma from "@/lib/prisma"

/**
 * Receives events from Stripe and keeps the Subscription table in
 * sync. Stripe signs every request, so we verify the signature
 * before trusting anything in the body.
 */
export async function POST(request: Request) {
  // Signature verification needs the raw text body, not parsed JSON.
  const body = await request.text()
  const signature = (await headers()).get("stripe-signature")

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  switch (event.type) {
    // First payment succeeded: create or update this user's row.
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.userId
      if (!userId || session.mode !== "subscription") break

      const sub = await stripe.subscriptions.retrieve(
        session.subscription as string
      )
      const periodEnd = sub.items.data[0]?.current_period_end

      await prisma.subscription.upsert({
        where: { userId },
        update: {
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: sub.id,
          status: sub.status,
          currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
        },
        create: {
          userId,
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: sub.id,
          status: sub.status,
          currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
        },
      })
      break
    }

    // Renewals, cancellations, failed payments: update the status.
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription
      const periodEnd = sub.items.data[0]?.current_period_end

      await prisma.subscription.updateMany({
        where: { stripeSubscriptionId: sub.id },
        data: {
          status: sub.status,
          currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
        },
      })
      break
    }
  }

  return NextResponse.json({ received: true })
}