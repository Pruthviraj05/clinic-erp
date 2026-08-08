"use client";

import dynamic from "next/dynamic";

/**
 * Lazy chart entrypoints. recharts (~130 kB gzip with its d3 deps) loads only
 * when a chart actually mounts in the browser, instead of riding along in the
 * dashboard/analytics route bundles. Do NOT add recharts to
 * experimental.optimizePackageImports — it breaks the build.
 */

function ChartSkeleton({ height = 240 }: { height?: number }) {
  return <div style={{ height }} className="w-full animate-pulse rounded-lg bg-muted/40" />;
}

export const AreaTrend = dynamic(() => import("./charts").then((m) => m.AreaTrend), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});

export const BarTrend = dynamic(() => import("./charts").then((m) => m.BarTrend), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});

export const DonutChart = dynamic(() => import("./charts").then((m) => m.DonutChart), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});
