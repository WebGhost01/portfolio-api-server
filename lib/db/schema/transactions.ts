import { pgTable, text, serial, timestamp, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const transactionsTable = pgTable("transactions", {
  id: serial("id").primaryKey(),
  amount: doublePrecision("amount").notNull(),
  type: text("type").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  date: text("date").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTransactionSchema = createInsertSchema(transactionsTable).omit({ id: true, createdAt: true });
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactionsTable.$inferSelect;

export const budgetGoalsTable = pgTable("budget_goals", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(),
  monthlyLimit: doublePrecision("monthly_limit").notNull(),
  month: text("month").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBudgetGoalSchema = createInsertSchema(budgetGoalsTable).omit({ id: true, createdAt: true });
export type InsertBudgetGoal = z.infer<typeof insertBudgetGoalSchema>;
export type BudgetGoal = typeof budgetGoalsTable.$inferSelect;
