"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import type { Alarm } from "@/lib/operations/types";

/**
 * Bonus requirement: notifications.
 *
 * Rather than adding a polling service, this derives the notification list from
 * the alarms the page already loaded: anything that is still open or in
 * progress, newest first. The browser Notification API is used only to surface
 * a desktop notification when permission has already been granted, so nothing
 * is requested without the user asking for it.
 */
export function NotificationBell({ alarms, machineName }: { alarms: Alarm[]; machineName: (id: string) => string }) {
  const [open, setOpen] = useState(false);
  // Starts as "default" and is only changed from the click handler below, so no
  // effect is needed to read browser state and the component stays SSR-safe.
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");

  const active = alarms
    .filter((alarm) => alarm.status !== "closed")
    .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());

  useEffect(() => {
    if (permission !== "granted" || active.length === 0) return;
    const newest = active[0];
    const seen = sessionStorage.getItem("forgeops-notified");
    if (seen === newest.id) return;
    sessionStorage.setItem("forgeops-notified", newest.id);
    try {
      new Notification(`New alarm · ${newest.alarm_code}`, {
        body: `${machineName(newest.machine_id)} · ${new Date(newest.occurred_at).toLocaleString("en-GB")}`,
      });
    } catch {
      // Some browsers block constructor-based notifications; the in-app list still works.
    }
  }, [active, machineName, permission]);

  async function askPermission() {
    if (!("Notification" in window)) return;
    setPermission(await Notification.requestPermission());
  }

  const tone = active.length === 0
    ? "border-line text-muted"
    : "border-danger bg-danger-soft text-danger";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`relative grid place-items-center rounded-[7px] border p-1.5 transition hover:bg-brand-soft ${tone}`}
        aria-label={`Notifications, ${active.length} active alarm(s)`}
        aria-expanded={open}
      >
        {active.length === 0 ? <BellOff size={15} /> : <Bell size={15} />}
        {active.length > 0 && (
          <span className="absolute -right-1 -top-1 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-danger px-1 text-[8px] font-bold text-white">
            {active.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-30 w-[290px] rounded-[10px] border border-line bg-white p-3 shadow-[0_18px_50px_#12243a2e]">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-bold">Active alarms</p>
            <span className="text-[9px] text-muted">{active.length} item(s)</span>
          </div>

          {permission !== "granted" && permission !== "unsupported" && (
            <button type="button" onClick={() => void askPermission()} className="mb-2 w-full rounded-[6px] border border-line bg-[#f8fafc] px-2 py-1.5 text-left text-[9px] text-muted hover:text-ink">
              Enable desktop notifications
            </button>
          )}

          <div className="max-h-[220px] overflow-y-auto">
            {active.slice(0, 12).map((alarm) => (
              <div key={alarm.id} className="border-b border-line py-1.5 last:border-0">
                <p className="text-[10px] font-bold">{alarm.alarm_code}</p>
                <p className="text-[9px] text-muted">{machineName(alarm.machine_id)}</p>
                <p className="text-[8px] text-[#a3adb8]">{new Date(alarm.occurred_at).toLocaleString("en-GB")}</p>
              </div>
            ))}
            {active.length === 0 && <p className="py-3 text-center text-[10px] text-muted">No active alarms.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
