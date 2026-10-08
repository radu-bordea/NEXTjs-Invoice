"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useTranslations, useFormatter } from "next-intl";
import type { MonthlyReport } from "@/lib/invoice-reports";

export function RevenueChart({ data }: { data: MonthlyReport[] }) {
  const t = useTranslations("Reports");
  const format = useFormatter();

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <XAxis
          dataKey="month"
          fontSize={12}
          tickFormatter={(m) => t(`months.${m}`)}
        />
        <YAxis fontSize={12} />
        <Tooltip
          labelFormatter={(m) => t(`months.${m}`)}
          formatter={(value) => {
            const num = typeof value === "number" ? value : Number(value) || 0;
            return "NOK " + format.number(num, { maximumFractionDigits: 0 });
          }}
        />
        <Legend />
        <Bar dataKey="billedTotal" name={t("billed")} fill="#99d8c9" />
        <Bar dataKey="paidTotal" name={t("paid")} fill="#0f766e" />
      </BarChart>
    </ResponsiveContainer>
  );
}
