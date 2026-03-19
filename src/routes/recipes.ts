import { Router, type IRouter } from "express";
import { eq, ilike } from "drizzle-orm";
import { db, recipesTable, mealPlansTable } from "@workspace/db";
import {
  ListRecipesResponse,
  ListRecipesQueryParams,
  CreateRecipeBody,
  GetRecipeParams,
  GetRecipeResponse,
  UpdateRecipeParams,
  UpdateRecipeBody,
  UpdateRecipeResponse,
  DeleteRecipeParams,
  ListMealPlansResponse,
  CreateMealPlanBody,
  DeleteMealPlanParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/recipes", async (req, res): Promise<void> => {
  const qp = ListRecipesQueryParams.safeParse(req.query);
  let recipes;
  if (qp.success && qp.data.search) {
    recipes = await db.select().from(recipesTable).where(ilike(recipesTable.title, `%${qp.data.search}%`)).orderBy(recipesTable.createdAt);
  } else if (qp.success && qp.data.category) {
    recipes = await db.select().from(recipesTable).where(eq(recipesTable.category, qp.data.category)).orderBy(recipesTable.createdAt);
  } else {
    recipes = await db.select().from(recipesTable).orderBy(recipesTable.createdAt);
  }
  res.json(ListRecipesResponse.parse(recipes));
});

router.post("/recipes", async (req, res): Promise<void> => {
  const parsed = CreateRecipeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [recipe] = await db.insert(recipesTable).values(parsed.data).returning();
  res.status(201).json(recipe);
});

router.get("/recipes/:id", async (req, res): Promise<void> => {
  const params = GetRecipeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [recipe] = await db.select().from(recipesTable).where(eq(recipesTable.id, params.data.id));
  if (!recipe) {
    res.status(404).json({ error: "Recipe not found" });
    return;
  }
  res.json(GetRecipeResponse.parse(recipe));
});

router.patch("/recipes/:id", async (req, res): Promise<void> => {
  const params = UpdateRecipeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateRecipeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [recipe] = await db.update(recipesTable).set(parsed.data).where(eq(recipesTable.id, params.data.id)).returning();
  if (!recipe) {
    res.status(404).json({ error: "Recipe not found" });
    return;
  }
  res.json(UpdateRecipeResponse.parse(recipe));
});

router.delete("/recipes/:id", async (req, res): Promise<void> => {
  const params = DeleteRecipeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [r] = await db.delete(recipesTable).where(eq(recipesTable.id, params.data.id)).returning();
  if (!r) {
    res.status(404).json({ error: "Recipe not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/meal-plans", async (_req, res): Promise<void> => {
  const plans = await db.select().from(mealPlansTable).orderBy(mealPlansTable.plannedDate);
  res.json(ListMealPlansResponse.parse(plans));
});

router.post("/meal-plans", async (req, res): Promise<void> => {
  const parsed = CreateMealPlanBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [plan] = await db.insert(mealPlansTable).values(parsed.data).returning();
  res.status(201).json(plan);
});

router.delete("/meal-plans/:id", async (req, res): Promise<void> => {
  const params = DeleteMealPlanParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [p] = await db.delete(mealPlansTable).where(eq(mealPlansTable.id, params.data.id)).returning();
  if (!p) {
    res.status(404).json({ error: "Meal plan not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
