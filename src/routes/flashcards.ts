import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, decksTable, flashcardsTable, studySessionsTable } from "@workspace/db";
import {
  ListDecksResponse,
  CreateDeckBody,
  GetDeckParams,
  GetDeckResponse,
  UpdateDeckParams,
  UpdateDeckBody,
  UpdateDeckResponse,
  DeleteDeckParams,
  CreateFlashcardBody,
  UpdateFlashcardParams,
  UpdateFlashcardBody,
  UpdateFlashcardResponse,
  DeleteFlashcardParams,
  RecordStudySessionBody,
  ListStudySessionsParams,
  ListStudySessionsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/decks", async (_req, res): Promise<void> => {
  const decks = await db.select().from(decksTable).orderBy(decksTable.createdAt);
  const withCounts = await Promise.all(decks.map(async (deck) => {
    const cards = await db.select().from(flashcardsTable).where(eq(flashcardsTable.deckId, deck.id));
    return { ...deck, cardCount: cards.length };
  }));
  res.json(ListDecksResponse.parse(withCounts));
});

router.post("/decks", async (req, res): Promise<void> => {
  const parsed = CreateDeckBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [deck] = await db.insert(decksTable).values(parsed.data).returning();
  res.status(201).json({ ...deck, cardCount: 0 });
});

router.get("/decks/:id", async (req, res): Promise<void> => {
  const params = GetDeckParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [deck] = await db.select().from(decksTable).where(eq(decksTable.id, params.data.id));
  if (!deck) {
    res.status(404).json({ error: "Deck not found" });
    return;
  }
  const cards = await db.select().from(flashcardsTable).where(eq(flashcardsTable.deckId, deck.id));
  res.json(GetDeckResponse.parse({ ...deck, cardCount: cards.length, cards }));
});

router.patch("/decks/:id", async (req, res): Promise<void> => {
  const params = UpdateDeckParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateDeckBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [deck] = await db.update(decksTable).set(parsed.data).where(eq(decksTable.id, params.data.id)).returning();
  if (!deck) {
    res.status(404).json({ error: "Deck not found" });
    return;
  }
  const cards = await db.select().from(flashcardsTable).where(eq(flashcardsTable.deckId, deck.id));
  res.json(UpdateDeckResponse.parse({ ...deck, cardCount: cards.length }));
});

router.delete("/decks/:id", async (req, res): Promise<void> => {
  const params = DeleteDeckParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(flashcardsTable).where(eq(flashcardsTable.deckId, params.data.id));
  const [d] = await db.delete(decksTable).where(eq(decksTable.id, params.data.id)).returning();
  if (!d) {
    res.status(404).json({ error: "Deck not found" });
    return;
  }
  res.sendStatus(204);
});

router.post("/flashcards", async (req, res): Promise<void> => {
  const parsed = CreateFlashcardBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [card] = await db.insert(flashcardsTable).values(parsed.data).returning();
  res.status(201).json(card);
});

router.patch("/flashcards/:id", async (req, res): Promise<void> => {
  const params = UpdateFlashcardParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateFlashcardBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [card] = await db.update(flashcardsTable).set(parsed.data).where(eq(flashcardsTable.id, params.data.id)).returning();
  if (!card) {
    res.status(404).json({ error: "Flashcard not found" });
    return;
  }
  res.json(UpdateFlashcardResponse.parse(card));
});

router.delete("/flashcards/:id", async (req, res): Promise<void> => {
  const params = DeleteFlashcardParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [c] = await db.delete(flashcardsTable).where(eq(flashcardsTable.id, params.data.id)).returning();
  if (!c) {
    res.status(404).json({ error: "Flashcard not found" });
    return;
  }
  res.sendStatus(204);
});

router.post("/study-sessions", async (req, res): Promise<void> => {
  const parsed = RecordStudySessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [session] = await db.insert(studySessionsTable).values(parsed.data).returning();
  res.status(201).json(session);
});

router.get("/study-sessions/:deckId", async (req, res): Promise<void> => {
  const params = ListStudySessionsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const sessions = await db.select().from(studySessionsTable).where(eq(studySessionsTable.deckId, params.data.deckId)).orderBy(studySessionsTable.createdAt);
  res.json(ListStudySessionsResponse.parse(sessions));
});

export default router;
