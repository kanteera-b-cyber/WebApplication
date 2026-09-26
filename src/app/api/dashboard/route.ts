import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Alarm, Machine, MaintenanceRecord } from "@/lib/operations/types";
import { listActiveMachines, MACHINE_LIST_COLUMNS } from "@/lib/operations/machines";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [machineResult, alarmResult, maintenanceResult] = await Promise.all([
      listActiveMachines<Machine>(supabase, MACHINE_LIST_COLUMNS),
      supabase.from("alarms").select("id, machine_id, alarm_code, description, occurred_at, cause, action_taken, status, closed_at, updated_at").order("occurred_at", { ascending: false }),
      supabase.from("maintenance_records").select("id, machine_id, technician_id, problem, action_taken, started_at, completed_at, status, updated_at").order("started_at", { ascending: false }),
    ]);

    if (machineResult.error || alarmResult.error || maintenanceResult.error) {
      return NextResponse.json({ error: "Unable to load dashboard data." }, { status: 503 });
    }

    const machineRows = machineResult.data ?? [];
    const alarmRows = (alarmResult.data ?? []) as Alarm[];
    const maintenanceRows = (maintenanceResult.data ?? []) as MaintenanceRecord[];

    return NextResponse.json({
      totalMachines: machineRows.length,
      running: machineRows.filter((row) => row.status === "running").length,
      stop: machineRows.filter((row) => row.status === "stop").length,
      alarm: machineRows.filter((row) => row.status === "alarm").length,
      maintenance: machineRows.filter((row) => row.status === "maintenance").length,
      activeAlarms: alarmRows.filter((row) => row.status !== "closed").length,
      maintenanceRecords: maintenanceRows.length,
      completedMaintenance: maintenanceRows.filter((row) => row.status === "completed").length,
      machines: machineRows,
      alarms: alarmRows,
      maintenanceRows,
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Dashboard is unavailable." }, { status: 503 });
  }
}
