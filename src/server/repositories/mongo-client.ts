import "server-only";
import { MongoClient, type Db } from "mongodb";

/**
 * Serverless-safe MongoDB connection.
 *
 * Vercel functions can be invoked concurrently across many isolated
 * instances, and each hot instance reuses its module scope across
 * invocations — so we cache the connection promise on `globalThis` (survives
 * hot reloads in dev, survives repeat invocations on a warm serverless
 * instance) instead of opening a new connection per request.
 */

const uri = process.env.MONGODB_URI;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function createClientPromise(): Promise<MongoClient> {
  if (!uri) {
    throw new Error(
      "MONGODB_URI is not set. Required when NEXT_PUBLIC_DATA_MODE=mongodb — see .env.example.",
    );
  }
  const client = new MongoClient(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 10_000,
  });
  return client.connect();
}

export function getMongoClientPromise(): Promise<MongoClient> {
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = createClientPromise();
  }
  return global._mongoClientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await getMongoClientPromise();
  return client.db("clinicore");
}
