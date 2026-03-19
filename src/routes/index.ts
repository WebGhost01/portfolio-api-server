import { Router, type IRouter } from "express";
import healthRouter from "./health";
import projectsRouter from "./projects";
import tasksRouter from "./tasks";
import budgetRouter from "./budget";
import medicalRouter from "./medical";
import quizzesRouter from "./quizzes";
import jobsRouter from "./jobs";
import recipesRouter from "./recipes";
import bookmarksRouter from "./bookmarks";
import habitsRouter from "./habits";
import eventsRouter from "./events";
import flashcardsRouter from "./flashcards";
import openaiRouter from "./openai";
import portfolioRouter from "./portfolio";

const router: IRouter = Router();

router.use(healthRouter);
router.use(projectsRouter);
router.use(tasksRouter);
router.use(budgetRouter);
router.use(medicalRouter);
router.use(quizzesRouter);
router.use(jobsRouter);
router.use(recipesRouter);
router.use(bookmarksRouter);
router.use(habitsRouter);
router.use(eventsRouter);
router.use(flashcardsRouter);
router.use(openaiRouter);
router.use(portfolioRouter);

export default router;
