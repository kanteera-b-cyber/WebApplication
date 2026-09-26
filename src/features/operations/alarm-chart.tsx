"use client";

import { useMemo, useState } from "react";
import type { Alarm } from "@/lib/operations/types";

/**
 * Bonus requirement: an alarm-count chart.
 *
 * Groups the alarms that fall inside the selected range into one bucket per
 * day and draws simple CSS bars, so the chart needs no charting dependency and
 * inherits the light/dark palette from the theme tokens.
 */
export function AlarmChart({ alarms, days = 7 }: { alarms: Alarm[]; days?: number }) {
  const buckets = useMemo(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const series = Array.from({ length: days }, (_, index) => {
      const end = new Date(today);
      end.setDate(today.getDate() - (days - 1 - index));
      const start = new Date(end);
      start.setDate(end.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      return { start, end, label: end.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }), total: 0, open: 0, closed: 0 };
    });

    for (const alarm of alarms) {
      const at = new Date(alarm.occurred_at).getTime();
      const bucket = series.find((slot) => at >= slot.start.getTime() && at < slot.end.getTime());
      if (!bucket) continue;
      bucket.total += 1;
      if (alarm.status === "open" || alarm.status === "in_progress") bucket.open += 1;
      else bucket.closed += 1;
    }
    return series;
  }, [alarms, days]);

  const peak = Math.max(1, ...buckets.map((bucket) => bucket.total));
  const [hover, setHover] = useState<number | null>(null);

  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center gap-4 text-[9px] text-[#8792a0]">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-danger" />Still active</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-success" />Closed</span>
      </div>
      <div className="flex h-[104px] items-end gap-1.5" role="img" aria-label={`Alarms per day over the last ${days} days`}>
        {buckets.map((bucket, index) => {
          const activeHeight = bucket.total === 0 ? 0 : Math.round((bucket.open / peak) * 100);
          const closedHeight = bucket.total === 0 ? 0 : Math.round((bucket.closed / peak) * 100);
          return (
            <div
              key={bucket.label}
              className="flex flex-1 flex-col justify-end gap-px"
              onMouseEnter={() => setHover(index)}
              onMouseLeave={() => setHover(null)}
              title={`${bucket.label}: ${bucket.total} alarm(s)`}
            >
              <div className="flex flex-col justify-end" style={{ height: `${Math.max(activeHeight, closedHeight, bucket.total > 0 ? 4 : 0)}%` }}>
                {closedHeight > 0 && <div className="w-full rounded-t-[3px] bg-success" style={{ height: `${closedHeight}%` }} />}
                {activeHeight > 0 && <div className="w-full bg-danger" style={{ height: `${activeHeight}%`, borderRadius: closedHeight > 0 ? 0 : "3px 3px 0 0" }} />}
              </div>
              <span className={`mt-1.5 text-center text-[8px] ${hover === index ? "font-bold text-ink" : "text-[#a3adb8]"}`}>{bucket.label}</span>
            </div>
          );
        })}
      </div>
      <p className="mt-1 text-center text-[9px] text-[#8792a0]">
        {buckets.reduce((sum, bucket) => sum + bucket.total, 0)} alarm(s) in the last {days} days · peak {peak}/day
      </p>
    </div>
  );
}
