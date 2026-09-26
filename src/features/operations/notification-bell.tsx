"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellOff, CheckCheck, ExternalLink, MonitorSmartphone, ShieldAlert } from "lucide-react";
import { formatRelativeTime } from "@/lib/operations/validation";
import { statusTone } from "@/features/operations/module-styles";

/**
 * The bell draws from whichever alarm shape its caller already has: the
 * dashboard passes its full `Alarm` rows, the module header passes the shorter
 * active-alarm rows from useActiveAlarms. Only these fields are read.
 */
type BellAlarm = {
  id: string;
  machine_id: string;
  alarm_code: string;
  description: string;
  status: string;
  occurred_at: string;
};

/**
 * Notifications, as a way in rather than a signpost.
 *
 * The list is derived from the alarms the dashboard already loaded, so nothing
 * polls. Every row is a link to that alarm on the Alarms page, which highlights
 * and scrolls to it, and the footer goes to the filtered list. A notification
 * that cannot be acted on is just an decoration.
 *
 * Desktop notifications are opt-in and only offered once the user asks, because
 * the browser permission prompt is better triggered by a click than by a page
 * load.
 */
export function NotificationBell({ alarms, machineName }: { alarms: BellAlarm[]; machineName: (id: string) => string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // Starts as "default" and only changes from the click handler, so no effect is
  // needed to read browser state and the component stays server-render safe.
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const rootRef = useRef<HTMLDivElement>(null);

  const active = alarms
    .filter((alarm) => alarm.status !== "closed")
    .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());

  const openCount = active.filter((alarm) => alarm.status === "open").length;
  const progressCount = active.length - openCount;

  // Close on Escape and on a click outside, so the panel behaves like a menu
  // rather than staying open over the page until the bell is pressed again.
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    function onPointer(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  useEffect(() => {
    if (permission !== "granted" || active.length === 0) return;
    const newest = active[0];
    // Keyed on when the newest alarm happened, not on which alarm it is.
    // Tracking the id looked right and was wrong: close the newest alarm and the
    // next one down became "newest", its id no longer matched, and the browser
    // announced an alarm that had been sitting there for hours. A time stamp
    // makes the rule what it was meant to be: only announce something that
    // happened after the last announcement.
    const lastAnnounced = Number(sessionStorage.getItem("forgeops-notified-at") ?? 0);
    const newestAt = new Date(newest.occurred_at).getTime();
    if (!Number.isFinite(newestAt) || newestAt <= lastAnnounced) return;
    sessionStorage.setItem("forgeops-notified-at", String(newestAt));
    try {
      const notice = new Notification(`New alarm · ${newest.alarm_code}`, {
        body: `${machineName(newest.machine_id)} · ${formatRelativeTime(newest.occurred_at)}`,
        tag: newest.id,
      });
      // A desktop notification cannot route on its own, so clicking it at least
      // brings the window forward, where the in-app list is waiting.
      notice.onclick = () => { window.focus(); router.push(`/alarms?id=${newest.id}`); };
    } catch {
      // Some browsers block constructor notifications; the in-app list still works.
    }
  }, [active, machineName, permission, router]);

  async function askPermission() {
    if (!("Notification" in window)) { setPermission("unsupported"); return; }
    setPermission(await Notification.requestPermission());
  }

  const go = useCallback((href: string) => {
    setOpen(false);
    router.push(href);
  }, [router]);

  const tone = active.length === 0 ? "border-line text-muted" : "border-danger bg-danger-soft text-danger";

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`relative grid place-items-center rounded-[7px] border p-1.5 transition hover:bg-brand-soft ${tone}`}
        aria-label={active.length === 0 ? "Notifications, nothing active" : `Notifications, ${active.length} active alarm(s)`}
        aria-expanded={open}
        aria-haspopup="menu"
        title={active.length === 0 ? "No active alarms" : `${openCount} open, ${progressCount} in progress`}
      >
        {active.length === 0 ? <BellOff size={15} /> : <Bell size={15} />}
        {active.length > 0 && (
          <span className="absolute -right-1 -top-1 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-danger px-1 text-[8px] font-bold text-white">
            {active.length}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Active alarms"
          className="absolute right-0 top-9 z-30 w-[310px] overflow-hidden rounded-[10px] border border-line bg-surface shadow-[0_18px_50px_#12243a2e]"
        >
          <div className="flex items-center justify-between border-b border-line px-3 py-2.5">
            <div>
              <p className="text-[11px] font-bold">Active alarms</p>
              <p className="mt-0.5 text-[9px] text-muted">
                {active.length === 0
                  ? "Nothing needs attention"
                  : `${pluralCount(openCount, "open")} · ${pluralCount(progressCount, "in progress")}`}
              </p>
            </div>
            {active.length > 0 && (
              <button
                type="button"
                role="menuitem"
                onClick={() => go("/alarms?status=open")}
                className="rounded-[6px] border border-line bg-sunken px-2 py-1 text-[9px] font-bold text-brand hover:bg-brand-soft"
              >
                View all
              </button>
            )}
          </div>

          {permission === "denied" ? (
            <p className="flex items-start gap-1.5 border-b border-line bg-sunken px-3 py-2 text-[9px] leading-[1.6] text-muted">
              <ShieldAlert size={12} className="mt-0.5 shrink-0 text-warn" />
              Desktop notifications are blocked in this browser. Allow them in the site settings to be told about an alarm while another tab is open.
            </p>
          ) : permission !== "granted" && permission !== "unsupported" ? (
            <button
              type="button"
              onClick={() => void askPermission()}
              className="flex w-full items-start gap-1.5 border-b border-line bg-sunken px-3 py-2 text-left text-[9px] leading-[1.6] text-muted hover:bg-brand-soft"
            >
              <MonitorSmartphone size={12} className="mt-0.5 shrink-0 text-brand" />
              <span>
                <strong className="block text-ink">Get a desktop alert</strong>
                Be told when a new alarm appears while you are on another tab. The browser will ask once.
              </span>
            </button>
          ) : null}

          <div className="max-h-[260px] overflow-y-auto">
            {active.map((alarm) => (
              <button
                key={alarm.id}
                type="button"
                role="menuitem"
                onClick={() => go(`/alarms?id=${alarm.id}`)}
                className="block w-full border-b border-line px-3 py-2 text-left transition last:border-0 hover:bg-brand-soft focus:bg-brand-soft focus:outline-none"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[10px] font-bold text-ink">{alarm.alarm_code}</p>
                  <span className={`shrink-0 rounded-[4px] px-[6px] py-[2px] text-[8px] font-bold capitalize ${statusTone[alarm.status] ?? ""}`}>
                    {alarm.status.replace("_", " ")}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-[9px] text-muted">{machineName(alarm.machine_id)} · {alarm.description}</p>
                <p className="mt-0.5 text-[8px] text-faint">{formatRelativeTime(alarm.occurred_at)}</p>
              </button>
            ))}
            {active.length === 0 && (
              <p className="flex flex-col items-center gap-1.5 px-3 py-6 text-center text-[10px] text-muted">
                <CheckCheck size={18} className="text-success" />
                Every alarm has been closed.
              </p>
            )}
          </div>

          {active.length > 0 && (
            <button
              type="button"
              role="menuitem"
              onClick={() => go("/alarms?status=open")}
              className="flex w-full items-center justify-center gap-1.5 border-t border-line bg-sunken px-3 py-2 text-[9px] font-bold text-brand hover:bg-brand-soft"
            >
              Open the alarm list <ExternalLink size={11} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function pluralCount(count: number, label: string) {
  return `${count} ${label}`;
}
