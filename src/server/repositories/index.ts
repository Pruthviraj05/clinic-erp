import "server-only";
import { demoAdapter } from "./demo-adapter";
import type { StoragePort } from "./storage-port";

/**
 * The active storage adapter.
 *
 * Demo mode ships an in-memory dataset. To go live on MongoDB, implement
 * `StoragePort` in a `mongodb-adapter.ts` (see README.md for the collection
 * mapping) and export it here based on `appConfig.dataMode` — every server
 * action and service already reads through this `db` object.
 */
export const db: StoragePort = demoAdapter;

export type { StoragePort, EntityStore } from "./storage-port";
