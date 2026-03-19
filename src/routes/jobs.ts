import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, jobApplicationsTable, jobNotesTable } from "@workspace/db";
import {
  ListJobApplicationsResponse,
  ListJobApplicationsQueryParams,
  CreateJobApplicationBody,
  UpdateJobApplicationParams,
  UpdateJobApplicationBody,
  UpdateJobApplicationResponse,
  DeleteJobApplicationParams,
  ListJobNotesParams,
  ListJobNotesResponse,
  CreateJobNoteBody,
  GetJobStatsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/job-applications", async (req, res): Promise<void> => {
  const qp = ListJobApplicationsQueryParams.safeParse(req.query);
  let apps;
  if (qp.success && qp.data.status) {
    apps = await db.select().from(jobApplicationsTable).where(eq(jobApplicationsTable.status, qp.data.status)).orderBy(jobApplicationsTable.appliedDate);
  } else {
    apps = await db.select().from(jobApplicationsTable).orderBy(jobApplicationsTable.appliedDate);
  }
  res.json(ListJobApplicationsResponse.parse(apps));
});

router.post("/job-applications", async (req, res): Promise<void> => {
  const parsed = CreateJobApplicationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [app] = await db.insert(jobApplicationsTable).values(parsed.data).returning();
  res.status(201).json(app);
});

router.patch("/job-applications/:id", async (req, res): Promise<void> => {
  const params = UpdateJobApplicationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateJobApplicationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [app] = await db.update(jobApplicationsTable).set(parsed.data).where(eq(jobApplicationsTable.id, params.data.id)).returning();
  if (!app) {
    res.status(404).json({ error: "Application not found" });
    return;
  }
  res.json(UpdateJobApplicationResponse.parse(app));
});

router.delete("/job-applications/:id", async (req, res): Promise<void> => {
  const params = DeleteJobApplicationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [app] = await db.delete(jobApplicationsTable).where(eq(jobApplicationsTable.id, params.data.id)).returning();
  if (!app) {
    res.status(404).json({ error: "Application not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/job-notes/:applicationId", async (req, res): Promise<void> => {
  const params = ListJobNotesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const notes = await db.select().from(jobNotesTable).where(eq(jobNotesTable.applicationId, params.data.applicationId)).orderBy(jobNotesTable.createdAt);
  res.json(ListJobNotesResponse.parse(notes));
});

router.post("/job-notes", async (req, res): Promise<void> => {
  const parsed = CreateJobNoteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [note] = await db.insert(jobNotesTable).values(parsed.data).returning();
  res.status(201).json(note);
});

router.get("/job-stats", async (_req, res): Promise<void> => {
  const apps = await db.select().from(jobApplicationsTable);
  const total = apps.length;
  const statusCounts: Record<string, number> = {};
  apps.forEach(a => { statusCounts[a.status] = (statusCounts[a.status] || 0) + 1; });
  const byStatus = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));
  const responses = apps.filter(a => ["phone_screen", "interview", "technical", "offer", "rejected"].includes(a.status)).length;
  const interviews = apps.filter(a => ["interview", "technical", "offer"].includes(a.status)).length;
  res.json(GetJobStatsResponse.parse({
    total,
    byStatus,
    responseRate: total > 0 ? Math.round((responses / total) * 100) : 0,
    interviewRate: total > 0 ? Math.round((interviews / total) * 100) : 0,
  }));
});

export default router;
