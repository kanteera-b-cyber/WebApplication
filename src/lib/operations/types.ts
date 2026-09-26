export const MACHINE_STATUSES = ["running", "stop", "alarm", "maintenance"] as const;
export type MachineStatus = (typeof MACHINE_STATUSES)[number];

export const ALARM_STATUSES = ["open", "in_progress", "closed"] as const;
export type AlarmStatus = (typeof ALARM_STATUSES)[number];

export const MAINTENANCE_STATUSES = ["in_progress", "completed"] as const;
export type MaintenanceStatus = (typeof MAINTENANCE_STATUSES)[number];

export type AppRole = "admin" | "technician";

export type Machine = {
  id: string;
  machine_id: string;
  machine_name: string;
  machine_type: string;
  location: string;
  status: MachineStatus | string;
  is_archived?: boolean;
  archived_at?: string | null;
  archived_by?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type Alarm = {
  id: string;
  machine_id: string;
  alarm_code: string;
  description: string;
  occurred_at: string;
  cause: string | null;
  action_taken: string | null;
  status: AlarmStatus | string;
  created_by?: string | null;
  closed_by?: string | null;
  closed_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type MaintenanceRecord = {
  id: string;
  machine_id: string;
  technician_id: string;
  problem: string;
  action_taken: string;
  started_at: string;
  completed_at?: string | null;
  status: MaintenanceStatus | string;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
};
