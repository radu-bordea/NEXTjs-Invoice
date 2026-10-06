import Link from "next/link";
import {
  createCheckoutSession,
  createPortalSession,
} from "@/actions/subscription.actions";
import { getActiveSubscription } from "@/lib/subscription"; // CHANGED

import { auth } from "@clerk/nextjs/server";
import { SignUpButton } from "@clerk/nextjs";

export default async function PricingPage() {
  const { userId } = await auth();
  const sub = userId ? await getActiveSubscription(userId) : null; // CHANGED
  const subscribed = !!sub; // CHANGED

  return (
    <main className="max-w-4xl mx-auto px-6 py-16">
      <div className="text-center mb-12">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">
          Simple pricing for Norwegian freelancers
        </h1>
        <p className="text-gray-600 max-w-xl mx-auto">
          Start free, upgrade when you need more than a few invoices a month.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Free tier */}
        <div className="rounded-lg border p-8 flex flex-col">
          <h2 className="text-xl font-semibold mb-1">Free</h2>
          <p className="text-3xl font-bold mb-1">NOK 0</p>
          <p className="text-sm text-gray-500 mb-6">per month</p>

          <ul className="space-y-3 text-sm flex-1">
            <PlanRow included>3 invoices per month</PlanRow>
            <PlanRow included>Company profile & MVA tracking</PlanRow>
            <PlanRow included>Client history & prefill</PlanRow>
            <PlanRow included>PDF download</PlanRow>
            <PlanRow>Email invoice to client</PlanRow>
            <PlanRow>Reports & Skatteetaten export</PlanRow>
          </ul>

          <Link
            href="/dashboard/invoices"
            className="mt-8 text-center px-6 py-3 rounded-full border border-gray-300 font-medium hover:bg-gray-50 transition-colors cursor-pointer"
          >
            {subscribed ? "Go to dashboard" : "Get started free"}{" "}
            {/* CHANGED */}
          </Link>
        </div>

        {/* Paid tier */}
        <div className="rounded-lg border-2 border-teal-700 p-8 flex flex-col relative">
          <span className="absolute -top-3 left-8 bg-teal-700 text-white text-xs font-medium px-3 py-1 rounded-full">
            {subscribed ? "Your plan" : "Most popular"} {/* CHANGED */}
          </span>
          <h2 className="text-xl font-semibold mb-1">Pro</h2>
          <p className="text-3xl font-bold mb-1">NOK 149</p>
          <p className="text-sm text-gray-500 mb-6">per month</p>

          <ul className="space-y-3 text-sm flex-1">
            <PlanRow included>Unlimited invoices</PlanRow>
            <PlanRow included>Company profile & MVA tracking</PlanRow>
            <PlanRow included>Client history & prefill</PlanRow>
            <PlanRow included>PDF download</PlanRow>
            <PlanRow included>Email invoice to client</PlanRow>
            <PlanRow included>Reports & Skatteetaten export</PlanRow>
          </ul>

          {sub?.currentPeriodEnd && (
            <p className="text-sm text-teal-700 mt-6 text-center">
              {sub.cancelAtPeriodEnd ? "Cancels on " : "Renews on "}
              {sub.currentPeriodEnd.toLocaleDateString("en-GB")}
            </p>
          )}

          {subscribed ? (
            <form action={createPortalSession} className="mt-4">
              <button
                type="submit"
                className="w-full text-center px-6 py-3 rounded-full bg-teal-700 text-white font-medium hover:bg-teal-800 transition-colors cursor-pointer"
              >
                Manage subscription
              </button>
            </form>
          ) : userId ? (
            <form action={createCheckoutSession} className="mt-8">
              <button
                type="submit"
                className="w-full text-center px-6 py-3 rounded-full bg-teal-700 text-white font-medium hover:bg-teal-800 transition-colors cursor-pointer"
              >
                Subscribe
              </button>
            </form>
          ) : (
            <SignUpButton>
              <button className="mt-8 w-full text-center px-6 py-3 rounded-full bg-teal-700 text-white font-medium hover:bg-teal-800 transition-colors cursor-pointer">
                Sign up to subscribe
              </button>
            </SignUpButton>
          )}
        </div>
      </div>

      <p className="text-center text-sm text-gray-400 mt-10">
        Prices shown in NOK. Cancel anytime once subscriptions are live.
      </p>
    </main>
  );
}

function PlanRow({
  children,
  included = false,
}: {
  children: React.ReactNode;
  included?: boolean;
}) {
  return (
    <li className="flex items-start gap-2">
      <span className={included ? "text-teal-700" : "text-gray-300"}>
        {included ? "✓" : "—"}
      </span>
      <span className={included ? "" : "text-gray-400"}>{children}</span>
    </li>
  );
}
