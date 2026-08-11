import { getCachedBranch } from "@/server/cache/reference-data";

export interface ClinicHeader {
  name: string;
  address: string;
  phone: string;
  gst?: string;
}

/** Build a printable clinic header from a branch id. */
export async function clinicFromBranch(branchId: string): Promise<ClinicHeader> {
  const branch = await getCachedBranch(branchId);
  return {
    name: branch?.name ?? "Clinic",
    address: [branch?.city, "India"].filter(Boolean).join(", "),
    phone: branch?.phone ?? "",
    gst: branch?.gstNumber ?? undefined,
  };
}
