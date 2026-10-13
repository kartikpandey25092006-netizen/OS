import React, { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ALGORITHM_NAMES } from "../../engine/config.js";
import {
  formatNumber,
  formatPercent,
  RESULT_METRICS,
} from "./resultFormatting.js";

/** A metric can be changed without rerunning the schedules. */
export function ComparisonChart({ comparison }) {
  const [metricKey, setMetricKey] = useState(comparison.adaptive.metric);
  useEffect(
    () => setMetricKey(comparison.adaptive.metric),
    [comparison.adaptive.metric],
  );
  const metric =
    RESULT_METRICS.find(({ key }) => key === metricKey) ?? RESULT_METRICS[0];
  const data = [...ALGORITHM_NAMES, "Adaptive"].map((name) => ({
    name,
    value: metric.getValue(comparison.results[name].metrics),
  }));
  const formatValue = metric.fraction ? formatPercent : formatNumber;

  return (
    <section
      aria-labelledby="comparison-heading"
      className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2
            id="comparison-heading"
            className="text-lg font-semibold text-foreground"
          >
            Compare algorithms
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Adaptive is highlighted in the primary color.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          Metric
          <select
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
            value={metric.key}
            onChange={(event) => setMetricKey(event.target.value)}
          >
            {RESULT_METRICS.map(({ key, label }) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div
        role="img"
        aria-label={`${metric.label} comparison chart for five fixed algorithms and the adaptive choice`}
        className="h-72 w-full"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 24, bottom: 4, left: 8 }}
          >
            <CartesianGrid
              stroke="var(--border)"
              strokeDasharray="3 3"
              horizontal={false}
            />
            <XAxis
              type="number"
              domain={
                metric.fraction || metric.key === "jainsFairnessIndex"
                  ? [0, 1]
                  : [0, "dataMax"]
              }
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              tickFormatter={(value) =>
                metric.fraction
                  ? `${Math.round(value * 100)}%`
                  : formatNumber(value, 1)
              }
            />
            <YAxis
              type="category"
              dataKey="name"
              width={93}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            />
            <Tooltip
              formatter={(value) => [formatValue(value), metric.label]}
              cursor={{ fill: "var(--accent)", opacity: 0.55 }}
            />
            <Bar dataKey="value" radius={[0, 5, 5, 0]} maxBarSize={27}>
              {data.map(({ name }) => (
                <Cell
                  key={name}
                  fill={
                    name === "Adaptive" ? "var(--chart-3)" : "var(--chart-1)"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
