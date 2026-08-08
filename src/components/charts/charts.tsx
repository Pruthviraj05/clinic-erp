"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrendPoint } from "@/types/domain";
import { formatCurrency, formatNumber } from "@/lib/format";

/**
 * Reusable, theme-aware chart primitives. Colours pull from the CSS design
 * tokens (--chart-1..5) so they adapt to light/dark automatically.
 *
 * NOTE: these are client components, so props must be serialisable — we accept
 * a `format` string (not a formatter function) and build the formatter here.
 */
type ValueFormat = "number" | "currency";

function makeFormatter(format: ValueFormat) {
  return (v: number) => (format === "currency" ? formatCurrency(v) : formatNumber(v));
}

const AXIS = {
  stroke: "var(--muted-foreground)",
  fontSize: 12,
  tickLine: false,
  axisLine: false,
};

interface TooltipEntry {
  dataKey?: string | number;
  value?: number;
  color?: string;
  fill?: string;
}
interface TooltipBoxProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  formatter?: (v: number) => string;
}

function TooltipBox({ active, payload, label, formatter }: TooltipBoxProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium text-popover-foreground">{label}</p>
      {payload.map((p, i) => (
        <p key={p.dataKey ?? i} className="text-muted-foreground">
          <span
            className="mr-1.5 inline-block size-2 rounded-full align-middle"
            style={{ background: p.color ?? p.fill }}
          />
          {formatter ? formatter(p.value ?? 0) : p.value}
        </p>
      ))}
    </div>
  );
}

export function AreaTrend({
  data,
  color = "var(--chart-1)",
  height = 240,
  format = "number",
}: {
  data: TrendPoint[];
  color?: string;
  height?: number;
  format?: ValueFormat;
}) {
  const valueFormatter = makeFormatter(format);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="label" {...AXIS} />
        <YAxis {...AXIS} width={44} />
        <Tooltip content={<TooltipBox formatter={valueFormatter} />} cursor={{ stroke: "var(--border)" }} />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill="url(#areaFill)"
          dot={false}
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function BarTrend({
  data,
  color = "var(--chart-2)",
  height = 240,
  format = "number",
}: {
  data: TrendPoint[];
  color?: string;
  height?: number;
  format?: ValueFormat;
}) {
  const valueFormatter = makeFormatter(format);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <XAxis dataKey="label" {...AXIS} />
        <YAxis {...AXIS} width={44} />
        <Tooltip content={<TooltipBox formatter={valueFormatter} />} cursor={{ fill: "var(--muted)", opacity: 0.4 }} />
        <Bar dataKey="value" fill={color} radius={[6, 6, 0, 0]} maxBarSize={44} />
      </BarChart>
    </ResponsiveContainer>
  );
}

const DONUT_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

export function DonutChart({
  data,
  height = 240,
}: {
  data: TrendPoint[];
  height?: number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    // Stacks on narrow containers; the pie sizes itself to its container so it
    // never clips at 375px or inside 3-col dashboard cells.
    <div className="flex flex-col items-center gap-4 min-[420px]:flex-row min-[420px]:gap-6">
      <div className="h-full w-full max-w-[220px] min-[420px]:w-[55%]">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Tooltip content={<TooltipBox />} />
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            innerRadius="55%"
            outerRadius="90%"
            paddingAngle={2}
            strokeWidth={0}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      </div>
      <ul className="w-full flex-1 space-y-2 text-sm">
        {data.map((d, i) => (
          <li key={d.label} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-muted-foreground">
              <span
                className="size-2.5 rounded-full"
                style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }}
              />
              {d.label.replace(/_/g, " ").toLowerCase()}
            </span>
            <span className="font-medium">
              {d.value}
              <span className="ml-1 text-xs text-muted-foreground">
                ({total ? Math.round((d.value / total) * 100) : 0}%)
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
