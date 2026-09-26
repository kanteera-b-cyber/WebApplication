import type { SupabaseClient } from "@supabase/supabase-js";

export const MACHINE_LIST_COLUMNS = "id, machine_id, machine_name, machine_type, location, status, updated_at";
export const MACHINE_OPTION_COLUMNS = "id, machine_id";

type QueryError = { code?: string; message?: string } | null;

export type MachineQueryResult<T> = { data: T[] | null; error: QueryError };

/**
 * Reads the machines table, hiding archived rows.
 *
 * `is_archived` arrives with migration 004. Until that migration has been applied
 * the column does not exist and PostgREST rejects the whole request, so we fall
 * back to an unfiltered read and remember the answer for the rest of the session.
 * This keeps every machine module usable before and after the migration is run.
 */
let archiveColumnAvailable: boolean | null = null;

function isMissingArchiveColumn(error: QueryError): boolean {
  if (!error) return false;
  return error.code === "42703" || /is_archived/i.test(error.message ?? "");
}

/** Test seam: forget the cached capability check. */
export function resetArchiveColumnSupport(): void {
  archiveColumnAvailable = null;
}

export async function listActiveMachines<T>(
  supabase: SupabaseClient,
  columns: string,
): Promise<MachineQueryResult<T>> {
  if (archiveColumnAvailable !== false) {
    const filtered = await supabase.from("machines").select(columns).eq("is_archived", false).order("machine_id");
    if (!filtered.error) {
      archiveColumnAvailable = true;
      return { data: (filtered.data ?? []) as T[], error: null };
    }
    if (!isMissingArchiveColumn(filtered.error)) {
      return { data: null, error: filtered.error };
    }
    archiveColumnAvailable = false;
  }
  const unfiltered = await supabase.from("machines").select(columns).order("machine_id");
  return { data: (unfiltered.data ?? []) as T[], error: unfiltered.error };
}

/**
 * Toggles the archive flag on a machine and returns the updated row.
 * Only functional once migration 004 has been applied.
 */
export async function setMachineArchived(supabase: SupabaseClient, machineId: string, isArchived: boolean) {
  return supabase
    .from("machines")
    .update({ is_archived: isArchived })
    .eq("id", machineId)
    .select()
    .single();
}
