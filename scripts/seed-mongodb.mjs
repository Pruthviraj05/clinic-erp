// One-time (idempotent) seed for a fresh MongoDB Atlas database backing this
// app in "mongodb" data mode. Mirrors src/server/demo/data.ts, extra.ts,
// template-store.ts and users-store.ts — the in-memory demo seed data that
// the demo adapter gets for free, but MongoDB starts empty for.
//
// Usage:
//   node --env-file=.env.local scripts/seed-mongodb.mjs
//
// Safe to re-run: every write is an upsert keyed by `id` (or `id`+`group`
// for masters), so re-running just confirms the same state.
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is not set. Run with: node --env-file=.env.local scripts/seed-mongodb.mjs");
  process.exit(1);
}

const client = new MongoClient(uri);

async function upsertMany(col, rows) {
  for (const row of rows) {
    await col.updateOne({ id: row.id }, { $set: row }, { upsert: true });
  }
}

async function upsertMasters(col, group, rows) {
  for (const row of rows) {
    await col.updateOne({ id: row.id, group }, { $set: { ...row, group } }, { upsert: true });
  }
}

async function main() {
  await client.connect();
  const db = client.db("clinicore");

  // -------------------------------------------------------------------
  // Admin account — admin@gmail.com / Test@12345
  // -------------------------------------------------------------------
  // All four accounts share the password `Test@12345` (one precomputed hash).
  // TEST ACCOUNTS — the password is in the repo, so deactivate or re-password
  // the doctor/reception/patient logins before real go-live.
  const SEED_PASSWORD_HASH =
    "scrypt$7932b2e116b076a54f452848eaabd585$06000d0d587e8c9f8e4837807bfb98b9771cac636d018468d93212910f423e64";
  const seedCreatedAt = new Date(2026, 0, 1).toISOString();

  await upsertMany(db.collection("users"), [
    {
      id: "usr_admin",
      fullName: "Admin",
      email: "admin@gmail.com",
      role: "ADMIN",
      passwordHash: SEED_PASSWORD_HASH,
      isActive: true,
      createdAt: seedCreatedAt,
      // Forced change on first sign-in — this password is public.
      mustChangePassword: true,
      sessionVersion: 1,
    },
    {
      id: "usr_doc_bhosikar",
      fullName: "Dr. Abhijeet Bhosikar",
      email: "doctor@gmail.com",
      role: "DOCTOR",
      passwordHash: SEED_PASSWORD_HASH,
      linkId: "doc_bhosikar",
      isActive: true,
      createdAt: seedCreatedAt,
      mustChangePassword: false,
      sessionVersion: 1,
    },
    {
      id: "usr_rec_seed_1",
      fullName: "Priya Kale",
      email: "priya.kale@gmail.com",
      role: "RECEPTIONIST",
      passwordHash: SEED_PASSWORD_HASH,
      linkId: "rec_seed_1",
      branchId: "br_ravet",
      isActive: true,
      createdAt: seedCreatedAt,
      mustChangePassword: false,
      sessionVersion: 1,
    },
    {
      id: "usr_pat_seed_1",
      fullName: "Sunita Deshmukh",
      email: "sunita.deshmukh@example.com",
      role: "PATIENT",
      passwordHash: SEED_PASSWORD_HASH,
      linkId: "pat_seed_1",
      isActive: true,
      createdAt: seedCreatedAt,
      mustChangePassword: false,
      sessionVersion: 1,
    },
  ]);
  console.log("Seeded: users (admin / doctor / reception / patient — all Test@12345)");

  // -------------------------------------------------------------------
  // Branch + doctor — Dr. Bhosikar's Rheumatology Clinic
  // -------------------------------------------------------------------
  await upsertMany(db.collection("branches"), [
    {
      id: "br_ravet",
      code: "RVT",
      name: "Dr. Bhosikar's Rheumatology Clinic",
      city: "Ravet, Pune",
      phone: null,
      email: null,
      gstNumber: null,
      isActive: true,
    },
  ]);
  await upsertMany(db.collection("doctors"), [
    {
      id: "doc_bhosikar",
      userId: "usr_doc_bhosikar",
      fullName: "Dr. Abhijeet Bhosikar",
      email: "doctor@gmail.com",
      specialization: "Rheumatology",
      department: "Rheumatology — Joint & Back Pain",
      registrationNo: null,
      qualifications: "MBBS, MD (Rheumatology)",
      consultationFee: 0,
      branchIds: ["br_ravet"],
      isActive: true,
    },
  ]);
  console.log("Seeded: branches, doctors (br_ravet, doc_bhosikar)");

  // -------------------------------------------------------------------
  // Sample patients — 3 fake patients with a plausible rheumatology
  // history (past + today's appointments, a prescription, an invoice),
  // for walkthroughs/training/help. Mirrors src/server/demo/data.ts.
  // -------------------------------------------------------------------
  function atToday(hour, minute = 0) {
    const d = new Date();
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
  }
  function daysFromNow(days, hour = 10, minute = 0) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
  }
  function yearsAgo(years) {
    const d = new Date();
    d.setFullYear(d.getFullYear() - years);
    return d.toISOString();
  }
  const CLINIC_NAME = "Dr. Bhosikar's Rheumatology Clinic";
  const DOCTOR_NAME = "Dr. Abhijeet Bhosikar";

  await upsertMany(db.collection("patients"), [
    {
      id: "pat_seed_1",
      mrn: "MRN-100234",
      firstName: "Sunita",
      lastName: "Deshmukh",
      fullName: "Sunita Deshmukh",
      gender: "FEMALE",
      dateOfBirth: yearsAgo(52),
      bloodGroup: "B+",
      phone: "+91 98230 11223",
      email: "sunita.deshmukh@example.com",
      city: "Pune",
      allergies: "None known",
      chronicDiseases: "Rheumatoid arthritis (diagnosed 2021)",
      createdAt: daysFromNow(-240),
      lastVisitAt: daysFromNow(-30),
      isActive: true,
    },
    {
      id: "pat_seed_2",
      mrn: "MRN-100235",
      firstName: "Ramesh",
      lastName: "Kulkarni",
      fullName: "Ramesh Kulkarni",
      gender: "MALE",
      dateOfBirth: yearsAgo(45),
      bloodGroup: "O+",
      phone: "+91 98220 44556",
      email: "ramesh.kulkarni@example.com",
      city: "Pune",
      allergies: "None known",
      chronicDiseases: "Recurrent gout",
      createdAt: daysFromNow(-95),
      lastVisitAt: daysFromNow(-10),
      isActive: true,
    },
    {
      id: "pat_seed_3",
      mrn: "MRN-100236",
      firstName: "Anjali",
      lastName: "Joshi",
      fullName: "Anjali Joshi",
      gender: "FEMALE",
      dateOfBirth: yearsAgo(38),
      bloodGroup: "A+",
      phone: "+91 98901 77889",
      email: "anjali.joshi@example.com",
      city: "Pimpri-Chinchwad",
      allergies: "Sulfa drugs",
      chronicDiseases: null,
      createdAt: daysFromNow(-45),
      lastVisitAt: daysFromNow(-45),
      isActive: true,
    },
  ]);

  await upsertMany(db.collection("appointments"), [
    {
      id: "apt_seed_1",
      branchId: "br_ravet",
      branchName: CLINIC_NAME,
      patientId: "pat_seed_1",
      patientName: "Sunita Deshmukh",
      patientMrn: "MRN-100234",
      doctorId: "doc_bhosikar",
      doctorName: DOCTOR_NAME,
      type: "FOLLOW_UP",
      status: "COMPLETED",
      scheduledStart: daysFromNow(-30, 11, 0),
      scheduledEnd: daysFromNow(-30, 11, 20),
      tokenNumber: 4,
      reason: "RA follow-up — joint pain review",
      paymentStatus: "PAID",
    },
    {
      id: "apt_seed_2",
      branchId: "br_ravet",
      branchName: CLINIC_NAME,
      patientId: "pat_seed_1",
      patientName: "Sunita Deshmukh",
      patientMrn: "MRN-100234",
      doctorId: "doc_bhosikar",
      doctorName: DOCTOR_NAME,
      type: "FOLLOW_UP",
      status: "CONFIRMED",
      scheduledStart: atToday(11, 0),
      scheduledEnd: atToday(11, 20),
      tokenNumber: 1,
      reason: "RA follow-up — methotrexate response check",
      paymentStatus: "UNPAID",
    },
    {
      id: "apt_seed_3",
      branchId: "br_ravet",
      branchName: CLINIC_NAME,
      patientId: "pat_seed_2",
      patientName: "Ramesh Kulkarni",
      patientMrn: "MRN-100235",
      doctorId: "doc_bhosikar",
      doctorName: DOCTOR_NAME,
      type: "WALK_IN",
      status: "COMPLETED",
      scheduledStart: daysFromNow(-10, 16, 30),
      scheduledEnd: daysFromNow(-10, 16, 50),
      tokenNumber: 7,
      reason: "Acute gout attack — right great toe",
      paymentStatus: "PAID",
    },
    {
      id: "apt_seed_4",
      branchId: "br_ravet",
      branchName: CLINIC_NAME,
      patientId: "pat_seed_3",
      patientName: "Anjali Joshi",
      patientMrn: "MRN-100236",
      doctorId: "doc_bhosikar",
      doctorName: DOCTOR_NAME,
      type: "SCHEDULED",
      status: "COMPLETED",
      scheduledStart: daysFromNow(-45, 10, 0),
      scheduledEnd: daysFromNow(-45, 10, 20),
      tokenNumber: 2,
      reason: "Chronic low back pain — initial consult",
      paymentStatus: "PAID",
    },
    {
      id: "apt_seed_5",
      branchId: "br_ravet",
      branchName: CLINIC_NAME,
      patientId: "pat_seed_3",
      patientName: "Anjali Joshi",
      patientMrn: "MRN-100236",
      doctorId: "doc_bhosikar",
      doctorName: DOCTOR_NAME,
      type: "SCHEDULED",
      status: "SCHEDULED",
      scheduledStart: atToday(15, 30),
      scheduledEnd: atToday(15, 50),
      tokenNumber: 2,
      reason: "Low back pain — review after exercise plan",
      paymentStatus: "UNPAID",
    },
  ]);

  await upsertMany(db.collection("prescriptions"), [
    {
      id: "rx_seed_1",
      patientId: "pat_seed_1",
      patientName: "Sunita Deshmukh",
      doctorId: "doc_bhosikar",
      doctorName: DOCTOR_NAME,
      branchId: "br_ravet",
      diagnoses: ["Rheumatoid arthritis (M06.9)"],
      symptoms: "Bilateral hand and wrist joint pain and morning stiffness lasting over an hour.",
      medicines: [
        { name: "Methotrexate 7.5mg", dosage: "1 tablet", frequency: "Weekly", timing: "After food", durationDays: 28, instructions: "Once weekly only — same day each week; take with Folic acid" },
        { name: "Folic Acid 5mg", dosage: "1 tablet", frequency: "Weekly", timing: null, durationDays: 28, instructions: "Take on a different day than Methotrexate" },
        { name: "Etoricoxib 90mg", dosage: "1 tablet", frequency: "1-0-0", timing: "After food", durationDays: 7, instructions: "Short course for flare pain" },
      ],
      investigations: ["CBC", "Liver Function Test", "ESR", "CRP"],
      advice: "Joint protection techniques; gentle range-of-motion exercises; avoid high-impact activity during flare.",
      followUpDate: daysFromNow(2),
      createdAt: daysFromNow(-30, 11, 20),
      vitals: { heightCm: 158, weightKg: 64, bp: "128/82", pulse: 78, tempC: 36.8, spo2: 98 },
    },
    {
      id: "rx_seed_2",
      patientId: "pat_seed_2",
      patientName: "Ramesh Kulkarni",
      doctorId: "doc_bhosikar",
      doctorName: DOCTOR_NAME,
      branchId: "br_ravet",
      diagnoses: ["Gout, unspecified (M10.9)"],
      symptoms: "Sudden onset severe pain, redness and swelling of the right great toe overnight.",
      medicines: [
        { name: "Colchicine 0.5mg", dosage: "1 tablet", frequency: "1-0-1", timing: "After food", durationDays: 3, instructions: "Reduce dose if GI upset" },
        { name: "Etoricoxib 90mg", dosage: "1 tablet", frequency: "1-0-0", timing: "After food", durationDays: 5, instructions: null },
      ],
      investigations: ["Serum uric acid", "Renal function test"],
      advice: "Avoid alcohol, red meat, organ meats and sugary drinks during the attack; increase water intake; rest and elevate the affected joint.",
      followUpDate: daysFromNow(4),
      createdAt: daysFromNow(-10, 16, 50),
      vitals: { heightCm: 172, weightKg: 81, bp: "134/86", pulse: 82, tempC: 37.1, spo2: 98 },
    },
    {
      id: "rx_seed_3",
      patientId: "pat_seed_3",
      patientName: "Anjali Joshi",
      doctorId: "doc_bhosikar",
      doctorName: DOCTOR_NAME,
      branchId: "br_ravet",
      diagnoses: ["Low back pain (M54.5)"],
      symptoms: "Dull aching low back pain for 3 weeks, worse on prolonged sitting, no radiation to legs.",
      medicines: [
        { name: "Aceclofenac 100mg + Paracetamol 325mg", dosage: "1 tablet", frequency: "1-0-1", timing: "After food", durationDays: 7, instructions: null },
        { name: "Thiocolchicoside 4mg", dosage: "1 tablet", frequency: "0-0-1", timing: "At night", durationDays: 5, instructions: "Muscle relaxant" },
      ],
      investigations: ["X-ray LS spine if not improving in 2 weeks"],
      advice: "Avoid heavy lifting and prolonged sitting; hot fomentation twice daily; core-strengthening exercises once acute pain settles.",
      followUpDate: atToday(15, 30),
      createdAt: daysFromNow(-45, 10, 20),
      vitals: { heightCm: 162, weightKg: 58, bp: "118/76", pulse: 72, tempC: 36.7, spo2: 99 },
    },
  ]);

  await upsertMany(db.collection("invoices"), [
    {
      id: "inv_seed_1",
      number: "INV-1001",
      branchId: "br_ravet",
      patientId: "pat_seed_1",
      patientName: "Sunita Deshmukh",
      status: "PAID",
      paymentStatus: "PAID",
      items: [{ description: "Consultation — Rheumatology follow-up", quantity: 1, unitPrice: 800, lineTotal: 800 }],
      subtotal: 800,
      discountAmount: 0,
      taxAmount: 0,
      totalAmount: 800,
      paidAmount: 800,
      balanceAmount: 0,
      createdAt: daysFromNow(-30, 11, 25),
    },
    {
      id: "inv_seed_2",
      number: "INV-1002",
      branchId: "br_ravet",
      patientId: "pat_seed_2",
      patientName: "Ramesh Kulkarni",
      status: "PAID",
      paymentStatus: "PAID",
      items: [{ description: "Consultation — Walk-in (acute gout)", quantity: 1, unitPrice: 800, lineTotal: 800 }],
      subtotal: 800,
      discountAmount: 0,
      taxAmount: 0,
      totalAmount: 800,
      paidAmount: 800,
      balanceAmount: 0,
      createdAt: daysFromNow(-10, 16, 55),
    },
    {
      id: "inv_seed_3",
      number: "INV-1003",
      branchId: "br_ravet",
      patientId: "pat_seed_3",
      patientName: "Anjali Joshi",
      status: "PARTIALLY_PAID",
      paymentStatus: "PARTIAL",
      items: [{ description: "Consultation — Initial visit", quantity: 1, unitPrice: 800, lineTotal: 800 }],
      subtotal: 800,
      discountAmount: 0,
      taxAmount: 0,
      totalAmount: 800,
      paidAmount: 400,
      balanceAmount: 400,
      createdAt: daysFromNow(-45, 10, 25),
    },
  ]);
  console.log("Seeded: patients, appointments, prescriptions, invoices (3 sample patients)");

  // -------------------------------------------------------------------
  // Medicines — rheumatology formulary (20 items) with sample opening
  // stock. Two items sit at/below reorder level (med_15, med_19) so the
  // low-stock alert demos, and med_10 expires inside 30 days so the
  // "Expiring ≤30 days" card is non-zero. Mirrors demo/data.ts.
  // `gstRate` is a decimal fraction (0.12 = 12%). HSN 3004 is the heading for
  // formulated medicaments, so it is the same for every row here.
  // Tuple: [id, name, generic, category, unit, reorderLevel, sellPrice,
  //         stockQty, expiryInDays | null, mrp, costPrice, gstRate,
  //         rackLocation, schedule]
  // -------------------------------------------------------------------
  const medicines = [
    ["med_1", "Etoricoxib 90mg", "Etoricoxib", "NSAID", "Tablet", 20, 12, 140, 210, 14, 8.5, 0.12, "A-1", "OTC"],
    ["med_2", "Diclofenac 50mg", "Diclofenac Sodium", "NSAID", "Tablet", 20, 4, 160, 300, 4.8, 2.8, 0.12, "A-1", "OTC"],
    ["med_3", "Aceclofenac 100mg + Paracetamol 325mg", "Aceclofenac + Paracetamol", "NSAID", "Tablet", 20, 8, 120, 240, 9.5, 5.6, 0.12, "A-2", "OTC"],
    ["med_4", "Methotrexate 7.5mg", "Methotrexate", "DMARD", "Tablet", 10, 15, 60, 180, 18, 10.5, 0.12, "B-1", "H"],
    ["med_5", "Sulfasalazine 500mg", "Sulfasalazine", "DMARD", "Tablet", 10, 9, 55, null, 10.5, 6.3, 0.12, "B-1", "H"],
    ["med_6", "Hydroxychloroquine 200mg", "Hydroxychloroquine Sulfate", "DMARD", "Tablet", 10, 11, 48, 330, 13, 7.7, 0.12, "B-2", "H"],
    ["med_7", "Leflunomide 20mg", "Leflunomide", "DMARD", "Tablet", 10, 22, 40, 270, 26, 15.4, 0.12, "B-2", "H"],
    ["med_8", "Prednisolone 5mg", "Prednisolone", "Steroid", "Tablet", 15, 3, 90, 150, 3.6, 2.1, 0.12, "B-3", "H"],
    ["med_9", "Febuxostat 40mg", "Febuxostat", "Gout Management", "Tablet", 15, 14, 100, 360, 16.5, 9.8, 0.12, "C-1", "H"],
    ["med_10", "Colchicine 0.5mg", "Colchicine", "Gout Management", "Tablet", 15, 6, 75, 21, 7.2, 4.2, 0.12, "C-1", "H"],
    ["med_11", "Allopurinol 100mg", "Allopurinol", "Gout Management", "Tablet", 15, 5, 80, 420, 6, 3.5, 0.12, "C-2", "H"],
    ["med_12", "Calcium 500mg + Vitamin D3 250IU", "Calcium Carbonate + Cholecalciferol", "Bone Health", "Tablet", 25, 7, 180, 300, 8.4, 4.9, 0.05, "D-1", "OTC"],
    ["med_13", "Vitamin D3 60000IU", "Cholecalciferol", "Bone Health", "Sachet", 20, 30, 90, 240, 35, 21, 0.05, "D-1", "OTC"],
    ["med_14", "Alendronate 70mg", "Alendronate Sodium", "Bone Health", "Tablet", 10, 45, 45, 380, 54, 31.5, 0.12, "D-2", "H"],
    ["med_15", "Thiocolchicoside 4mg", "Thiocolchicoside", "Muscle Relaxant", "Tablet", 20, 10, 12, 190, 12, 7, 0.12, "E-1", "H"],
    ["med_16", "Chlorzoxazone 250mg + Paracetamol 500mg", "Chlorzoxazone + Paracetamol", "Muscle Relaxant", "Tablet", 20, 6, 130, null, 7.2, 4.2, 0.12, "E-1", "OTC"],
    ["med_17", "Pantoprazole 40mg", "Pantoprazole", "PPI", "Tablet", 25, 5, 200, 310, 6, 3.5, 0.12, "E-2", "OTC"],
    ["med_18", "Folic Acid 5mg", "Folic Acid", "Supplement", "Tablet", 20, 2, 150, 350, 2.4, 1.4, 0.05, "D-3", "OTC"],
    ["med_19", "Etanercept 25mg Injection", "Etanercept", "Biologic (DMARD)", "Injection", 5, 3200, 2, 120, 3600, 2800, 0.12, "COLD-1", "H"],
    ["med_20", "Tramadol 37.5mg + Paracetamol 325mg", "Tramadol + Paracetamol", "Analgesic", "Tablet", 20, 9, 110, 220, 10.8, 6.3, 0.12, "C-3", "H"],
  ].map(([id, name, genericName, category, unit, reorderLevel, sellPrice, stockQty, expiryInDays, mrp, costPrice, gstRate, rackLocation, schedule]) => ({
    id,
    name,
    genericName,
    category,
    brand: null,
    unit,
    reorderLevel,
    // Target level to restock up to — drives the reorder quantity.
    maxLevel: reorderLevel * 5,
    stockQty,
    sellPrice,
    nearestExpiry: expiryInDays === null ? null : daysFromNow(expiryInDays),
    isActive: true,
    mrp,
    costPrice,
    gstRate,
    hsnCode: "3004",
    rackLocation,
    schedule,
  }));
  await upsertMany(db.collection("medicines"), medicines);
  console.log(`Seeded: medicines (${medicines.length} items, sample opening stock)`);

  // -------------------------------------------------------------------
  // Medicine batches — the lot-level detail behind the opening stock.
  // Per medicine the lot quantities sum to that medicine's `stockQty`, and
  // the earliest expiry among lots still holding stock equals its
  // `nearestExpiry`, so Stock / Batches / Expiry all reconcile. Four
  // medicines (med_2, med_8, med_10, med_12) carry two lots so FEFO
  // ordering is visible. Mirrors demo-adapter.ts exactly.
  // Tuple: [id, medicineId, medicineName, batchNo, expiryInDays | null,
  //         quantity, receivedQty, costPrice, mrp, supplier, billNo,
  //         receivedDays, receivedHour, receivedMinute, receivedBy]
  // -------------------------------------------------------------------
  const SUP_SAHYADRI = "Sahyadri Pharma Distributors";
  const SUP_DECCAN = "Deccan Medico Agencies";
  const SUP_NIRMAL = "Nirmal Healthcare Supplies";

  const medicineBatches = [
    ["bat_seed_1", "med_1", "Etoricoxib 90mg", "ETX2431", 210, 140, 150, 8.5, 14, SUP_SAHYADRI, "SPD-4471", -30, 10, 15, "Priya Kale"],
    ["bat_seed_2", "med_2", "Diclofenac 50mg", "DCF8802", 300, 60, 60, 2.9, 4.8, SUP_SAHYADRI, "SPD-4471", -30, 10, 20, "Priya Kale"],
    ["bat_seed_3", "med_2", "Diclofenac 50mg", "DCF9147", 400, 100, 100, 2.75, 4.8, SUP_DECCAN, "DMA-1246", -12, 11, 30, "Priya Kale"],
    ["bat_seed_4", "med_3", "Aceclofenac 100mg + Paracetamol 325mg", "ACP5510", 240, 120, 120, 5.6, 9.5, SUP_SAHYADRI, "SPD-4471", -30, 10, 20, "Priya Kale"],
    ["bat_seed_5", "med_4", "Methotrexate 7.5mg", "MTX1209", 180, 60, 60, 10.5, 18, SUP_DECCAN, "DMA-1180", -30, 10, 25, "Priya Kale"],
    ["bat_seed_6", "med_5", "Sulfasalazine 500mg", "SSZ3364", null, 55, 55, 6.3, 10.5, SUP_DECCAN, "DMA-1180", -30, 10, 25, "Priya Kale"],
    ["bat_seed_7", "med_6", "Hydroxychloroquine 200mg", "HCQ7721", 330, 48, 48, 7.7, 13, SUP_DECCAN, "DMA-1180", -30, 10, 25, "Priya Kale"],
    ["bat_seed_8", "med_7", "Leflunomide 20mg", "LEF4408", 270, 40, 40, 15.4, 26, SUP_DECCAN, "DMA-1180", -30, 10, 25, "Priya Kale"],
    ["bat_seed_9", "med_8", "Prednisolone 5mg", "PRD2290", 150, 30, 50, 2.2, 3.6, SUP_SAHYADRI, "SPD-4471", -30, 10, 30, "Priya Kale"],
    ["bat_seed_10", "med_8", "Prednisolone 5mg", "PRD3115", 290, 60, 60, 2.05, 3.6, SUP_NIRMAL, "NHS-0138", -9, 12, 15, "Priya Kale"],
    ["bat_seed_11", "med_9", "Febuxostat 40mg", "FBX6603", 360, 100, 100, 9.8, 16.5, SUP_NIRMAL, "NHS-0092", -14, 11, 0, "Admin"],
    ["bat_seed_12", "med_10", "Colchicine 0.5mg", "COL1874", 21, 15, 40, 4.3, 7.2, SUP_SAHYADRI, "SPD-4402", -60, 10, 45, "Priya Kale"],
    ["bat_seed_13", "med_10", "Colchicine 0.5mg", "COL2318", 280, 60, 60, 4.1, 7.2, SUP_DECCAN, "DMA-1246", -12, 11, 30, "Priya Kale"],
    ["bat_seed_14", "med_11", "Allopurinol 100mg", "ALP5029", 420, 80, 80, 3.5, 6, SUP_DECCAN, "DMA-1246", -12, 11, 30, "Priya Kale"],
    ["bat_seed_15", "med_12", "Calcium 500mg + Vitamin D3 250IU", "CAD3390", 300, 80, 100, 5, 8.4, SUP_SAHYADRI, "SPD-4471", -30, 10, 35, "Priya Kale"],
    ["bat_seed_16", "med_12", "Calcium 500mg + Vitamin D3 250IU", "CAD4102", 420, 100, 100, 4.85, 8.4, SUP_NIRMAL, "NHS-0138", -9, 12, 15, "Priya Kale"],
    ["bat_seed_17", "med_13", "Vitamin D3 60000IU", "VTD7745", 240, 90, 90, 21, 35, SUP_SAHYADRI, "SPD-4471", -30, 10, 35, "Priya Kale"],
    ["bat_seed_18", "med_14", "Alendronate 70mg", "ALN9931", 380, 45, 45, 31.5, 54, SUP_NIRMAL, "NHS-0092", -14, 11, 0, "Admin"],
    ["bat_seed_19", "med_15", "Thiocolchicoside 4mg", "THC2207", 190, 12, 50, 7, 12, SUP_DECCAN, "DMA-1180", -30, 10, 25, "Priya Kale"],
    ["bat_seed_20", "med_16", "Chlorzoxazone 250mg + Paracetamol 500mg", "CZP6614", null, 130, 130, 4.2, 7.2, SUP_DECCAN, "DMA-1180", -30, 10, 25, "Priya Kale"],
    ["bat_seed_21", "med_17", "Pantoprazole 40mg", "PAN4478", 310, 200, 200, 3.5, 6, SUP_DECCAN, "DMA-1180", -30, 10, 25, "Priya Kale"],
    ["bat_seed_22", "med_18", "Folic Acid 5mg", "FOL1156", 350, 150, 150, 1.4, 2.4, SUP_SAHYADRI, "SPD-4471", -30, 10, 35, "Priya Kale"],
    ["bat_seed_23", "med_19", "Etanercept 25mg Injection", "ETN0071", 120, 2, 2, 2800, 3600, SUP_NIRMAL, "NHS-0092", -14, 11, 0, "Admin"],
    ["bat_seed_24", "med_20", "Tramadol 37.5mg + Paracetamol 325mg", "TRP8823", 220, 110, 120, 6.3, 10.8, SUP_SAHYADRI, "SPD-4471", -30, 10, 35, "Priya Kale"],
  ].map(([id, medicineId, medicineName, batchNo, expiryInDays, quantity, receivedQty, costPrice, mrp, supplierName, purchaseBillNo, receivedDays, receivedHour, receivedMinute, receivedBy]) => ({
    id,
    medicineId,
    medicineName,
    batchNo,
    expiry: expiryInDays === null ? null : daysFromNow(expiryInDays),
    quantity,
    receivedQty,
    costPrice,
    mrp,
    supplierName,
    purchaseBillNo,
    receivedAt: daysFromNow(receivedDays, receivedHour, receivedMinute),
    receivedBy,
  }));
  await upsertMany(db.collection("medicine_batches"), medicineBatches);
  console.log(`Seeded: medicine_batches (${medicineBatches.length} lots)`);

  // -------------------------------------------------------------------
  // Stock movements — sample ledger reconciling with the opening stock
  // above (med_1 = 150 in − 10 sold = 140, med_17 = 200, med_19 = 2).
  // -------------------------------------------------------------------
  const stockMovements = [
    {
      id: "stk_seed_1",
      medicineId: "med_1",
      medicineName: "Etoricoxib 90mg",
      type: "IN",
      quantity: 150,
      balanceAfter: 150,
      reason: "Opening stock — Sahyadri Pharma Distributors, invoice SPD-4471",
      by: "Priya Kale",
      at: daysFromNow(-30, 10, 15),
      batchId: "bat_seed_1",
      batchNo: "ETX2431",
      expiry: daysFromNow(210),
    },
    {
      id: "stk_seed_2",
      medicineId: "med_17",
      medicineName: "Pantoprazole 40mg",
      type: "IN",
      quantity: 200,
      balanceAfter: 200,
      reason: "Opening stock — Deccan Medico Agencies, invoice DMA-1180",
      by: "Priya Kale",
      at: daysFromNow(-30, 10, 25),
      batchId: "bat_seed_21",
      batchNo: "PAN4478",
      expiry: daysFromNow(310),
    },
    {
      id: "stk_seed_3",
      medicineId: "med_19",
      medicineName: "Etanercept 25mg Injection",
      type: "IN",
      quantity: 2,
      balanceAfter: 2,
      reason: "Cold-chain receipt — Nirmal Healthcare Supplies, invoice NHS-0092",
      by: "Admin",
      at: daysFromNow(-14, 11, 0),
      batchId: "bat_seed_23",
      batchNo: "ETN0071",
      expiry: daysFromNow(120),
    },
    {
      id: "stk_seed_4",
      medicineId: "med_1",
      medicineName: "Etoricoxib 90mg",
      type: "SALE",
      quantity: -10,
      balanceAfter: 140,
      reason: "Dispensed — Ramesh Kulkarni (MRN-100235)",
      by: "Priya Kale",
      at: daysFromNow(-10, 17, 5),
      batchId: "bat_seed_1",
      batchNo: "ETX2431",
      expiry: daysFromNow(210),
    },
  ];
  await upsertMany(db.collection("stock_movements"), stockMovements);
  console.log(`Seeded: stock_movements (${stockMovements.length} rows)`);

  // -------------------------------------------------------------------
  // Reception staff
  // -------------------------------------------------------------------
  const receptionists = [
    {
      id: "rec_seed_1",
      userId: "usr_rec_seed_1",
      fullName: "Priya Kale",
      email: "priya.kale@gmail.com",
      branchId: "br_ravet",
      employeeCode: "EMP-001",
      isActive: true,
    },
    {
      id: "rec_seed_2",
      userId: "usr_rec_seed_2",
      fullName: "Sneha Patil",
      email: "sneha.patil@gmail.com",
      branchId: "br_ravet",
      employeeCode: "EMP-002",
      isActive: true,
    },
  ];
  await upsertMany(db.collection("receptionists"), receptionists);
  console.log(`Seeded: receptionists (${receptionists.length} staff)`);

  // -------------------------------------------------------------------
  // Notifications — recipientId targets one user by session linkId;
  // omitting it broadcasts to everyone.
  // -------------------------------------------------------------------
  const notifications = [
    {
      id: "ntf_seed_1",
      type: "APPOINTMENT_REMINDER",
      channel: "WHATSAPP",
      title: "Appointment reminder",
      body: "Reminder: your follow-up with Dr. Abhijeet Bhosikar is today at 11:00 AM at Dr. Bhosikar's Rheumatology Clinic, Ravet.",
      status: "SENT",
      createdAt: daysFromNow(-1, 18, 0),
      read: false,
      recipientId: "pat_seed_1",
      actionUrl: "/portal/appointments",
    },
    {
      id: "ntf_seed_2",
      type: "FOLLOWUP_REMINDER",
      channel: "IN_APP",
      title: "Follow-up due",
      body: "Ramesh Kulkarni (MRN-100235) is due for a gout follow-up and uric acid review this week.",
      status: "SENT",
      createdAt: daysFromNow(-2, 9, 30),
      read: true,
      recipientId: "doc_bhosikar",
      actionUrl: "/doctor/patients",
    },
    {
      id: "ntf_seed_3",
      type: "INVENTORY_LOW_STOCK",
      channel: "IN_APP",
      title: "Low stock alert",
      body: "Etanercept 25mg Injection is down to 2 units (reorder level 5). Raise a purchase order with the supplier.",
      status: "SENT",
      createdAt: daysFromNow(-1, 11, 15),
      read: false,
      actionUrl: "/admin/inventory",
    },
  ];
  await upsertMany(db.collection("notifications"), notifications);
  console.log(`Seeded: notifications (${notifications.length} items)`);

  // -------------------------------------------------------------------
  // Medical records (EMR) — metadata only, no attached files
  // -------------------------------------------------------------------
  const medicalRecords = [
    {
      id: "mr_seed_1",
      patientId: "pat_seed_1",
      title: "RA Factor & Anti-CCP Report",
      category: "Lab Report",
      fileType: "PDF",
      fileSize: "412 KB",
      recordedAt: daysFromNow(-32, 9, 30),
      notes: "RA Factor 78 IU/mL (high), Anti-CCP positive. Supports the rheumatoid arthritis diagnosis; ESR and CRP also raised.",
      addedBy: "Dr. Abhijeet Bhosikar (Doctor)",
    },
    {
      id: "mr_seed_2",
      patientId: "pat_seed_2",
      title: "Serum Uric Acid Report",
      category: "Lab Report",
      fileType: "PDF",
      fileSize: "188 KB",
      recordedAt: daysFromNow(-11, 8, 45),
      notes: "Serum uric acid 8.9 mg/dL during the acute attack. Renal function within normal limits. Repeat after the flare settles.",
      addedBy: "Ramesh Kulkarni (Patient)",
    },
    {
      id: "mr_seed_3",
      patientId: "pat_seed_3",
      title: "X-Ray LS Spine (AP & Lateral)",
      category: "Radiology",
      fileType: "JPG",
      fileSize: "1.4 MB",
      recordedAt: daysFromNow(-44, 12, 0),
      notes: "Mild reduction of L4-L5 disc space. No listhesis or fracture. Consistent with mechanical low back pain.",
      addedBy: "Dr. Abhijeet Bhosikar (Doctor)",
    },
  ];
  await upsertMany(db.collection("medical_records"), medicalRecords);
  console.log(`Seeded: medical_records (${medicalRecords.length} records)`);

  // -------------------------------------------------------------------
  // Consent forms (e-signature) — 2 pending, 1 signed
  // -------------------------------------------------------------------
  const consentForms = [
    {
      id: "cf_seed_1",
      formNo: "CF-2026-000001",
      category: "TREATMENT",
      patientId: "pat_seed_1",
      patientName: "Sunita Deshmukh",
      doctorId: "doc_bhosikar",
      doctorName: DOCTOR_NAME,
      branchId: "br_ravet",
      title: "Consent for DMARD Therapy (Methotrexate)",
      body:
        "I consent to starting disease-modifying therapy with Methotrexate for rheumatoid arthritis. " +
        "The doctor has explained the expected benefit, the weekly (not daily) dosing schedule, and the need " +
        "for Folic Acid supplementation. I understand possible side effects include nausea, mouth ulcers, hair " +
        "thinning, and effects on the liver and blood counts, and that regular CBC and liver function monitoring " +
        "is required. I have been advised to avoid alcohol and to inform the clinic immediately if I develop " +
        "fever, unusual bleeding, breathlessness or persistent cough. I understand this medicine must not be " +
        "taken during pregnancy.",
      details: "Starting dose 7.5 mg once weekly. Baseline CBC, LFT, ESR and CRP done. Monitoring bloods every 4 weeks for the first 3 months.",
      risksExplained: true,
      alternativesDiscussed: true,
      questionsAnswered: true,
      interpreterUsed: false,
      status: "PENDING",
      createdBy: "Priya Kale",
      updatedAt: daysFromNow(-3, 12, 15),
    },
    {
      id: "cf_seed_2",
      formNo: "CF-2026-000002",
      category: "PROCEDURE",
      patientId: "pat_seed_2",
      patientName: "Ramesh Kulkarni",
      doctorId: "doc_bhosikar",
      doctorName: DOCTOR_NAME,
      branchId: "br_ravet",
      title: "Consent for Intra-articular Steroid Injection",
      body:
        "I consent to an intra-articular corticosteroid injection into the affected joint for relief of acute " +
        "inflammatory pain. The procedure, its purpose and alternatives have been explained to me. I understand " +
        "the possible risks include a temporary flare of pain for 24–48 hours, skin thinning or lightening at the " +
        "injection site, a short-term rise in blood sugar, and a small risk of joint infection. I confirm I have " +
        "no active infection and have disclosed all my current medications and allergies.",
      details: "Right first metatarsophalangeal joint. No anticoagulants. No known drug allergies. Procedure performed under aseptic precautions.",
      risksExplained: true,
      alternativesDiscussed: true,
      questionsAnswered: true,
      interpreterUsed: false,
      status: "SIGNED",
      signedAt: daysFromNow(-10, 16, 40),
      doctorSignedAt: daysFromNow(-10, 16, 32),
      createdBy: "Priya Kale",
      updatedAt: daysFromNow(-10, 16, 40),
    },
    {
      id: "cf_seed_3",
      formNo: "CF-2026-000003",
      category: "INVESTIGATION",
      patientId: "pat_seed_3",
      patientName: "Anjali Joshi",
      doctorId: "doc_bhosikar",
      doctorName: DOCTOR_NAME,
      branchId: "br_ravet",
      title: "Consent for Radiological Investigation (X-Ray LS Spine)",
      body:
        "I consent to an X-ray of the lumbosacral spine as advised for the evaluation of my low back pain. " +
        "The reason for the test has been explained to me, along with the fact that it involves a small dose of " +
        "ionising radiation. I confirm that I am not pregnant and am not likely to be pregnant. I understand the " +
        "report will be shared with my treating doctor and stored in my clinic record.",
      details: "AP and lateral views. Patient reports sulfa drug allergy — no contrast involved in this study.",
      risksExplained: false,
      alternativesDiscussed: false,
      questionsAnswered: false,
      interpreterUsed: false,
      status: "PENDING",
      createdBy: "Priya Kale",
      updatedAt: daysFromNow(-2, 10, 30),
    },
  ];
  await upsertMany(db.collection("consent_forms"), consentForms);
  console.log(`Seeded: consent_forms (${consentForms.length} forms)`);

  // -------------------------------------------------------------------
  // Rx templates — rheumatology quick-start bundles (clinic-wide)
  // -------------------------------------------------------------------
  const rxTemplates = [
    {
      id: "tpl_ra",
      name: "Rheumatoid Arthritis — active flare",
      doctorId: null,
      diagnoses: ["Rheumatoid arthritis (M06.9)"],
      medicines: [
        { name: "Methotrexate 7.5mg", dosage: "1 tablet", frequency: "Weekly", timing: "After food", durationDays: 28, instructions: "Once weekly only — same day each week; take with Folic acid" },
        { name: "Folic Acid 5mg", dosage: "1 tablet", frequency: "Weekly", timing: null, durationDays: 28, instructions: "Take on a different day than Methotrexate" },
        { name: "Etoricoxib 90mg", dosage: "1 tablet", frequency: "1-0-0", timing: "After food", durationDays: 7, instructions: "Short course for flare pain" },
      ],
      advice: ["Joint protection techniques", "Gentle range-of-motion exercises, avoid high-impact activity during flare"],
      investigations: ["CBC", "Liver Function Test", "ESR", "CRP"],
      followUpDays: 28,
    },
    {
      id: "tpl_oa-knee",
      name: "Osteoarthritis — knee",
      doctorId: null,
      diagnoses: ["Osteoarthritis of knee (M17.9)"],
      medicines: [
        { name: "Aceclofenac 100mg", dosage: "1 tablet", frequency: "1-0-1", timing: "After food", durationDays: 10, instructions: null },
        { name: "Glucosamine + Chondroitin", dosage: "1 tablet", frequency: "1-0-0", timing: "After food", durationDays: 60, instructions: "Long-term supplement, effect builds over weeks" },
      ],
      advice: ["Weight management", "Quadriceps strengthening exercises", "Avoid prolonged squatting/kneeling/stair climbing"],
      investigations: ["X-Ray knee (weight-bearing)"],
      followUpDays: 30,
    },
    {
      id: "tpl_back-pain",
      name: "Mechanical low back pain",
      doctorId: null,
      diagnoses: ["Low back pain (M54.5)"],
      medicines: [
        { name: "Aceclofenac 100mg", dosage: "1 tablet", frequency: "1-0-1", timing: "After food", durationDays: 7, instructions: null },
        { name: "Thiocolchicoside 4mg", dosage: "1 tablet", frequency: "0-0-1", timing: "At night", durationDays: 5, instructions: "Muscle relaxant" },
      ],
      advice: ["Avoid heavy lifting and prolonged sitting", "Hot fomentation twice daily", "Core-strengthening exercises once acute pain settles"],
      investigations: ["X-ray LS spine if not improving in 2 weeks"],
      followUpDays: 14,
    },
    {
      id: "tpl_gout",
      name: "Gout — acute attack",
      doctorId: null,
      diagnoses: ["Gout, unspecified (M10.9)"],
      medicines: [
        { name: "Colchicine 0.5mg", dosage: "1 tablet", frequency: "1-0-1", timing: "After food", durationDays: 3, instructions: "Reduce dose if GI upset" },
        { name: "Etoricoxib 90mg", dosage: "1 tablet", frequency: "1-0-0", timing: "After food", durationDays: 5, instructions: null },
      ],
      advice: ["Avoid alcohol, red meat, organ meats and sugary drinks during the attack", "Increase water intake", "Rest and elevate the affected joint"],
      investigations: ["Serum uric acid", "Renal function test"],
      followUpDays: 14,
    },
    {
      id: "tpl_spondylitis",
      name: "Ankylosing spondylitis — review",
      doctorId: null,
      diagnoses: ["Ankylosing spondylitis (M45)"],
      medicines: [
        { name: "Etoricoxib 90mg", dosage: "1 tablet", frequency: "1-0-0", timing: "After food", durationDays: 30, instructions: "Long-term NSAID for axial symptoms" },
        { name: "Sulfasalazine 500mg", dosage: "1 tablet", frequency: "1-0-1", timing: "After food", durationDays: 30, instructions: null },
      ],
      advice: ["Daily posture and spinal mobility exercises", "Swimming/back extension exercises encouraged", "Avoid prolonged static postures"],
      investigations: ["ESR", "CRP", "HLA-B27 (if not already done)"],
      followUpDays: 30,
    },
    {
      id: "tpl_fibromyalgia",
      name: "Fibromyalgia — initial management",
      doctorId: null,
      diagnoses: ["Fibromyalgia (M79.7)"],
      medicines: [
        { name: "Pregabalin 75mg", dosage: "1 tablet", frequency: "0-0-1", timing: "At night", durationDays: 30, instructions: "May cause drowsiness initially" },
        { name: "Amitriptyline 10mg", dosage: "1 tablet", frequency: "0-0-1", timing: "At night", durationDays: 30, instructions: null },
      ],
      advice: ["Graded aerobic exercise (start low, go slow)", "Sleep hygiene counselling", "Stress management — consider counselling referral"],
      investigations: ["TSH", "CBC", "Vitamin D"],
      followUpDays: 30,
    },
  ];
  await upsertMany(db.collection("rx_templates"), rxTemplates);
  console.log(`Seeded: rx_templates (${rxTemplates.length} items)`);

  // -------------------------------------------------------------------
  // Masters — rheumatology-relevant reference data
  // -------------------------------------------------------------------
  const mastersCol = db.collection("masters");
  await upsertMasters(mastersCol, "departments", [
    { id: "dep_1", name: "Rheumatology", meta: "Joint Pain, Backpain Treatment", active: true },
  ]);
  await upsertMasters(mastersCol, "specializations", [{ id: "sp_1", name: "Rheumatology", active: true }]);
  await upsertMasters(mastersCol, "medicine-categories", [
    { id: "mc_1", name: "NSAID", active: true },
    { id: "mc_2", name: "DMARD", active: true },
    { id: "mc_3", name: "Biologic (DMARD)", active: true },
    { id: "mc_4", name: "Steroid", active: true },
    { id: "mc_5", name: "Gout Management", active: true },
    { id: "mc_6", name: "Bone Health", active: true },
    { id: "mc_7", name: "Muscle Relaxant", active: true },
    { id: "mc_8", name: "PPI", active: true },
    { id: "mc_9", name: "Analgesic", active: true },
    { id: "mc_10", name: "Supplement", active: true },
  ]);
  await upsertMasters(mastersCol, "lab-tests", [
    { id: "lt_1", name: "Rheumatoid Factor (RA Factor)", active: true },
    { id: "lt_2", name: "Anti-CCP Antibody", active: true },
    { id: "lt_3", name: "ESR (Erythrocyte Sedimentation Rate)", active: true },
    { id: "lt_4", name: "CRP (C-Reactive Protein)", active: true },
    { id: "lt_5", name: "Serum Uric Acid", active: true },
    { id: "lt_6", name: "ANA (Antinuclear Antibody)", active: true },
    { id: "lt_7", name: "Vitamin D (25-OH)", active: true },
    { id: "lt_8", name: "Serum Calcium", active: true },
  ]);
  await upsertMasters(mastersCol, "investigations", [
    { id: "iv_1", name: "X-Ray (Joint)", active: true },
    { id: "iv_2", name: "Ultrasound (Joint)", active: true },
    { id: "iv_3", name: "MRI (Spine/Joint)", active: true },
    { id: "iv_4", name: "Bone Densitometry (DEXA Scan)", active: true },
  ]);
  await upsertMasters(mastersCol, "suppliers", [
    { id: "sup_1", name: "Sahyadri Pharma Distributors", meta: "Pimpri, Pune · +91 20 2745 8890 · GSTIN 27AABCS1429P1Z6", active: true },
    { id: "sup_2", name: "Deccan Medico Agencies", meta: "Shivajinagar, Pune · +91 20 2553 1177 · GSTIN 27AACCD8812K1ZR", active: true },
    { id: "sup_3", name: "Nirmal Healthcare Supplies", meta: "Chinchwad, Pune · +91 98220 34567 · GSTIN 27AAECN5590M1ZQ", active: true },
  ]);
  await upsertMasters(mastersCol, "tax-rates", [
    { id: "tx_1", name: "GST 5%", meta: "5.00%", active: true },
    { id: "tx_2", name: "GST 12%", meta: "12.00%", active: true },
    { id: "tx_3", name: "GST 18%", meta: "18.00%", active: true },
  ]);
  console.log("Seeded: masters (departments, specializations, medicine-categories, lab-tests, investigations, suppliers, tax-rates)");

  await client.close();
  console.log("\nDone. admin@gmail.com / Test@12345 can now sign in against MongoDB.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
