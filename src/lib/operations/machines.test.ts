import { strict as assert } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";

import { MACHINE_LIST_COLUMNS, listActiveMachines, resetArchiveColumnSupport } from "./machines.ts";

type Row = { id: string; machine_id: string };
type Canned = { rows: Row[]; error: unknown };

/**
 * A stand-in for the Supabase client that only understands the chain
 * listActiveMachines uses, so the fallback path can be exercised without a
 * database. The first select() of a read is the filtered attempt; the second is
 * the unfiltered retry, and `calls` records what actually went out.
 */
function fakeClient(filtered: Canned, unfiltered: Canned) {
  const calls: string[] = [];
  let attempt = 0;

  const client = {
    from(table: string) {
      calls.push(`from(${table})`);
      return {
        select(columns: string) {
          calls.push(`select(${columns})`);
          const result = attempt++ === 0 ? filtered : unfiltered;
          const builder = {
            eq(column: string) {
              calls.push(`eq(${column})`);
              return builder;
            },
            order() {
              return builder;
            },
            then(resolve: (value: { data: Row[] | null; error: unknown }) => unknown) {
              return resolve({ data: result.error ? null : result.rows, error: result.error });
            },
          };
          return builder;
        },
      };
    },
  };

  return { client: client as unknown as SupabaseClient, calls };
}

const ok: Canned = { rows: [{ id: "1", machine_id: "CNC-04" }], error: null };
const missingColumn: Canned = { rows: [], error: { code: "42703", message: 'column "is_archived" does not exist' } };
const otherError: Canned = { rows: [], error: { code: "42501", message: "permission denied" } };
const empty: Canned = { rows: [], error: null };

const selects = (calls: string[]) => calls.filter((call) => call.startsWith("select(")).length;

describe("listActiveMachines", () => {
  beforeEach(() => {
    // The capability answer is cached on the module, so each test starts clean.
    resetArchiveColumnSupport();
  });

  it("filters out archived rows when the column exists", async () => {
    const { client } = fakeClient(ok, empty);
    const result = await listActiveMachines<Row>(client, MACHINE_LIST_COLUMNS);
    assert.equal(result.error, null);
    assert.deepEqual(result.data, ok.rows);
  });

  it("falls back to an unfiltered read when is_archived is missing", async () => {
    const { client } = fakeClient(missingColumn, ok);
    const result = await listActiveMachines<Row>(client, MACHINE_LIST_COLUMNS);
    assert.equal(result.error, null);
    assert.deepEqual(result.data, ok.rows, "should return the unfiltered rows");
  });

  it("does not retry when the failure is a real permission problem", async () => {
    const { client, calls } = fakeClient(otherError, ok);
    const result = await listActiveMachines<Row>(client, MACHINE_LIST_COLUMNS);
    assert.equal(result.error, otherError.error, "the permission error must be reported, not swallowed");
    assert.equal(selects(calls), 1, "a permission failure must not trigger the fallback query");
  });

  it("remembers the answer, so later reads skip the failing attempt", async () => {
    const { client, calls } = fakeClient(missingColumn, ok);
    await listActiveMachines<Row>(client, MACHINE_LIST_COLUMNS);
    const afterFirst = selects(calls);
    await listActiveMachines<Row>(client, MACHINE_LIST_COLUMNS);
    assert.equal(selects(calls), afterFirst + 1, "the cached capability check should avoid the retry");
  });
});
