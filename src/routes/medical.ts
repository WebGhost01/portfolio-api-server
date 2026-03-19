import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, medicalRecordsTable, medicationsTable } from "@workspace/db";
import {
  ListMedicalRecordsResponse,
  CreateMedicalRecordBody,
  UpdateMedicalRecordParams,
  UpdateMedicalRecordBody,
  UpdateMedicalRecordResponse,
  DeleteMedicalRecordParams,
  ListMedicationsResponse,
  CreateMedicationBody,
  UpdateMedicationParams,
  UpdateMedicationBody,
  UpdateMedicationResponse,
  DeleteMedicationParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/medical-records", async (_req, res): Promise<void> => {
  const records = await db.select().from(medicalRecordsTable).orderBy(medicalRecordsTable.date);
  res.json(ListMedicalRecordsResponse.parse(records));
});

router.post("/medical-records", async (req, res): Promise<void> => {
  const parsed = CreateMedicalRecordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [record] = await db.insert(medicalRecordsTable).values(parsed.data).returning();
  res.status(201).json(record);
});

router.patch("/medical-records/:id", async (req, res): Promise<void> => {
  const params = UpdateMedicalRecordParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateMedicalRecordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [record] = await db.update(medicalRecordsTable).set(parsed.data).where(eq(medicalRecordsTable.id, params.data.id)).returning();
  if (!record) {
    res.status(404).json({ error: "Record not found" });
    return;
  }
  res.json(UpdateMedicalRecordResponse.parse(record));
});

router.delete("/medical-records/:id", async (req, res): Promise<void> => {
  const params = DeleteMedicalRecordParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [r] = await db.delete(medicalRecordsTable).where(eq(medicalRecordsTable.id, params.data.id)).returning();
  if (!r) {
    res.status(404).json({ error: "Record not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/medications", async (_req, res): Promise<void> => {
  const meds = await db.select().from(medicationsTable).orderBy(medicationsTable.createdAt);
  res.json(ListMedicationsResponse.parse(meds));
});

router.post("/medications", async (req, res): Promise<void> => {
  const parsed = CreateMedicationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [med] = await db.insert(medicationsTable).values(parsed.data).returning();
  res.status(201).json(med);
});

router.patch("/medications/:id", async (req, res): Promise<void> => {
  const params = UpdateMedicationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateMedicationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [med] = await db.update(medicationsTable).set(parsed.data).where(eq(medicationsTable.id, params.data.id)).returning();
  if (!med) {
    res.status(404).json({ error: "Medication not found" });
    return;
  }
  res.json(UpdateMedicationResponse.parse(med));
});

router.delete("/medications/:id", async (req, res): Promise<void> => {
  const params = DeleteMedicationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [m] = await db.delete(medicationsTable).where(eq(medicationsTable.id, params.data.id)).returning();
  if (!m) {
    res.status(404).json({ error: "Medication not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
