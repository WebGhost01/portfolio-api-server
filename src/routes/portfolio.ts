import { Router } from "express";
import { db } from "@workspace/db";
import { portfolioProfile, portfolioJobs } from "@workspace/db";
import { eq, asc } from "drizzle-orm";

const router = Router();

// Get profile (always returns one row, creates default if needed)
router.get("/portfolio/profile", async (_req, res) => {
  let rows = await db.select().from(portfolioProfile).limit(1);
  if (rows.length === 0) {
    const [created] = await db
      .insert(portfolioProfile)
      .values({
        name: "Your Name",
        tagline: "Full-Stack Developer & Problem Solver",
        email: "you@example.com",
        phone: "",
        location: "San Francisco, CA",
        github: "https://github.com/yourusername",
        linkedin: "",
        website: "",
        bio: "Passionate developer with expertise in building scalable web applications. I love turning complex problems into simple, beautiful solutions.",
        coverLetter: "",
      })
      .returning();
    rows = [created];
  }
  res.json(rows[0]);
});

// Update profile
router.put("/portfolio/profile", async (req, res) => {
  const body = req.body;
  let rows = await db.select().from(portfolioProfile).limit(1);
  if (rows.length === 0) {
    const [created] = await db
      .insert(portfolioProfile)
      .values({ ...body, updatedAt: new Date() })
      .returning();
    return res.json(created);
  }
  const [updated] = await db
    .update(portfolioProfile)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(portfolioProfile.id, rows[0].id))
    .returning();
  res.json(updated);
});

// List jobs
router.get("/portfolio/jobs", async (_req, res) => {
  const jobs = await db
    .select()
    .from(portfolioJobs)
    .orderBy(asc(portfolioJobs.sortOrder), asc(portfolioJobs.createdAt));
  res.json(jobs);
});

// Create job
router.post("/portfolio/jobs", async (req, res) => {
  const { company, title, startDate, endDate, description, current, sortOrder } = req.body;
  if (!company || !title || !startDate) {
    return res.status(400).json({ error: "company, title, startDate required" });
  }
  const [job] = await db
    .insert(portfolioJobs)
    .values({ company, title, startDate, endDate, description: description || "", current: current || false, sortOrder: sortOrder || 0 })
    .returning();
  res.status(201).json(job);
});

// Update job
router.patch("/portfolio/jobs/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const body = req.body;
  const [updated] = await db
    .update(portfolioJobs)
    .set(body)
    .where(eq(portfolioJobs.id, id))
    .returning();
  if (!updated) return res.status(404).json({ error: "Not found" });
  res.json(updated);
});

// Delete job
router.delete("/portfolio/jobs/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [deleted] = await db
    .delete(portfolioJobs)
    .where(eq(portfolioJobs.id, id))
    .returning();
  if (!deleted) return res.status(404).json({ error: "Not found" });
  res.status(204).end();
});

export default router;
