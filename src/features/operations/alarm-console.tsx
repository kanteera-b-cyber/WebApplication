"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { isOneOf, optionalText, requiredDate, requiredText, toDateTimeLocal } from "@/lib/operations/validation";
import { ALARM_STATUSES, type Alarm, type AlarmStatus } from "@/lib/operations/types";
import { ModuleHeader } from "@/features/operations/module-header";
import {
  alarmColumns,
  button,
  buttonPrimary,
  buttonSecondary,
  eyebrow,
  eyebrowAccent,
  formGrid,
  formGridFull,
  formHint,
  heading,
  headingCopy,
  headingLead,
  headingTitle,
  iconButton,
  modalActions,
  modalBackdrop,
  modalCard,
  modalControlRow,
  modalControl,
  modalHeader,
  modalLabel,
  modalTextarea,
  modalTitle,
  moduleEmpty,
  moduleError,
  rowDescription,
  rowStrong,
  searchBox,
  searchInput,
  select,
  shell,
  tableCard,
  tableHead,
  tableRow,
  toolbar,
} from "@/features/operations/module-styles";
import { listActiveMachines, MACHINE_OPTION_COLUMNS } from "@/lib/operations/machines";

type MachineOption = { id: string; machine_id: string };

const blankAlarm: Alarm = { id: "", machine_id: "", alarm_code: "", description: "", occurred_at: "", cause: null, action_taken: null, status: "open" };

function messageFromError(error: unknown) {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
  return "Unable to save alarm data.";
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

export function AlarmConsole() {
  const router = useRouter();
  const { role } = useCurrentUser();
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [machines, setMachines] = useState<MachineOption[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState<Alarm | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const canManageDetails = role === "admin";
  const canDelete = role === "admin";

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.replace("/login");
          return;
        }
        const [machineResult, alarmResult] = await Promise.all([
          listActiveMachines<MachineOption>(supabase, MACHINE_OPTION_COLUMNS),
          supabase.from("alarms").select("*").order("occurred_at", { ascending: false }),
        ]);
        if (machineResult.error) throw machineResult.error;
        if (alarmResult.error) throw alarmResult.error;
        if (active) {
          setMachines(machineResult.data ?? []);
          setAlarms((alarmResult.data ?? []) as Alarm[]);
        }
      } catch (loadError) {
        if (active) setError(messageFromError(loadError));
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [router]);

  const machineName = (id: string) => machines.find((machine) => machine.id === id)?.machine_id ?? "Unknown machine";
  const filtered = alarms.filter((alarm) => {
    const text = `${alarm.alarm_code} ${alarm.description} ${machineName(alarm.machine_id)}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (filter === "all" || alarm.status === filter);
  });

  function openCreate() {
    setError("");
    setEditing(null);
    setOpen(true);
  }

  function openEdit(alarm: Alarm) {
    setError("");
    setEditing(alarm);
    setOpen(true);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      const values = new FormData(event.currentTarget);
      const isUpdate = Boolean(editing?.id);
      const status = isUpdate ? String(values.get("status")) : "open";
      if (!isOneOf(status, ALARM_STATUSES)) throw new Error("Invalid alarm status.");
      const cause = optionalText(values.get("cause"));
      const actionTaken = optionalText(values.get("action_taken"));
      if (status === "closed" && (!cause || !actionTaken)) throw new Error("Cause and Action Taken are required before closing an alarm.");

      const resolution = {
        cause,
        action_taken: actionTaken,
        status,
      };
      const payload = isUpdate && !canManageDetails
        ? resolution
        : {
            ...resolution,
            machine_id: requiredText(values.get("machine_id"), "Machine", 80),
            alarm_code: requiredText(values.get("alarm_code"), "Alarm code", 80),
            description: requiredText(values.get("description"), "Description", 1000),
            occurred_at: requiredDate(values.get("occurred_at"), "Occurred at"),
          };

      const supabase = createClient();
      const result = editing?.id
        ? await supabase.from("alarms").update(payload).eq("id", editing.id).select().single()
        : await supabase.from("alarms").insert({ ...payload, status: "open" }).select().single();
      if (result.error) throw result.error;
      if (!result.data) throw new Error("The alarm was not returned by Supabase.");

      const saved = result.data as Alarm;
      setAlarms((current) => editing?.id ? current.map((item) => item.id === editing.id ? saved : item) : [saved, ...current]);
      setOpen(false);
      setEditing(null);
    } catch (submitError) {
      setError(messageFromError(submitError));
    }
  }

  async function changeStatus(alarm: Alarm, status: string) {
    setError("");
    if (!isOneOf(status, ALARM_STATUSES)) return;
    if (status === "closed" && (!alarm.cause || !alarm.action_taken)) {
      setError("This alarm needs Cause and Action Taken. Use Edit to add them before closing.");
      return;
    }
    try {
      const result = await createClient().from("alarms").update({ status }).eq("id", alarm.id).select().single();
      if (result.error) throw result.error;
      if (!result.data) throw new Error("The alarm was not updated. Check your role permission.");
      setAlarms((current) => current.map((item) => item.id === alarm.id ? result.data as Alarm : item));
    } catch (statusError) {
      setError(messageFromError(statusError));
    }
  }

  async function remove(alarm: Alarm) {
    if (!canDelete) {
      setError("Only Admin can delete alarms.");
      return;
    }
    if (!window.confirm(`Delete alarm ${alarm.alarm_code}?`)) return;
    try {
      const result = await createClient().from("alarms").delete().eq("id", alarm.id).select("id");
      if (result.error) throw result.error;
      if (!result.data?.length) throw new Error("The alarm was not deleted. Check Admin permission.");
      setAlarms((current) => current.filter((item) => item.id !== alarm.id));
    } catch (removeError) {
      setError(messageFromError(removeError));
    }
  }

  const formAlarm = editing ?? blankAlarm;

  return (
    <main className={shell}>
      <ModuleHeader role={role} />
      <div className={heading}><div className={headingCopy}><p className={`${eyebrow} ${eyebrowAccent}`}>WORKSPACE / ALARMS</p><h1 className={headingTitle}>Alarm records</h1><p className={headingLead}>Create, investigate and close machine alarms with a complete audit trail.</p></div><button className={`${button} ${buttonPrimary}`} onClick={openCreate} disabled={machines.length === 0}><Plus size={15} />Create alarm</button></div>
      <div className={toolbar}><div className={searchBox}><Search size={16} /><input className={searchInput} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search machine, code or description..." aria-label="Search alarms" /></div><select className={`${select} min-w-[150px] max-[760px]:h-[38px]`} value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter alarm status"><option value="all">All statuses</option><option value="open">Open</option><option value="in_progress">In progress</option><option value="closed">Closed</option></select></div>
      {error && <div className={moduleError} role="alert">{error}</div>}
      {loading ? <div className={moduleEmpty}>Loading alarms...</div> : <div className={tableCard}><div className={`${tableHead} ${alarmColumns}`}><span>Alarm</span><span>Machine</span><span>Occurred</span><span>Status / actions</span></div>{filtered.map((alarm) => <div className={`${tableRow} ${alarmColumns}`} key={alarm.id}><div><strong className={rowStrong}>{alarm.alarm_code}</strong><span className={rowDescription}>{alarm.description}</span>{(alarm.cause || alarm.action_taken) && <span className={rowDescription}>Cause: {alarm.cause || "—"} · Action: {alarm.action_taken || "—"}</span>}</div><span>{machineName(alarm.machine_id)}</span><span>{formatDate(alarm.occurred_at)}</span><span className="flex items-center gap-1"><select className={select} value={alarm.status} onChange={(event) => void changeStatus(alarm, event.target.value)} aria-label={`Status for ${alarm.alarm_code}`}><option value="open">Open</option><option value="in_progress">In progress</option><option value="closed">Closed</option></select><button className={iconButton} onClick={() => openEdit(alarm)} aria-label={`Edit ${alarm.alarm_code}`}><Pencil size={15} /></button>{canDelete && <button className={`${iconButton} hover:!text-danger`} onClick={() => void remove(alarm)} aria-label={`Delete ${alarm.alarm_code}`}><Trash2 size={15} /></button>}</span></div>)}{filtered.length === 0 && <div className={moduleEmpty}>No alarms match your search.</div>}</div>}

      {open && <div className={modalBackdrop}><form className={modalCard} onSubmit={save}><div className={modalHeader}><div><p className={eyebrow}>ALARM RECORD</p><h2 className={modalTitle}>{editing?.id ? "Edit alarm" : "Create alarm"}</h2></div><button type="button" className={iconButton} onClick={() => { setOpen(false); setEditing(null); }} aria-label="Close"><X size={17} /></button></div><div className={formGrid}><label className={modalLabel}>Machine<select className={modalControlRow} name="machine_id" defaultValue={formAlarm.machine_id || machines[0]?.id} disabled={Boolean(editing?.id) && !canManageDetails} required>{machines.map((machine) => <option key={machine.id} value={machine.id}>{machine.machine_id}</option>)}</select></label><label className={modalLabel}>Alarm code<input className={modalControlRow} name="alarm_code" defaultValue={formAlarm.alarm_code} readOnly={Boolean(editing?.id) && !canManageDetails} placeholder="TEMP-HIGH" maxLength={80} required /></label><label className={`${modalLabel} ${formGridFull}`}>Description<textarea className={`${modalControl} ${modalTextarea}`} name="description" defaultValue={formAlarm.description} readOnly={Boolean(editing?.id) && !canManageDetails} placeholder="Describe the alarm" maxLength={1000} required /></label><label className={modalLabel}>Date / time<input className={modalControlRow} name="occurred_at" type="datetime-local" defaultValue={toDateTimeLocal(formAlarm.occurred_at) || toDateTimeLocal(new Date().toISOString())} readOnly={Boolean(editing?.id) && !canManageDetails} required /></label>{editing?.id ? <label className={modalLabel}>Status<select className={modalControlRow} name="status" defaultValue={formAlarm.status}>{ALARM_STATUSES.map((status) => <option value={status} key={status}>{status.replace("_", " ")}</option>)}</select></label> : <input type="hidden" name="status" value="open" />}</div><div className={formGrid}><label className={modalLabel}>Cause<textarea className={`${modalControl} ${modalTextarea}`} name="cause" defaultValue={formAlarm.cause ?? ""} placeholder="Known cause (optional)" maxLength={2000} /></label><label className={modalLabel}>Action taken<textarea className={`${modalControl} ${modalTextarea}`} name="action_taken" defaultValue={formAlarm.action_taken ?? ""} placeholder="Action taken (optional)" maxLength={2000} /></label></div><p className={formHint}>Closed alarms require both Cause and Action Taken.</p><div className={modalActions}><button type="button" className={`${button} ${buttonSecondary}`} onClick={() => { setOpen(false); setEditing(null); }}>Cancel</button><button className={`${button} ${buttonPrimary}`} type="submit">Save alarm</button></div></form></div>}
    </main>
  );
}

export function alarmStatusIsValid(value: string): value is AlarmStatus {
  return isOneOf(value, ALARM_STATUSES);
}
