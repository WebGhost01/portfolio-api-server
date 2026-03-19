import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, transactionsTable, budgetGoalsTable } from "@workspace/db";
import {
  ListTransactionsResponse,
  ListTransactionsQueryParams,
  CreateTransactionBody,
  UpdateTransactionParams,
  UpdateTransactionBody,
  UpdateTransactionResponse,
  DeleteTransactionParams,
  GetBudgetSummaryQueryParams,
  GetBudgetSummaryResponse,
  ListBudgetGoalsResponse,
  CreateBudgetGoalBody,
  UpdateBudgetGoalParams,
  UpdateBudgetGoalBody,
  UpdateBudgetGoalResponse,
  DeleteBudgetGoalParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/transactions", async (req, res): Promise<void> => {
  const qp = ListTransactionsQueryParams.safeParse(req.query);
  let transactions;
  if (qp.success && qp.data.month) {
    transactions = await db.select().from(transactionsTable).where(sql`${transactionsTable.date} like ${qp.data.month + "%"}`).orderBy(transactionsTable.createdAt);
  } else {
    transactions = await db.select().from(transactionsTable).orderBy(transactionsTable.createdAt);
  }
  res.json(ListTransactionsResponse.parse(transactions));
});

router.post("/transactions", async (req, res): Promise<void> => {
  const parsed = CreateTransactionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [transaction] = await db.insert(transactionsTable).values(parsed.data).returning();
  res.status(201).json(transaction);
});

router.patch("/transactions/:id", async (req, res): Promise<void> => {
  const params = UpdateTransactionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateTransactionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [transaction] = await db.update(transactionsTable).set(parsed.data).where(eq(transactionsTable.id, params.data.id)).returning();
  if (!transaction) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }
  res.json(UpdateTransactionResponse.parse(transaction));
});

router.delete("/transactions/:id", async (req, res): Promise<void> => {
  const params = DeleteTransactionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [t] = await db.delete(transactionsTable).where(eq(transactionsTable.id, params.data.id)).returning();
  if (!t) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/budget-summary", async (req, res): Promise<void> => {
  let transactions = await db.select().from(transactionsTable);
  const qp = GetBudgetSummaryQueryParams.safeParse(req.query);
  if (qp.success && qp.data.month) {
    transactions = transactions.filter(t => t.date.startsWith(qp.data.month!));
  }
  const income = transactions.filter(t => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
  const expenses = transactions.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
  const byCategoryMap: Record<string, number> = {};
  transactions.filter(t => t.type === "expense").forEach(t => {
    byCategoryMap[t.category] = (byCategoryMap[t.category] || 0) + t.amount;
  });
  const byCategory = Object.entries(byCategoryMap).map(([category, total]) => ({ category, total }));
  res.json(GetBudgetSummaryResponse.parse({ totalIncome: income, totalExpenses: expenses, netBalance: income - expenses, byCategory }));
});

router.get("/budget-goals", async (_req, res): Promise<void> => {
  const goals = await db.select().from(budgetGoalsTable).orderBy(budgetGoalsTable.createdAt);
  res.json(ListBudgetGoalsResponse.parse(goals));
});

router.post("/budget-goals", async (req, res): Promise<void> => {
  const parsed = CreateBudgetGoalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [goal] = await db.insert(budgetGoalsTable).values(parsed.data).returning();
  res.status(201).json(goal);
});

router.patch("/budget-goals/:id", async (req, res): Promise<void> => {
  const params = UpdateBudgetGoalParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateBudgetGoalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [goal] = await db.update(budgetGoalsTable).set(parsed.data).where(eq(budgetGoalsTable.id, params.data.id)).returning();
  if (!goal) {
    res.status(404).json({ error: "Goal not found" });
    return;
  }
  res.json(UpdateBudgetGoalResponse.parse(goal));
});

router.delete("/budget-goals/:id", async (req, res): Promise<void> => {
  const params = DeleteBudgetGoalParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [g] = await db.delete(budgetGoalsTable).where(eq(budgetGoalsTable.id, params.data.id)).returning();
  if (!g) {
    res.status(404).json({ error: "Goal not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
