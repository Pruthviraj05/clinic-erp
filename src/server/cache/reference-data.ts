import "server-only";
import { unstable_cache } from "next/cache";
import { db } from "@/server/repositories";
import type { Branch, Doctor } from "@/types/domain";
import type { MasterRow } from "@/server/demo/extra";

/**
 * Branches, doctors and the "masters" reference lists (departments,
 * specializations, suppliers, ...) are read on nearly every authenticated
 * page — appointments, billing, calendars, reports, the session lookup
 * itself — but only change a handful of times a year, when staff is added
 * or a master row is edited. Wrapping them in `unstable_cache` cuts a full
 * collection round trip out of almost every page load.
 *
 * The 5-minute TTL is a safety net, not the primary invalidation path —
 * every write action that touches these collections calls `revalidateTag()`
 * for the matching tag (see `staff.actions.ts` and `masters.actions.ts`), so
 * in normal use a change is visible immediately, not after up to 5 minutes.
 */
const REVALIDATE_SECONDS = 300;

export const getCachedBranches = unstable_cache(
  async (): Promise<Branch[]> => db.branches.list(),
  ["ref-branches-list"],
  { tags: ["branches"], revalidate: REVALIDATE_SECONDS },
);

export const getCachedBranch = unstable_cache(
  async (id: string): Promise<Branch | null> => db.branches.get(id),
  ["ref-branch-by-id"],
  { tags: ["branches"], revalidate: REVALIDATE_SECONDS },
);

export const getCachedDoctors = unstable_cache(
  async (): Promise<Doctor[]> => db.doctors.list(),
  ["ref-doctors-list"],
  { tags: ["doctors"], revalidate: REVALIDATE_SECONDS },
);

export const getCachedDoctor = unstable_cache(
  async (id: string): Promise<Doctor | null> => db.doctors.get(id),
  ["ref-doctor-by-id"],
  { tags: ["doctors"], revalidate: REVALIDATE_SECONDS },
);

/** The editable "masters" groups — see EDITABLE_GROUPS in masters.actions.ts. */
const MASTER_GROUP_KEYS = [
  "departments",
  "specializations",
  "medicine-categories",
  "lab-tests",
  "investigations",
  "suppliers",
  "tax-rates",
] as const;

// One wrapped function per group, created once at module load — not per
// request — so each group gets its own stable cache key. Invalidation is
// shared across all groups via a single "masters" tag: master-data writes
// are rare enough that the coarser invalidation isn't worth the extra
// bookkeeping of a tag per group.
const cachedMasterListFns: Partial<Record<string, () => Promise<MasterRow[]>>> = {};
for (const group of MASTER_GROUP_KEYS) {
  cachedMasterListFns[group] = unstable_cache(
    async (): Promise<MasterRow[]> => (await db.masters[group]?.list()) ?? [],
    [`ref-masters-${group}`],
    { tags: ["masters"], revalidate: REVALIDATE_SECONDS },
  );
}

/** Full (unfiltered) list for a masters group — filter the result, don't pass a predicate in. */
export async function getCachedMasters(group: string): Promise<MasterRow[]> {
  const fn = cachedMasterListFns[group];
  return fn ? fn() : ((await db.masters[group]?.list()) ?? []);
}
