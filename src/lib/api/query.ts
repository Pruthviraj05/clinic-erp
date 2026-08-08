import { z } from "zod";

/**
 * Shared list-query contract for every collection endpoint:
 * pagination + search + sort. Individual routes extend it with their filters.
 */
export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  sortBy: z.string().optional(),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});

export type ListQuery = z.infer<typeof listQuerySchema>;

export function parseListQuery(searchParams: URLSearchParams): ListQuery {
  return listQuerySchema.parse(Object.fromEntries(searchParams.entries()));
}

/** Prisma skip/take from a validated list query. */
export function toPrismaPage(q: Pick<ListQuery, "page" | "pageSize">) {
  return { skip: (q.page - 1) * q.pageSize, take: q.pageSize };
}
