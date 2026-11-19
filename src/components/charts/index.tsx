"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  LabelList,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ReferenceLine,
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
  return `${Math.round(seconds / 3600)}h`;
}

/** Whole-hour axis ticks once a chart spans an hour or more. */
function hourTicks(maxSeconds: number) {
  if (maxSeconds < 3600) return undefined;
  const maxHours = Math.max(1, Math.ceil(maxSeconds / 3600));
  const step = Math.max(1, Math.ceil(maxHours / 4));
  const ticks: number[] = [];
  for (let hour = 0; hour <= maxHours; hour += step) ticks.push(hour * 3600);
  return ticks;
}

export function BarTrendChart({
  data,
  height = 220,
  color = "var(--primary)",
  showYAxis = true,
  referenceY,
  referenceLabel,
}: {
  data: Array<{ label: string; seconds: number; shortLabel?: string }>;
  height?: number;
  color?: string;
  showYAxis?: boolean;
  referenceY?: number;
  referenceLabel?: string;
}) {
  const maxSeconds = Math.max(0, ...data.map((point) => point.seconds));
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
              ticks={hourTicks(maxSeconds)}
              width={46}
            />
          ) : null}
          <Tooltip
            cursor={{ fill: "var(--surface-2)", radius: 6 }}
            contentStyle={tooltipStyle}
            labelStyle={{ fontWeight: 700, marginBottom: 2 }}
            formatter={(value) => [formatDuration(Number(value)), "Tracked"]}
          />
          {referenceY && referenceY > 0 ? (
            <ReferenceLine
              y={referenceY}
              stroke="var(--warning)"
              strokeDasharray="4 4"
              ifOverflow="extendDomain"
              label={{
                value: referenceLabel ?? "Target",
                position: "insideTopRight",
                fill: "var(--muted-2)",
                fontSize: 9,
              }}
            />
          ) : null}
          <Bar dataKey="seconds" fill={color} radius={0} maxBarSize={38} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export type StackedSeries = { id: string; name: string; color: string; total?: number };
export type StackedPoint = {
  label: string;
  shortLabel?: string;
  seconds: number;
  segments: Record<string, number>;
};

function SegmentLabel(props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  value?: number | string;
  name?: string;
}) {
  const { x = 0, y = 0, width = 0, height = 0, name = "" } = props;
  const value = Number(props.value ?? 0);
  if (!name || value <= 0 || width < 8) return null;
  const cx = x + width / 2;
  const cy = y + height / 2;
  const estimatedWidth = name.length * 5.3;
  const horizontal = estimatedWidth <= width - 8 && height >= 14;
  if (!horizontal && height < 42) return null;
  const maxChars = Math.max(3, Math.floor((height - 10) / 5.4));
  const label = horizontal || name.length <= maxChars ? name : `${name.slice(0, Math.max(1, maxChars - 1))}…`;
  return (
    <text
      x={cx}
      y={cy}
      transform={horizontal ? undefined : `rotate(-90 ${cx} ${cy})`}
      textAnchor="middle"
      dominantBaseline="middle"
      fill="rgba(255,255,255,0.94)"
      stroke="rgba(8,8,18,0.4)"
      strokeWidth={2.4}
      paintOrder="stroke"
      fontSize={9}
      fontWeight={700}
      style={{ pointerEvents: "none" }}
    >
      {label}
    </text>
  );
}

function StackedTooltip({
  active,
  payload,
  series,
}: {
  active?: boolean;
  payload?: Array<{ payload?: Record<string, unknown> }>;
  series: StackedSeries[];
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;
  const total = Number(point.seconds ?? 0);
  const rows = series.filter((entry) => Number(point[entry.id] ?? 0) > 0);
  return (
    <div style={tooltipStyle}>
      <p style={{ fontWeight: 700, marginBottom: 4 }}>{String(point.label ?? "")}</p>
      <p style={{ color: "var(--muted)", marginBottom: 6 }}>{formatDuration(total)} tracked</p>
      <div style={{ display: "grid", gap: 3 }}>
        {rows.map((entry) => (
          <div key={entry.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: entry.color, flexShrink: 0 }} />
            <span style={{ flex: 1 }}>{entry.name}</span>
            <span style={{ color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>
              {formatDuration(Number(point[entry.id] ?? 0))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StackedBarTrendChart({
  data,
  series,
  height = 220,
  showYAxis = true,
}: {
  data: StackedPoint[];
  series: StackedSeries[];
  height?: number;
  showYAxis?: boolean;
}) {
  const maxSeconds = Math.max(0, ...data.map((point) => point.seconds));
  const rows = data.map((point) => {
    const row: Record<string, string | number> = {
      label: point.label,
      shortLabel: point.shortLabel ?? point.label,
      seconds: point.seconds,
    };
    for (const entry of series) row[entry.id] = point.segments[entry.id] ?? 0;
    return row;
  });

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 4, bottom: 0, left: showYAxis ? -16 : 0 }}>
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
              ticks={hourTicks(maxSeconds)}
              width={46}
            />
          ) : null}
          <Tooltip cursor={{ fill: "var(--surface-2)", radius: 6 }} content={<StackedTooltip series={series} />} />
          {series.map((entry) => (
            <Bar
              key={entry.id}
              dataKey={entry.id}
              stackId="tracked"
              fill={entry.color}
              maxBarSize={38}
              radius={0}
            >
              <LabelList dataKey={entry.id} content={<SegmentLabel name={entry.name} />} />
            </Bar>
          ))}
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
  const maxSeconds = Math.max(0, ...data.map((point) => point.seconds));
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
            ticks={hourTicks(maxSeconds)}
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
