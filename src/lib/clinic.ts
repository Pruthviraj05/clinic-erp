import { branches } from "@/server/demo/data";

export interface ClinicHeader {
  name: string;
  address: string;
  phone: string;
  gst?: string;
}

/** Build a printable clinic header from a branch id. */
export function clinicFromBranch(branchId: string): ClinicHeader {
  const branch = branches.find((b) => b.id === branchId);
  return {
    name: branch?.name ?? "Clinicore",
    address: [branch?.city, "India"].filter(Boolean).join(", "),
    phone: branch?.phone ?? "",
    gst: branch?.gstNumber ?? undefined,
  };
}
