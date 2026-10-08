import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import {
  createCheckoutSession,
  createPortalSession,
} from "@/actions/subscription.actions";
import { getActiveSubscription } from "@/lib/subscription";

import { auth } from "@clerk/nextjs/server";
import { SignUpButton } from "@clerk/nextjs";

export default async function PricingPage() {
  const { userId } = await auth();
  const sub = userId ? await getActiveSubscription(userId) : null;
  const subscribed = !!sub;

  const t = await getTranslations("Pricing");
  const format = await getFormatter();
  const periodDate = sub?.currentPeriodEnd
    ? format.dateTime(sub.currentPeriodEnd, {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  return (
    <main className="max-w-4xl mx-auto px-6 py-16">
      <div className="text-center mb-12">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">{t("title")}</h1>
        <p className="text-gray-600 max-w-xl mx-auto">{t("subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Free tier */}
        <div className="rounded-lg border p-8 flex flex-col">
          <h2 className="text-xl font-semibold mb-1">{t("free")}</h2>
          <p className="text-3xl font-bold mb-1">NOK 0</p>
          <p className="text-sm text-gray-500 mb-6">{t("perMonth")}</p>

          <ul className="space-y-3 text-sm flex-1">
            <PlanRow included>{t("invoices3")}</PlanRow>
            <PlanRow included>{t("profile")}</PlanRow>
            <PlanRow included>{t("clients")}</PlanRow>
            <PlanRow included>{t("pdf")}</PlanRow>
            <PlanRow>{t("email")}</PlanRow>
            <PlanRow>{t("reports")}</PlanRow>
          </ul>

          <Link
            href="/dashboard/invoices"
            className="mt-8 text-center px-6 py-3 rounded-full border border-gray-300 font-medium hover:bg-gray-50 transition-colors cursor-pointer"
          >
            {subscribed ? t("goToDashboard") : t("getStarted")}
          </Link>
        </div>

        {/* Paid tier */}
        <div className="rounded-lg border-2 border-teal-700 p-8 flex flex-col relative">
          <span className="absolute -top-3 left-8 bg-teal-700 text-white text-xs font-medium px-3 py-1 rounded-full">
            {subscribed ? t("yourPlan") : t("mostPopular")}
          </span>
          <h2 className="text-xl font-semibold mb-1">{t("pro")}</h2>
          <p className="text-3xl font-bold mb-1">NOK 149</p>
<p className="text-sm text-gray-500 mb-6">
  {t("perMonth")} · {t("vatNote")}
</p>

          <ul className="space-y-3 text-sm flex-1">
            <PlanRow included>{t("invoicesUnlimited")}</PlanRow>
            <PlanRow included>{t("profile")}</PlanRow>
            <PlanRow included>{t("clients")}</PlanRow>
            <PlanRow included>{t("pdf")}</PlanRow>
            <PlanRow included>{t("email")}</PlanRow>
            <PlanRow included>{t("reports")}</PlanRow>
          </ul>

          {sub?.currentPeriodEnd && (
            <p className="text-sm text-teal-700 mt-6 text-center">
              {sub.cancelAtPeriodEnd
                ? t("cancelsOn", { date: periodDate })
                : t("renewsOn", { date: periodDate })}
            </p>
          )}

          {subscribed ? (
            <form action={createPortalSession} className="mt-4">
              <button
                type="submit"
                className="w-full text-center px-6 py-3 rounded-full bg-teal-700 text-white font-medium hover:bg-teal-800 transition-colors cursor-pointer"
              >
                {t("manage")}
              </button>
            </form>
          ) : userId ? (
            <form action={createCheckoutSession} className="mt-8">
              <button
                type="submit"
                className="w-full text-center px-6 py-3 rounded-full bg-teal-700 text-white font-medium hover:bg-teal-800 transition-colors cursor-pointer"
              >
                {t("subscribe")}
              </button>
            </form>
          ) : (
            <SignUpButton>
              <button className="mt-8 w-full text-center px-6 py-3 rounded-full bg-teal-700 text-white font-medium hover:bg-teal-800 transition-colors cursor-pointer">
                {t("signUpToSubscribe")}
              </button>
            </SignUpButton>
          )}
        </div>
      </div>

      <p className="text-center text-sm text-gray-400 mt-10">{t("footnote")}</p>
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