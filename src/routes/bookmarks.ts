import { Router, type IRouter } from "express";
import { eq, ilike } from "drizzle-orm";
import { db, bookmarksTable, bookmarkCollectionsTable } from "@workspace/db";
import {
  ListBookmarksResponse,
  ListBookmarksQueryParams,
  CreateBookmarkBody,
  UpdateBookmarkParams,
  UpdateBookmarkBody,
  UpdateBookmarkResponse,
  DeleteBookmarkParams,
  ListBookmarkCollectionsResponse,
  CreateBookmarkCollectionBody,
  DeleteBookmarkCollectionParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/bookmarks", async (req, res): Promise<void> => {
  const qp = ListBookmarksQueryParams.safeParse(req.query);
  let bms = await db.select().from(bookmarksTable).orderBy(bookmarksTable.createdAt);
  if (qp.success && qp.data.search) {
    const s = qp.data.search.toLowerCase();
    bms = bms.filter(b => b.title.toLowerCase().includes(s) || b.url.toLowerCase().includes(s));
  }
  if (qp.success && qp.data.tag) {
    bms = bms.filter(b => b.tags.includes(qp.data.tag!));
  }
  if (qp.success && qp.data.collectionId) {
    bms = bms.filter(b => b.collectionId === qp.data.collectionId);
  }
  res.json(ListBookmarksResponse.parse(bms));
});

router.post("/bookmarks", async (req, res): Promise<void> => {
  const parsed = CreateBookmarkBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = { ...parsed.data, tags: parsed.data.tags ?? [] };
  const [bookmark] = await db.insert(bookmarksTable).values(data).returning();
  res.status(201).json(bookmark);
});

router.patch("/bookmarks/:id", async (req, res): Promise<void> => {
  const params = UpdateBookmarkParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateBookmarkBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [bookmark] = await db.update(bookmarksTable).set(parsed.data).where(eq(bookmarksTable.id, params.data.id)).returning();
  if (!bookmark) {
    res.status(404).json({ error: "Bookmark not found" });
    return;
  }
  res.json(UpdateBookmarkResponse.parse(bookmark));
});

router.delete("/bookmarks/:id", async (req, res): Promise<void> => {
  const params = DeleteBookmarkParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [b] = await db.delete(bookmarksTable).where(eq(bookmarksTable.id, params.data.id)).returning();
  if (!b) {
    res.status(404).json({ error: "Bookmark not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/bookmark-collections", async (_req, res): Promise<void> => {
  const collections = await db.select().from(bookmarkCollectionsTable).orderBy(bookmarkCollectionsTable.createdAt);
  res.json(ListBookmarkCollectionsResponse.parse(collections));
});

router.post("/bookmark-collections", async (req, res): Promise<void> => {
  const parsed = CreateBookmarkCollectionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [collection] = await db.insert(bookmarkCollectionsTable).values(parsed.data).returning();
  res.status(201).json(collection);
});

router.delete("/bookmark-collections/:id", async (req, res): Promise<void> => {
  const params = DeleteBookmarkCollectionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [c] = await db.delete(bookmarkCollectionsTable).where(eq(bookmarkCollectionsTable.id, params.data.id)).returning();
  if (!c) {
    res.status(404).json({ error: "Collection not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
