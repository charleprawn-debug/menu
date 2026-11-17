"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney } from "@/lib/money";

export interface SalesPoint {
  label: string;
  sales: number;
  orders: number;
}

export function SalesAreaChart({
  data,
  currency = "USD",
  locale = "ar",
  height = 260,
}: {
  data: SalesPoint[];
  currency?: string;
  locale?: string;
  height?: number;
}) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="sales-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            reversed={locale === "ar"}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={52}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickFormatter={(value) => formatMoney(value, currency, locale, { notation: "compact" })}
            orientation={locale === "ar" ? "right" : "left"}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "1px solid hsl(var(--border))",
              background: "hsl(var(--card))",
              fontSize: 12,
              direction: locale === "ar" ? "rtl" : "ltr",
            }}
            formatter={(value, name) => [
              name === "sales" ? formatMoney(Number(value), currency, locale) : String(value ?? ""),
              name === "sales" ? (locale === "ar" ? "المبيعات" : "Sales") : locale === "ar" ? "الطلبات" : "Orders",
            ]}
          />
          <Area type="monotone" dataKey="sales" stroke="#059669" strokeWidth={2.5} fill="url(#sales-fill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
