import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, eventsTable, rsvpsTable } from "@workspace/db";
import {
  ListEventsResponse,
  ListEventsQueryParams,
  CreateEventBody,
  GetEventParams,
  GetEventResponse,
  UpdateEventParams,
  UpdateEventBody,
  UpdateEventResponse,
  DeleteEventParams,
  ListRsvpsQueryParams,
  ListRsvpsResponse,
  CreateRsvpBody,
  UpdateRsvpParams,
  UpdateRsvpBody,
  UpdateRsvpResponse,
  DeleteRsvpParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/events", async (req, res): Promise<void> => {
  const events = await db.select().from(eventsTable).orderBy(eventsTable.startDate);
  const withCounts = await Promise.all(events.map(async (event) => {
    const rsvps = await db.select().from(rsvpsTable).where(eq(rsvpsTable.eventId, event.id));
    return { ...event, rsvpCount: rsvps.filter(r => r.status === "attending").length };
  }));
  res.json(ListEventsResponse.parse(withCounts));
});

router.post("/events", async (req, res): Promise<void> => {
  const parsed = CreateEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [event] = await db.insert(eventsTable).values(parsed.data).returning();
  res.status(201).json({ ...event, rsvpCount: 0 });
});

router.get("/events/:id", async (req, res): Promise<void> => {
  const params = GetEventParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, params.data.id));
  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  const rsvps = await db.select().from(rsvpsTable).where(eq(rsvpsTable.eventId, event.id));
  res.json(GetEventResponse.parse({ ...event, rsvpCount: rsvps.filter(r => r.status === "attending").length }));
});

router.patch("/events/:id", async (req, res): Promise<void> => {
  const params = UpdateEventParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [event] = await db.update(eventsTable).set(parsed.data).where(eq(eventsTable.id, params.data.id)).returning();
  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  const rsvps = await db.select().from(rsvpsTable).where(eq(rsvpsTable.eventId, event.id));
  res.json(UpdateEventResponse.parse({ ...event, rsvpCount: rsvps.filter(r => r.status === "attending").length }));
});

router.delete("/events/:id", async (req, res): Promise<void> => {
  const params = DeleteEventParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(rsvpsTable).where(eq(rsvpsTable.eventId, params.data.id));
  const [e] = await db.delete(eventsTable).where(eq(eventsTable.id, params.data.id)).returning();
  if (!e) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/rsvps", async (req, res): Promise<void> => {
  const qp = ListRsvpsQueryParams.safeParse(req.query);
  let rsvps;
  if (qp.success && qp.data.eventId) {
    rsvps = await db.select().from(rsvpsTable).where(eq(rsvpsTable.eventId, qp.data.eventId)).orderBy(rsvpsTable.createdAt);
  } else {
    rsvps = await db.select().from(rsvpsTable).orderBy(rsvpsTable.createdAt);
  }
  res.json(ListRsvpsResponse.parse(rsvps));
});

router.post("/rsvps", async (req, res): Promise<void> => {
  const parsed = CreateRsvpBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [rsvp] = await db.insert(rsvpsTable).values(parsed.data).returning();
  res.status(201).json(rsvp);
});

router.patch("/rsvps/:id", async (req, res): Promise<void> => {
  const params = UpdateRsvpParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateRsvpBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [rsvp] = await db.update(rsvpsTable).set(parsed.data).where(eq(rsvpsTable.id, params.data.id)).returning();
  if (!rsvp) {
    res.status(404).json({ error: "RSVP not found" });
    return;
  }
  res.json(UpdateRsvpResponse.parse(rsvp));
});

router.delete("/rsvps/:id", async (req, res): Promise<void> => {
  const params = DeleteRsvpParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [r] = await db.delete(rsvpsTable).where(eq(rsvpsTable.id, params.data.id)).returning();
  if (!r) {
    res.status(404).json({ error: "RSVP not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
