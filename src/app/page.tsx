"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  Bell,
  Bot,
  ChevronDown,
  CircleGauge,
  ClipboardCheck,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  UsersRound,
  Wrench,
  X,
  History as HistoryIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { formatRelativeTime } from "@/lib/operations/validation";
import { eyebrow, eyebrowAccent, statusTone } from "@/features/operations/module-styles";
import { AlarmChart } from "@/features/operations/alarm-chart";
import { NotificationBell } from "@/features/operations/notification-bell";
import {
  alarmCopy,
  alarmCopyHead,
  alarmDescription,
  alarmList,
  alarmRow,
  alarmSeverity,
  alarmSeverityTones,
  alarmStatusBadge,
  alarmTime,
  appShell,
  attentionDot,
  avatar,
  bottomStrip,
  breadcrumb,
  brandCaption,
  brandName,
  brandRow,
  button,
  buttonPrimary,
  buttonSecondary,
  contentArea,
  countBadge,
  donut,
  donutCenter,
  emptyState,
  filterButton,
  filterButtonSelected,
  filterStrip,
  filterStripClear,
  healthBar,
  healthBarFill,
  healthBarFillLow,
  healthSummary,
  healthValue,
  headingActions,
  headingSubtitle,
  iconButton,
  legend,
  legendDot,
  legendRow,
  liveIndicator,
  machineIcon,
  machineInfo,
  machineList,
  machineMeta,
  machineNameRow,
  machineRow,
  machineStatusTag,
  machineStatusTone,
  machineTag,
  metricCard,
  metricDelta,
  metricGrid,
  metricIcon,
  metricLabel,
  metricNote,
  metricTop,
  metricTones,
  metricValue,
  metricValueRow,
  mutedIcon,
  navCount,
  navItem,
  navItemActive,
  navLabel,
  navLabelSpaced,
  notificationButton,
  pageContent,
  pageHeading,
  pageHeadingTitle,
  panel,
  panelHeader,
  panelSubtitle,
  panelTitle,
  panelTitleRow,
  progressFill,
  progressTrack,
  pulseDot,
  searchBox,
  searchInput,
  sectionGrid,
  sidebar,
  sidebarFooter,
  sidebarOpen,
  siteDot,
  siteName,
  siteSelector,
  stripBody,
  stripIcon,
  stripLink,
  stripMeta,
  stripProgress,
  stripProgressLabels,
  stripTitle,
  systemMeta,
  systemStatus,
  systemTitle,
  tableToolbar,
  textButton,
  topAvatar,
  topbar,
  topbarActions,
  userCard,
  userCopyMeta,
  userCopyName,
} from "@/features/operations/dashboard-styles";
import type { Alarm, Machine } from "@/lib/operations/types";

type Summary = {
  totalMachines: number;
  activeAlarms: number;
  maintenanceRecords: number;
  running: number;
  stop: number;
  alarm: number;
  maintenance: number;
  completedMaintenance?: number;
};

type DashboardResponse = Summary & { machines: Machine[]; alarms: Alarm[] };

const emptySummary: Summary = {
  totalMachines: 0,
  activeAlarms: 0,
  maintenanceRecords: 0,
  running: 0,
  stop: 0,
  alarm: 0,
  maintenance: 0,
  completedMaintenance: 0,
};

function labelStatus(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function healthForStatus(status: string) {
  if (status === "running") return 96;
  if (status === "maintenance") return 71;
  if (status === "alarm") return 48;
  return 20;
}

function alarmTone(status: string) {
  if (status === "closed") return "resolved";
  if (status === "in_progress") return "warning";
  return "critical";
}

export function DashboardView() {
  const router = useRouter();
  const { user, role } = useCurrentUser();
  const metadataName = user?.user_metadata?.display_name;
  const displayName: string = typeof metadataName === "string" && metadataName.trim() ? metadataName.trim() : user?.email?.split("@")[0] ?? "User";
  const initials = displayName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const [summary, setSummary] = useState<Summary>(emptySummary);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [dataState, setDataState] = useState<"loading" | "ready" | "fallback">("loading");
  const [activeNav, setActiveNav] = useState("Overview");
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [range, setRange] = useState<"24h" | "7d">("24h");
  const [referenceTime, setReferenceTime] = useState(0);

  useEffect(() => {
    let active = true;
    fetch("/api/dashboard", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("dashboard unavailable");
        return response.json() as Promise<DashboardResponse>;
      })
      .then((data) => {
        if (!active) return;
        setSummary({
          totalMachines: Number(data.totalMachines ?? 0),
          activeAlarms: Number(data.activeAlarms ?? 0),
          maintenanceRecords: Number(data.maintenanceRecords ?? 0),
          running: Number(data.running ?? 0),
          stop: Number(data.stop ?? 0),
          alarm: Number(data.alarm ?? 0),
          maintenance: Number(data.maintenance ?? 0),
          completedMaintenance: Number(data.completedMaintenance ?? 0),
        });
        setMachines(Array.isArray(data.machines) ? data.machines : []);
        setAlarms(Array.isArray(data.alarms) ? data.alarms : []);
        setReferenceTime(Date.now());
        setDataState("ready");
      })
      .catch(() => {
        if (!active) return;
        setSummary(emptySummary);
        setMachines([]);
        setAlarms([]);
        setDataState("fallback");
      });
    return () => {
      active = false;
    };
  }, []);

  const machineName = useMemo(() => {
    const names = new Map(machines.map((machine) => [machine.id, machine.machine_id]));
    return (id: string) => names.get(id) ?? "Unknown machine";
  }, [machines]);

  const rangeMs = range === "24h" ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
  const rangeStart = referenceTime ? referenceTime - rangeMs : 0;
  const filteredAlarms = alarms.filter((alarm) => {
    const matchesQuery = `${alarm.alarm_code} ${alarm.description} ${machineName(alarm.machine_id)}`.toLowerCase().includes(query.toLowerCase());
    const occurredAt = new Date(alarm.occurred_at).getTime();
    return alarm.status !== "closed" && matchesQuery && (Number.isNaN(occurredAt) || occurredAt >= rangeStart);
  });

  const uptime = summary.totalMachines ? ((summary.running / summary.totalMachines) * 100).toFixed(1) : "0.0";
  const maintenanceCompleted = summary.completedMaintenance ?? 0;
  const compliance = summary.maintenanceRecords ? Math.round((maintenanceCompleted / summary.maintenanceRecords) * 100) : 0;
  const runningPercent = summary.totalMachines ? (summary.running / summary.totalMachines) * 100 : 0;
  const maintenancePercent = summary.totalMachines ? (summary.maintenance / summary.totalMachines) * 100 : 0;
  const alarmPercent = summary.totalMachines ? (summary.alarm / summary.totalMachines) * 100 : 0;

  async function signOut() {
    try {
      await createClient().auth.signOut();
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  function navigate(label: string) {
    setActiveNav(label);
    setMenuOpen(false);
    if (label === "Overview") router.push("/dashboard");
    if (label === "Machines") router.push("/machines");
    if (label === "Alarms") router.push("/alarms");
    if (label === "Maintenance") router.push("/maintenance");
    if (label === "Reports") router.push("/reports");
    if (label === "Users") router.push("/users");
    if (label === "Settings") router.push("/settings");
  }

  return (
    <main className={appShell}>
      <aside className={`${sidebar} ${menuOpen ? sidebarOpen : ""}`}>
        <div className={brandRow}>
          <div className="grid h-[31px] w-[31px] place-items-center rounded-[9px] bg-brand text-white shadow-[0_5px_12px_#3478f633]"><Activity size={19} strokeWidth={2.5} /></div>
          <div><p className={brandName}>FORGE<span>OPS</span></p><p className={brandCaption}>Factory command center</p></div>
          <button className={`${iconButton} ml-auto max-[680px]:grid`} onClick={() => setMenuOpen(false)} aria-label="ปิดเมนู"><X size={19} /></button>
        </div>

        <div className={siteSelector}><div className={siteDot} /><div><p className={eyebrow}>ACTIVE SITE</p><p className={siteName}>Plant 01 · Bangkok</p></div><ChevronDown size={15} className={mutedIcon} /></div>

        <nav aria-label="เมนูหลัก">
          <p className={navLabel}>WORKSPACE</p>
          {[
            { label: "Overview", Icon: LayoutDashboard }, { label: "Machines", Icon: Bot }, { label: "Alarms", Icon: Bell }, { label: "Maintenance", Icon: Wrench },
          ].map(({ label, Icon }) => (
            <button key={label} className={`${navItem} ${activeNav === label ? navItemActive : ""}`} onClick={() => navigate(label)}><Icon size={17} /><span>{label}</span>{label === "Alarms" && <span className={navCount}>{summary.activeAlarms}</span>}</button>
          ))}
          <p className={`${navLabel} ${navLabelSpaced}`}>CONTROL</p>
          {[
            { label: "History", Icon: HistoryIcon },
            { label: "Audit", Icon: ClipboardCheck },
            { label: "Requests", Icon: Settings2 },
            { label: "Reports", Icon: ClipboardCheck },
            { label: "Users", Icon: UsersRound },
            { label: "Settings", Icon: Settings2 },
          ].filter(({ label }) => label !== "Users" || role === "admin").map(({ label, Icon }) => (
            <button key={label} className={`${navItem} ${activeNav === label ? navItemActive : ""}`} onClick={() => navigate(label)}><Icon size={17} /><span>{label}</span></button>
          ))}
        </nav>

        <div className={sidebarFooter}>
          <div className={systemStatus}><span className={pulseDot} /><div><p className={systemTitle}>{dataState === "ready" ? "Live data connected" : dataState === "fallback" ? "Data unavailable · check Supabase" : "Connecting to Supabase"}</p><p className={systemMeta}>Last sync · just now</p></div></div>
          <button className={userCard} onClick={() => void signOut()}><div className={avatar}>{initials}</div><div className="min-w-0"><p className={userCopyName}>{displayName}</p><span className={userCopyMeta}>{role ? labelStatus(role) : "Signed in"} · Sign out</span></div><MoreHorizontal size={17} className={mutedIcon} /></button>
        </div>
      </aside>

      <section className={contentArea}>
        <header className={topbar}>
          <button className={`${iconButton} max-[680px]:grid`} onClick={() => setMenuOpen(true)} aria-label="เปิดเมนู"><Menu size={20} /></button>
          <div className={breadcrumb}><span>Workspace</span><span>/</span><strong>{activeNav}</strong></div>
          <div className={topbarActions}><span className={liveIndicator}><span />{dataState === "ready" ? "Live data" : "Data unavailable"}</span><NotificationBell alarms={alarms} machineName={machineName} /><button className={`${iconButton} ${notificationButton}`} aria-label="การแจ้งเตือน"><Bell size={18} /><i /></button><div className={topAvatar}>{initials}</div></div>
        </header>

        <div className={pageContent}>
          <div className={pageHeading}>
            <div><p className={`${eyebrow} ${eyebrowAccent}`}>LIVE OPERATIONS · PLANT 01</p><h1 className={pageHeadingTitle}>Good morning, {displayName}.</h1><p className={headingSubtitle}>Here&apos;s what&apos;s happening across Plant 01 today.</p></div>
            <div className={headingActions}><select className={`${button} ${buttonSecondary}`} value={range} onChange={(event) => { const next = event.target.value as "24h" | "7d"; setRange(next); setReferenceTime(Date.now()); }} aria-label="Dashboard time range"><option value="24h">Last 24 hours</option><option value="7d">Last 7 days</option></select><button className={`${button} ${buttonPrimary}`} onClick={() => router.push("/maintenance")}><Wrench size={15} />Log maintenance</button></div>
          </div>

          <section className={metricGrid} aria-label="ภาพรวมโรงงาน">
            <MetricCard label="Total machines" value={String(summary.totalMachines)} delta={`${summary.running} running`} note={dataState === "fallback" ? "data unavailable · check Supabase" : "live from Supabase"} icon={<Bot size={18} />} tone="blue" />
            <MetricCard label="Active alarms" value={String(summary.activeAlarms)} delta={`${summary.alarm} critical`} note="need attention" icon={<AlertTriangle size={18} />} tone="orange" alert />
            <MetricCard label="Maintenance records" value={String(summary.maintenanceRecords).padStart(2, "0")} delta={`${summary.maintenance} machines`} note="scheduled work" icon={<Wrench size={18} />} tone="green" />
            <MetricCard label="Running rate" value={`${uptime}%`} delta={`${summary.totalMachines} total`} note="current machine state" icon={<CircleGauge size={18} />} tone="violet" />
          </section>

          <div className={sectionGrid}>
            <section className={panel}>
              <div className={panelHeader}><div><div className={panelTitleRow}><h2 className={panelTitle}>Alarm queue</h2><span className={countBadge}>{summary.activeAlarms} active</span></div><p className={panelSubtitle}>Real-time alerts requiring attention</p></div><button className={textButton} onClick={() => router.push("/alarms")}>View all <span className="ml-[5px] text-[15px]">→</span></button></div>
              <div className={tableToolbar}><div className={searchBox}><Search size={16} /><input className={searchInput} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search alarms..." aria-label="ค้นหา alarms" /></div><button className={`${filterButton} ${showFilters ? filterButtonSelected : ""}`} onClick={() => setShowFilters(!showFilters)}><SlidersHorizontal size={15} />Filter</button></div>
              {showFilters && <div className={filterStrip}><span>Showing</span><strong>{range === "24h" ? "Last 24 hours" : "Last 7 days"}</strong><button className={filterStripClear} onClick={() => { setQuery(""); setRange("24h"); }}>Clear</button></div>}
              <div className={alarmList}>{filteredAlarms.slice(0, 6).map((alarm) => <AlarmRow key={alarm.id} alarm={alarm} machine={machineName(alarm.machine_id)} />)}</div>
              {filteredAlarms.length === 0 && <div className={emptyState}>No alarms match your search and time range.</div>}
              <AlarmChart alarms={alarms} days={range === "24h" ? 1 : 7} />
            </section>

            <section className={`${panel} max-[1100px]:min-h-0`}>
              <div className={panelHeader}><div><h2 className={panelTitle}>Machine health</h2><p className={panelSubtitle}>Status across production lines</p></div><button className={iconButton} onClick={() => router.push("/machines")} aria-label="Open machines"><MoreHorizontal size={18} /></button></div>
              <div className={healthSummary}><div className={donut} style={{ background: `conic-gradient(var(--color-success) 0 ${runningPercent}%, var(--color-warn) ${runningPercent}% ${runningPercent + maintenancePercent}%, var(--color-danger) ${runningPercent + maintenancePercent}% ${runningPercent + maintenancePercent + alarmPercent}%, var(--color-steel) ${runningPercent + maintenancePercent + alarmPercent}% 100%)` }}><div className={donutCenter}><strong>{summary.totalMachines}</strong><span>machines</span></div></div><div className={legend}><Legend color="var(--color-success)" label="Running" value={summary.running} /><Legend color="var(--color-warn)" label="Maintenance" value={summary.maintenance} /><Legend color="var(--color-danger)" label="Alarm" value={summary.alarm} /><Legend color="var(--color-steel)" label="Stopped" value={summary.stop} /></div></div>
              <div className={machineList}>{machines.slice(0, 5).map((machine) => <MachineRow key={machine.id} machine={machine} />)}{machines.length === 0 && <div className={emptyState}>No machines found.</div>}</div>
            </section>
          </div>

          <section className={bottomStrip}><div className={stripIcon}><ShieldCheck size={18} /></div><div className={stripBody}><strong className={stripTitle}>Maintenance completion</strong><span className={stripMeta}>{maintenanceCompleted} of {summary.maintenanceRecords} work orders completed</span></div><div className={stripProgress}><div className={stripProgressLabels}><span>{compliance}%</span><span>Target 90%</span></div><div className={progressTrack}><div className={progressFill} style={{ width: `${Math.min(100, compliance)}%` }} /></div></div><button className={`${textButton} ${stripLink}`} onClick={() => router.push("/maintenance")}>View records <span className="ml-[5px] text-[15px]">→</span></button></section>
        </div>
      </section>
    </main>
  );
}

export default DashboardView;

function MetricCard({ label, value, delta, note, icon, tone, alert = false }: { label: string; value: string; delta: string; note: string; icon: React.ReactNode; tone: string; alert?: boolean }) {
  const palette = metricTones[tone] ?? metricTones.blue;
  return <div className={`${metricCard} ${palette.card}`}><div className={metricTop}><span className={`${metricIcon} ${palette.icon}`}>{icon}</span>{alert && <span className={attentionDot}>● attention</span>}</div><p className={metricLabel}>{label}</p><div className={metricValueRow}><strong className={metricValue}>{value}</strong><span className={`${metricDelta} ${palette.delta}`}>{delta}</span></div><p className={metricNote}>{note}</p></div>;
}

function AlarmRow({ alarm, machine }: { alarm: Alarm; machine: string }) {
  const tone = alarmTone(alarm.status);
  return <div className={alarmRow}><div className={`${alarmSeverity} ${alarmSeverityTones[tone] ?? ""}`}><AlertTriangle size={15} /></div><div className={alarmCopy}><div className={alarmCopyHead}><strong>{alarm.alarm_code}</strong><span className={machineTag}>{machine}</span></div><p className={alarmDescription}>{alarm.description}</p></div><div className={alarmTime}>{formatRelativeTime(alarm.occurred_at)}</div><span className={`${alarmStatusBadge} ${statusTone[tone] ?? ""}`}>{labelStatus(alarm.status)}</span></div>;
}

function MachineRow({ machine }: { machine: Machine }) {
  const health = healthForStatus(machine.status);
  return <div className={machineRow}><div className={machineIcon}><Bot size={17} /></div><div className={machineInfo}><div className={machineNameRow}><strong>{machine.machine_id}</strong><span className={`${machineStatusTag} ${machineStatusTone[machine.status] ?? statusTone.stop}`}>{labelStatus(machine.status)}</span></div><span className={machineMeta}>{machine.machine_type} · {machine.location}</span></div><div className={healthBar}><div className={health < 60 ? healthBarFillLow : healthBarFill} style={{ width: `${health}%` }} /></div><span className={healthValue}>{health}%</span></div>;
}

function Legend({ color, label, value }: { color: string; label: string; value: number }) {
  return <div className={legendRow}><span className={legendDot} style={{ background: color }} /><span>{label}</span><strong>{value}</strong></div>;
}
