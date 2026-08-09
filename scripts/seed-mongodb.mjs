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
  await upsertMany(db.collection("users"), [
    {
      id: "usr_admin",
      fullName: "Admin",
      email: "admin@gmail.com",
      role: "ADMIN",
      passwordHash:
        "scrypt$7932b2e116b076a54f452848eaabd585$06000d0d587e8c9f8e4837807bfb98b9771cac636d018468d93212910f423e64",
      isActive: true,
      createdAt: new Date(2026, 0, 1).toISOString(),
    },
  ]);
  console.log("Seeded: users (admin@gmail.com)");

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
      email: "doctor@bhosikarrheumatology.in",
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
  // Medicines — rheumatology formulary (20 items, stock starts at 0)
  // -------------------------------------------------------------------
  const medicines = [
    ["med_1", "Etoricoxib 90mg", "Etoricoxib", "NSAID", "Tablet", 20, 12],
    ["med_2", "Diclofenac 50mg", "Diclofenac Sodium", "NSAID", "Tablet", 20, 4],
    ["med_3", "Aceclofenac 100mg + Paracetamol 325mg", "Aceclofenac + Paracetamol", "NSAID", "Tablet", 20, 8],
    ["med_4", "Methotrexate 7.5mg", "Methotrexate", "DMARD", "Tablet", 10, 15],
    ["med_5", "Sulfasalazine 500mg", "Sulfasalazine", "DMARD", "Tablet", 10, 9],
    ["med_6", "Hydroxychloroquine 200mg", "Hydroxychloroquine Sulfate", "DMARD", "Tablet", 10, 11],
    ["med_7", "Leflunomide 20mg", "Leflunomide", "DMARD", "Tablet", 10, 22],
    ["med_8", "Prednisolone 5mg", "Prednisolone", "Steroid", "Tablet", 15, 3],
    ["med_9", "Febuxostat 40mg", "Febuxostat", "Gout Management", "Tablet", 15, 14],
    ["med_10", "Colchicine 0.5mg", "Colchicine", "Gout Management", "Tablet", 15, 6],
    ["med_11", "Allopurinol 100mg", "Allopurinol", "Gout Management", "Tablet", 15, 5],
    ["med_12", "Calcium 500mg + Vitamin D3 250IU", "Calcium Carbonate + Cholecalciferol", "Bone Health", "Tablet", 25, 7],
    ["med_13", "Vitamin D3 60000IU", "Cholecalciferol", "Bone Health", "Sachet", 20, 30],
    ["med_14", "Alendronate 70mg", "Alendronate Sodium", "Bone Health", "Tablet", 10, 45],
    ["med_15", "Thiocolchicoside 4mg", "Thiocolchicoside", "Muscle Relaxant", "Tablet", 20, 10],
    ["med_16", "Chlorzoxazone 250mg + Paracetamol 500mg", "Chlorzoxazone + Paracetamol", "Muscle Relaxant", "Tablet", 20, 6],
    ["med_17", "Pantoprazole 40mg", "Pantoprazole", "PPI", "Tablet", 25, 5],
    ["med_18", "Folic Acid 5mg", "Folic Acid", "Supplement", "Tablet", 20, 2],
    ["med_19", "Etanercept 25mg Injection", "Etanercept", "Biologic (DMARD)", "Injection", 5, 3200],
    ["med_20", "Tramadol 37.5mg + Paracetamol 325mg", "Tramadol + Paracetamol", "Analgesic", "Tablet", 20, 9],
  ].map(([id, name, genericName, category, unit, reorderLevel, sellPrice]) => ({
    id,
    name,
    genericName,
    category,
    brand: null,
    unit,
    reorderLevel,
    stockQty: 0,
    sellPrice,
    nearestExpiry: null,
    isActive: true,
  }));
  await upsertMany(db.collection("medicines"), medicines);
  console.log(`Seeded: medicines (${medicines.length} items)`);

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
  await upsertMasters(mastersCol, "tax-rates", [
    { id: "tx_1", name: "GST 5%", meta: "5.00%", active: true },
    { id: "tx_2", name: "GST 12%", meta: "12.00%", active: true },
    { id: "tx_3", name: "GST 18%", meta: "18.00%", active: true },
  ]);
  console.log("Seeded: masters (departments, specializations, medicine-categories, lab-tests, investigations, tax-rates)");

  await client.close();
  console.log("\nDone. admin@gmail.com / Test@12345 can now sign in against MongoDB.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
