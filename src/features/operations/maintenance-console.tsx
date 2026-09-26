"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { isOneOf, requiredDate, requiredText, toDateTimeLocal } from "@/lib/operations/validation";
import { MAINTENANCE_STATUSES, type MaintenanceRecord, type MaintenanceStatus } from "@/lib/operations/types";
import { ModuleHeader } from "@/features/operations/module-header";
import {
  button,
  buttonPrimary,
  buttonSecondary,
  eyebrow,
  eyebrowAccent,
  formGrid,
  formGridFull,
  heading,
  headingCopy,
  headingLead,
  headingTitle,
  iconButton,
  modalActions,
  modalBackdrop,
  modalCard,
  modalControl,
  modalControlRow,
  modalHeader,
  modalLabel,
  modalTextarea,
  modalTitle,
  moduleEmpty,
  moduleError,
  rowStrong,
  rowSub,
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
type ProfileOption = { id: string; display_name: string; role: string };

const blankRecord: MaintenanceRecord = { id: "", machine_id: "", technician_id: "", problem: "", action_taken: "", started_at: "", status: "in_progress" };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function messageFromError(error: unknown) {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
  return "Unable to save maintenance data.";
}

export function MaintenanceConsole() {
  const router = useRouter();
  const { user, role } = useCurrentUser();
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [machines, setMachines] = useState<MachineOption[]>([]);
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState<MaintenanceRecord | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const canDelete = role === "admin";

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const supabase = createClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) {
          router.replace("/login");
          return;
        }
        const [machineResult, recordResult, profileResult] = await Promise.all([
          listActiveMachines<MachineOption>(supabase, MACHINE_OPTION_COLUMNS),
          supabase.from("maintenance_records").select("*").order("started_at", { ascending: false }),
          supabase.from("profiles").select("id, display_name, role").order("display_name"),
        ]);
        if (machineResult.error) throw machineResult.error;
        if (recordResult.error) throw recordResult.error;
        if (profileResult.error) throw profileResult.error;
        if (active) {
          setMachines(machineResult.data ?? []);
          setRecords((recordResult.data ?? []) as MaintenanceRecord[]);
          setProfiles((profileResult.data ?? []) as ProfileOption[]);
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
  const technicianName = (id: string) => profiles.find((profile) => profile.id === id)?.display_name ?? "Unknown technician";
  const canEditRecord = (record: MaintenanceRecord) => role === "admin" || (role === "technician" && record.technician_id === user?.id);
  const filtered = records.filter((record) => {
    const text = `${record.problem} ${record.action_taken} ${machineName(record.machine_id)} ${technicianName(record.technician_id)} ${record.technician_id}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (filter === "all" || record.status === filter);
  });

  function openCreate() {
    setError("");
    setEditing(null);
    setOpen(true);
  }

  function openEdit(record: MaintenanceRecord) {
    if (!canEditRecord(record)) {
      setError("Technicians can edit only their assigned maintenance records.");
      return;
    }
    setError("");
    setEditing(record);
    setOpen(true);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      const values = new FormData(event.currentTarget);
      const isUpdate = Boolean(editing?.id);
      const status = String(values.get("status") || "in_progress");
      if (!isOneOf(status, MAINTENANCE_STATUSES)) throw new Error("Invalid maintenance status.");
      const technicianId = role === "technician" ? user?.id : requiredText(values.get("technician_id"), "Technician", 80).toLowerCase();
      if (!technicianId || !uuidPattern.test(technicianId)) throw new Error("Technician must be a valid profile UUID.");
      if (!profiles.some((profile) => profile.id === technicianId)) throw new Error("Select a technician from the profile list.");

      const resolution = {
        problem: requiredText(values.get("problem"), "Problem", 2000),
        action_taken: requiredText(values.get("action_taken"), "Action taken", 2000),
        started_at: requiredDate(values.get("started_at"), "Started at"),
        status,
      };
      const payload = isUpdate && role !== "admin"
        ? resolution
        : { ...resolution, machine_id: requiredText(values.get("machine_id"), "Machine", 80), technician_id: technicianId };
      if (isUpdate && role !== "admin" && editing && !canEditRecord(editing)) throw new Error("You can edit only your assigned maintenance record.");

      const supabase = createClient();
      const result = editing?.id
        ? await supabase.from("maintenance_records").update(payload).eq("id", editing.id).select().single()
        : await supabase.from("maintenance_records").insert(payload).select().single();
      if (result.error) throw result.error;
      if (!result.data) throw new Error("The maintenance record was not returned by Supabase.");

      const saved = result.data as MaintenanceRecord;
      setRecords((current) => editing?.id ? current.map((item) => item.id === editing.id ? saved : item) : [saved, ...current]);
      setOpen(false);
      setEditing(null);
    } catch (submitError) {
      setError(messageFromError(submitError));
    }
  }

  async function changeStatus(record: MaintenanceRecord, status: string) {
    setError("");
    if (!isOneOf(status, MAINTENANCE_STATUSES)) return;
    if (!canEditRecord(record)) {
      setError("Technicians can update only their assigned maintenance records.");
      return;
    }
    try {
      const result = await createClient().from("maintenance_records").update({ status }).eq("id", record.id).select().single();
      if (result.error) throw result.error;
      if (!result.data) throw new Error("The maintenance record was not updated. Check your role permission.");
      setRecords((current) => current.map((item) => item.id === record.id ? result.data as MaintenanceRecord : item));
    } catch (statusError) {
      setError(messageFromError(statusError));
    }
  }

  async function remove(record: MaintenanceRecord) {
    if (!canDelete) {
      setError("Only Admin can delete maintenance records.");
      return;
    }
    if (!window.confirm("Delete this maintenance record?")) return;
    try {
      const result = await createClient().from("maintenance_records").delete().eq("id", record.id).select("id");
      if (result.error) throw result.error;
      if (!result.data?.length) throw new Error("The maintenance record was not deleted. Check Admin permission.");
      setRecords((current) => current.filter((item) => item.id !== record.id));
    } catch (removeError) {
      setError(messageFromError(removeError));
    }
  }

  const formRecord = editing ?? blankRecord;
  const defaultTechnician = role === "technician" ? user?.id ?? "" : formRecord.technician_id || profiles.find((profile) => profile.role === "technician")?.id || profiles[0]?.id || "";

  return (
    <main className={shell}>
      <ModuleHeader role={role} />
      <div className={heading}><div className={headingCopy}><p className={`${eyebrow} ${eyebrowAccent}`}>WORKSPACE / MAINTENANCE</p><h1 className={headingTitle}>Maintenance records</h1><p className={headingLead}>Capture problems, actions and technician work history.</p></div><button className={`${button} ${buttonPrimary}`} onClick={openCreate} disabled={machines.length === 0 || profiles.length === 0}><Plus size={15} />Log maintenance</button></div>
      <div className={toolbar}><div className={searchBox}><Search size={16} /><input className={searchInput} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search machine, technician or work description..." aria-label="Search maintenance" /></div><select className={`${select} min-w-[150px] max-[760px]:h-[38px]`} value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter maintenance status"><option value="all">All statuses</option><option value="in_progress">In progress</option><option value="completed">Completed</option></select></div>
      {error && <div className={moduleError} role="alert">{error}</div>}
      {loading ? <div className={moduleEmpty}>Loading maintenance records...</div> : <div className={tableCard}><div className={tableHead}><span>Machine</span><span>Problem</span><span>Action taken</span><span>Status / actions</span></div>{filtered.map((record) => <div className={tableRow} key={record.id}><strong className={rowStrong}>{machineName(record.machine_id)}<small className={rowSub}>{technicianName(record.technician_id)}</small></strong><span>{record.problem}</span><span>{record.action_taken}</span><span className="flex items-center gap-1"><select className={select} value={record.status} disabled={!canEditRecord(record)} onChange={(event) => void changeStatus(record, event.target.value)} aria-label={`Status for ${machineName(record.machine_id)}`}><option value="in_progress">In progress</option><option value="completed">Completed</option></select>{canEditRecord(record) && <button className={iconButton} onClick={() => openEdit(record)} aria-label="Edit maintenance record"><Pencil size={15} /></button>}{canDelete && <button className={`${iconButton} hover:!text-danger`} onClick={() => void remove(record)} aria-label="Delete maintenance record"><Trash2 size={15} /></button>}</span></div>)}{filtered.length === 0 && <div className={moduleEmpty}>No maintenance records match your search.</div>}</div>}

      {open && <div className={modalBackdrop}><form className={modalCard} onSubmit={save}><div className={modalHeader}><div><p className={eyebrow}>MAINTENANCE RECORD</p><h2 className={modalTitle}>{editing?.id ? "Edit maintenance" : "Log maintenance"}</h2></div><button type="button" className={iconButton} onClick={() => { setOpen(false); setEditing(null); }} aria-label="Close"><X size={17} /></button></div><div className={formGrid}><label className={modalLabel}>Machine<select className={modalControlRow} name="machine_id" defaultValue={formRecord.machine_id || machines[0]?.id} disabled={role !== "admin" && Boolean(editing?.id)} required>{machines.map((machine) => <option key={machine.id} value={machine.id}>{machine.machine_id}</option>)}</select></label><label className={modalLabel}>Technician{role === "admin" ? <select className={modalControlRow} name="technician_id" defaultValue={defaultTechnician} required>{profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.display_name} · {profile.role}</option>)}</select> : <input className={modalControlRow} name="technician_id" defaultValue={defaultTechnician} readOnly required />}</label><label className={`${modalLabel} ${formGridFull}`}>Problem<textarea className={`${modalControl} ${modalTextarea}`} name="problem" defaultValue={formRecord.problem} placeholder="What needs repair?" maxLength={2000} required /></label><label className={`${modalLabel} ${formGridFull}`}>Action taken<textarea className={`${modalControl} ${modalTextarea}`} name="action_taken" defaultValue={formRecord.action_taken} placeholder="What was done?" maxLength={2000} required /></label><label className={modalLabel}>Started at<input className={modalControlRow} name="started_at" type="datetime-local" defaultValue={toDateTimeLocal(formRecord.started_at) || toDateTimeLocal(new Date().toISOString())} required /></label><label className={modalLabel}>Status<select className={modalControlRow} name="status" defaultValue={formRecord.status}>{MAINTENANCE_STATUSES.map((status) => <option value={status} key={status}>{status.replace("_", " ")}</option>)}</select></label></div><div className={modalActions}><button type="button" className={`${button} ${buttonSecondary}`} onClick={() => { setOpen(false); setEditing(null); }}>Cancel</button><button className={`${button} ${buttonPrimary}`} type="submit">Save maintenance</button></div></form></div>}
    </main>
  );
}

export function maintenanceStatusIsValid(value: string): value is MaintenanceStatus {
  return isOneOf(value, MAINTENANCE_STATUSES);
}
