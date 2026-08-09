import "server-only";
import { appConfig } from "@/config/app.config";
import { demoAdapter } from "./demo-adapter";
import { mongodbAdapter } from "./mongodb-adapter";
import type { StoragePort } from "./storage-port";

/**
 * The active storage adapter, selected by `appConfig.dataMode`.
 * Every server action and service reads through this `db` object — never
 * the raw demo arrays — so the backend is swappable without touching UI
 * or business logic. The MongoDB driver only actually connects if a call
 * reaches it (i.e. only in "mongodb" mode) — demo mode never touches it.
 */
export const db: StoragePort = appConfig.dataMode === "mongodb" ? mongodbAdapter : demoAdapter;

export type { StoragePort, EntityStore, SingletonStore } from "./storage-port";
