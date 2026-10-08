"use client";

import { useState, useEffect } from "react";
import { getRecentClients } from "@/actions/invoice.actions";
import { useTranslations } from "next-intl";

type RecentClient = {
  clientName: string;
  clientOrgNr: string | null;
  clientAddress: string;
  clientEmail: string | null;
  billingType: "HOURLY" | "FIXED";
  currency: string;
  projectRef: string | null;
};

/**
 * Lets the user pick a previously invoiced client to prefill the
 * client fields below. Only copies client details and light
 * defaults (billing type, project reference) — never dates, hours,
 * rates or amounts, since those must always be entered fresh for
 * each new invoice.
 */
export function ClientPicker({
  onSelect,
}: {
  onSelect: (client: RecentClient | null) => void
}) {
  const t = useTranslations("ClientPicker");
  const [clients, setClients] = useState<RecentClient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRecentClients()
      .then(setClients)
      .finally(() => setLoading(false));
  }, []);

  if (loading || clients.length === 0) return null;

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium mb-1">
        {t("label")}
      </label>
      <select
        defaultValue=""
        onChange={(e) => {
          if (e.target.value === "") {
            onSelect(null);
            return;
          }
          const selected = clients.find((c) => c.clientName === e.target.value);
          if (selected) onSelect(selected);
        }}
        className="w-full px-4 py-2 border rounded-lg"
      >
        <option value="">{t("placeholder")}</option>
        {clients.map((c) => (
          <option key={c.clientName} value={c.clientName}>
            {c.clientName}
          </option>
        ))}
      </select>
    </div>
  );
}
