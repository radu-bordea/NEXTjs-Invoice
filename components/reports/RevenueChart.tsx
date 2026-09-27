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
import type { MonthlyReport } from "@/lib/invoice-reports";

/**
 * Bar chart comparing billed vs. paid revenue per month. Needs to
 * be a client component since Recharts renders via browser APIs
 * (SVG measurement, interactivity) — the page fetching the data
 * stays a server component, only the chart itself is client-side.
 */
export function RevenueChart({ data }: { data: MonthlyReport[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <XAxis dataKey="monthLabel" fontSize={12} />
        <YAxis fontSize={12} />
        <Tooltip
          formatter={(value) => {
            const num = typeof value === "number" ? value : Number(value) || 0;
            return num.toLocaleString("nb-NO", { maximumFractionDigits: 0 });
          }}
        />
        <Legend />
        <Bar dataKey="billedTotal" name="Billed" fill="#99d8c9" />
        <Bar dataKey="paidTotal" name="Paid" fill="#0f766e" />
      </BarChart>
    </ResponsiveContainer>
  );
}
