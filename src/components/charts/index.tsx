"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatDuration } from "@/lib/utils";

const tooltipStyle = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "12px",
  boxShadow: "var(--shadow-pop)",
  fontSize: "12px",
  color: "var(--text)",
  padding: "8px 10px",
};

const axisStyle = {
  fontSize: 10,
  fill: "var(--muted-2)",
  fontFamily: "var(--font-manrope)",
};

function formatAxisDuration(value: number) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return "0";
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  const hours = seconds / 3600;
  return `${Number(hours.toFixed(hours >= 10 ? 0 : 1))}h`;
}

export function BarTrendChart({
  data,
  height = 220,
  color = "var(--primary)",
  showYAxis = true,
}: {
  data: Array<{ label: string; seconds: number; shortLabel?: string }>;
  height?: number;
  color?: string;
  showYAxis?: boolean;
}) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: showYAxis ? -16 : 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 5" />
          <XAxis
            dataKey="shortLabel"
            tickLine={false}
            axisLine={false}
            tick={axisStyle}
            interval={0}
            minTickGap={4}
          />
          {showYAxis ? (
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={axisStyle}
              tickFormatter={formatAxisDuration}
              width={46}
            />
          ) : null}
          <Tooltip
            cursor={{ fill: "var(--surface-2)", radius: 6 }}
            contentStyle={tooltipStyle}
            labelStyle={{ fontWeight: 700, marginBottom: 2 }}
            formatter={(value) => [formatDuration(Number(value)), "Tracked"]}
          />
          <Bar dataKey="seconds" fill={color} radius={[6, 6, 2, 2]} maxBarSize={38} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AreaTrendChart({
  data,
  height = 220,
  color = "var(--primary)",
}: {
  data: Array<{ label: string; seconds: number }>;
  height?: number;
  color?: string;
}) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -16 }}>
          <defs>
            <linearGradient id="area-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 5" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={axisStyle} minTickGap={16} />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={axisStyle}
            tickFormatter={formatAxisDuration}
            width={46}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            labelStyle={{ fontWeight: 700, marginBottom: 2 }}
            formatter={(value) => [formatDuration(Number(value)), "Tracked"]}
          />
          <Area
            type="monotone"
            dataKey="seconds"
            stroke={color}
            strokeWidth={2.2}
            fill="url(#area-fill)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 3, stroke: "var(--surface)" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DistributionDonut({
  data,
  height = 230,
  centerLabel,
  centerValue,
}: {
  data: Array<{ name: string; value: number; color: string }>;
  height?: number;
  centerLabel?: string;
  centerValue?: string;
}) {
  return (
    <div className="relative" style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="68%"
            outerRadius="92%"
            paddingAngle={2}
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`${entry.name}-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value, name) => [formatDuration(Number(value)), String(name)]}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="text-center">
          <p className="text-[26px] font-extrabold tracking-[-0.04em]">{centerValue}</p>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-2">{centerLabel}</p>
        </div>
      </div>
    </div>
  );
}
