import { randomUUID } from "node:crypto";

/**
 * Collision-free record ids.
 *
 * The previous generators were `Date.now()` (two records created in the same
 * millisecond collide — routine when reception batch-enters or a request is
 * retried) and module-level counters like `au_${seq++}` (each serverless
 * instance starts its own counter at 100, so concurrent instances hand out
 * identical ids). With no unique index, MongoDB accepted the duplicates
 * silently and `get(id)` then returned whichever row it found first.
 *
 * A random UUID suffix removes both failure modes. Nothing parses these ids,
 * so the shape is free to change.
 */
export function newId(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}
