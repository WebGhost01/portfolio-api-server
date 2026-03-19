import { boolean, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const portfolioProfile = pgTable("portfolio_profile", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().default(""),
  tagline: text("tagline").notNull().default(""),
  email: text("email").notNull().default(""),
  phone: text("phone").notNull().default(""),
  location: text("location").notNull().default(""),
  github: text("github").notNull().default(""),
  linkedin: text("linkedin").notNull().default(""),
  website: text("website").notNull().default(""),
  bio: text("bio").notNull().default(""),
  coverLetter: text("cover_letter").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertPortfolioProfileSchema = createInsertSchema(portfolioProfile).omit({
  id: true,
  updatedAt: true,
});

export type PortfolioProfile = typeof portfolioProfile.$inferSelect;
export type InsertPortfolioProfile = z.infer<typeof insertPortfolioProfileSchema>;

export const portfolioJobs = pgTable("portfolio_jobs", {
  id: serial("id").primaryKey(),
  company: text("company").notNull(),
  title: text("title").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date"),
  description: text("description").notNull().default(""),
  current: boolean("current").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertPortfolioJobSchema = createInsertSchema(portfolioJobs).omit({
  id: true,
  createdAt: true,
});

export type PortfolioJob = typeof portfolioJobs.$inferSelect;
export type InsertPortfolioJob = z.infer<typeof insertPortfolioJobSchema>;
