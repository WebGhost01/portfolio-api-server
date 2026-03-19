import { Router, type IRouter } from "express";
import { eq, and, gte, lte } from "drizzle-orm";
import { db, habitsTable, habitCompletionsTable } from "@workspace/db";
import {
  ListHabitsResponse,
  CreateHabitBody,
  UpdateHabitParams,
  UpdateHabitBody,
  UpdateHabitResponse,
  DeleteHabitParams,
  ListHabitCompletionsQueryParams,
  ListHabitCompletionsResponse,
  ToggleHabitCompletionBody,
  ToggleHabitCompletionResponse,
  GetHabitStatsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function calcStreak(completions: { completedDate: string }[]): { current: number; longest: number } {
  if (!completions.length) return { current: 0, longest: 0 };
  const sorted = [...completions].sort((a, b) => b.completedDate.localeCompare(a.completedDate));
  const today = new Date().toISOString().slice(0, 10);
  let current = 0;
  let longest = 0;
  let streak = 0;
  let prev = "";
  for (const c of sorted) {
    if (!prev) {
      if (c.completedDate === today || c.completedDate === new Date(Date.now() - 86400000).toISOString().slice(0, 10)) {
        streak = 1;
      } else {
        streak = 0;
      }
      prev = c.completedDate;
    } else {
      const prevDate = new Date(prev);
      const currDate = new Date(c.completedDate);
      const diff = Math.round((prevDate.getTime() - currDate.getTime()) / 86400000);
      if (diff === 1) {
        streak++;
      } else {
        break;
      }
      prev = c.completedDate;
    }
  }
  current = streak;
  let tempStreak = 1;
  const all = [...completions].sort((a, b) => a.completedDate.localeCompare(b.completedDate));
  for (let i = 1; i < all.length; i++) {
    const prev2 = new Date(all[i - 1].completedDate);
    const curr2 = new Date(all[i].completedDate);
    const diff = Math.round((curr2.getTime() - prev2.getTime()) / 86400000);
    if (diff === 1) {
      tempStreak++;
      if (tempStreak > longest) longest = tempStreak;
    } else {
      tempStreak = 1;
    }
  }
  if (all.length > 0 && longest === 0) longest = 1;
  return { current, longest: Math.max(current, longest) };
}

router.get("/habits", async (_req, res): Promise<void> => {
  const habits = await db.select().from(habitsTable).orderBy(habitsTable.createdAt);
  res.json(ListHabitsResponse.parse(habits));
});

router.post("/habits", async (req, res): Promise<void> => {
  const parsed = CreateHabitBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [habit] = await db.insert(habitsTable).values({ ...parsed.data, currentStreak: 0, longestStreak: 0 }).returning();
  res.status(201).json(habit);
});

router.patch("/habits/:id", async (req, res): Promise<void> => {
  const params = UpdateHabitParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateHabitBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [habit] = await db.update(habitsTable).set(parsed.data).where(eq(habitsTable.id, params.data.id)).returning();
  if (!habit) {
    res.status(404).json({ error: "Habit not found" });
    return;
  }
  res.json(UpdateHabitResponse.parse(habit));
});

router.delete("/habits/:id", async (req, res): Promise<void> => {
  const params = DeleteHabitParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [h] = await db.delete(habitsTable).where(eq(habitsTable.id, params.data.id)).returning();
  if (!h) {
    res.status(404).json({ error: "Habit not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/habit-completions", async (req, res): Promise<void> => {
  const qp = ListHabitCompletionsQueryParams.safeParse(req.query);
  let completions = await db.select().from(habitCompletionsTable);
  if (qp.success && qp.data.habitId) {
    completions = completions.filter(c => c.habitId === qp.data.habitId);
  }
  if (qp.success && qp.data.startDate) {
    completions = completions.filter(c => c.completedDate >= qp.data.startDate!);
  }
  if (qp.success && qp.data.endDate) {
    completions = completions.filter(c => c.completedDate <= qp.data.endDate!);
  }
  res.json(ListHabitCompletionsResponse.parse(completions));
});

router.post("/habit-completions", async (req, res): Promise<void> => {
  const parsed = ToggleHabitCompletionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { habitId, completedDate } = parsed.data;
  const existing = await db.select().from(habitCompletionsTable)
    .where(and(eq(habitCompletionsTable.habitId, habitId), eq(habitCompletionsTable.completedDate, completedDate)));
  
  let completion;
  if (existing.length > 0) {
    await db.delete(habitCompletionsTable).where(eq(habitCompletionsTable.id, existing[0].id));
    completion = existing[0];
  } else {
    const [c] = await db.insert(habitCompletionsTable).values({ habitId, completedDate }).returning();
    completion = c;
  }
  
  const allCompletions = await db.select().from(habitCompletionsTable).where(eq(habitCompletionsTable.habitId, habitId));
  const { current, longest } = calcStreak(allCompletions);
  await db.update(habitsTable).set({ currentStreak: current, longestStreak: longest }).where(eq(habitsTable.id, habitId));
  
  res.json(ToggleHabitCompletionResponse.parse(completion));
});

router.get("/habit-stats", async (_req, res): Promise<void> => {
  const habits = await db.select().from(habitsTable);
  const stats = await Promise.all(habits.map(async (habit) => {
    const completions = await db.select().from(habitCompletionsTable).where(eq(habitCompletionsTable.habitId, habit.id));
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const recentCompletions = completions.filter(c => c.completedDate >= thirtyDaysAgo);
    return {
      habitId: habit.id,
      habitName: habit.name,
      currentStreak: habit.currentStreak,
      longestStreak: habit.longestStreak,
      totalCompletions: completions.length,
      completionRate: recentCompletions.length / 30,
    };
  }));
  res.json(GetHabitStatsResponse.parse(stats));
});

export default router;
