"use client";

import { useEffect, useState } from "react";
import { BarChart3, Download, FileText, LoaderCircle } from "lucide-react";
import { ModuleHeader } from "@/features/operations/module-header";
import {
  button,
  buttonPrimary,
  eyebrow,
  eyebrowAccent,
  heading,
  headingCopy,
  headingLead,
  headingTitle,
  moduleError,
  reportCard,
  reportGrid,
  shell,
  textButton,
} from "@/features/operations/module-styles";
import type { Alarm, Machine, MaintenanceRecord } from "@/lib/operations/types";

type ReportData = { machines: Machine[]; alarms: Alarm[]; maintenanceRows: MaintenanceRecord[] };

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportData>({ machines: [], alarms: [], maintenanceRows: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/dashboard", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load report data.");
        return response.json() as Promise<ReportData>;
      })
      .then((result) => { if (active) setData({ machines: result.machines ?? [], alarms: result.alarms ?? [], maintenanceRows: result.maintenanceRows ?? [] }); })
      .catch((loadError) => { if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load report data."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  function downloadCsv() {
    const lines = [
      ["Record type", "ID", "Machine", "Description", "Status", "Date/time"],
      ...data.machines.map((machine) => ["Machine", machine.machine_id, machine.machine_name, machine.location, machine.status, machine.updated_at ?? ""]),
      ...data.alarms.map((alarm) => ["Alarm", alarm.alarm_code, alarm.machine_id, alarm.description, alarm.status, alarm.occurred_at]),
      ...data.maintenanceRows.map((record) => ["Maintenance", record.id, record.machine_id, record.problem, record.status, record.started_at]),
    ];
    const csv = `\ufeff${lines.map((line) => line.map(csvCell).join(",")).join("\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "forgeops-report.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return <main className={shell}><ModuleHeader /><div className={heading}><div className={headingCopy}><p className={`${eyebrow} ${eyebrowAccent}`}>CONTROL / REPORTS</p><h1 className={headingTitle}>Operations reports</h1><p className={headingLead}>Review and export the current factory records.</p></div></div>{error && <div className={moduleError} role="alert">{error}</div>}<div className={reportGrid}><section className={reportCard}><BarChart3 size={20} /><h2 className="mb-2 mt-[15px] text-[17px]">Operations summary</h2><p className="mb-[18px] text-xs leading-[1.7] text-muted">{loading ? "Loading live data..." : `${data.machines.length} machines · ${data.alarms.length} alarms · ${data.maintenanceRows.length} maintenance records`}</p><a className={textButton} href="/dashboard">Open dashboard <span className="ml-[5px] text-[15px]">→</span></a></section><section className={reportCard}><FileText size={20} /><h2 className="mb-2 mt-[15px] text-[17px]">CSV export</h2><p className="mb-[18px] text-xs leading-[1.7] text-muted">Download the currently visible Supabase records for reporting or backup.</p><button className={`${button} ${buttonPrimary}`} type="button" onClick={downloadCsv} disabled={loading}><Download size={14} />{loading ? <LoaderCircle className="animate-spin" size={14} /> : null}Export CSV</button></section></div></main>;
}
