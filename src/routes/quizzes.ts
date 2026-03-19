import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, quizzesTable, quizQuestionsTable, quizAttemptsTable } from "@workspace/db";
import {
  ListQuizzesResponse,
  CreateQuizBody,
  GetQuizParams,
  GetQuizResponse,
  UpdateQuizParams,
  UpdateQuizBody,
  UpdateQuizResponse,
  DeleteQuizParams,
  CreateQuizQuestionBody,
  DeleteQuizQuestionParams,
  ListQuizAttemptsParams,
  ListQuizAttemptsResponse,
  SubmitQuizAttemptBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/quizzes", async (_req, res): Promise<void> => {
  const quizzes = await db.select().from(quizzesTable).orderBy(quizzesTable.createdAt);
  const withCounts = await Promise.all(quizzes.map(async (quiz) => {
    const questions = await db.select().from(quizQuestionsTable).where(eq(quizQuestionsTable.quizId, quiz.id));
    return { ...quiz, questionCount: questions.length };
  }));
  res.json(ListQuizzesResponse.parse(withCounts));
});

router.post("/quizzes", async (req, res): Promise<void> => {
  const parsed = CreateQuizBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [quiz] = await db.insert(quizzesTable).values(parsed.data).returning();
  res.status(201).json({ ...quiz, questionCount: 0 });
});

router.get("/quizzes/:id", async (req, res): Promise<void> => {
  const params = GetQuizParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [quiz] = await db.select().from(quizzesTable).where(eq(quizzesTable.id, params.data.id));
  if (!quiz) {
    res.status(404).json({ error: "Quiz not found" });
    return;
  }
  const questions = await db.select().from(quizQuestionsTable).where(eq(quizQuestionsTable.quizId, quiz.id));
  res.json(GetQuizResponse.parse({ ...quiz, questionCount: questions.length, questions }));
});

router.patch("/quizzes/:id", async (req, res): Promise<void> => {
  const params = UpdateQuizParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateQuizBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [quiz] = await db.update(quizzesTable).set(parsed.data).where(eq(quizzesTable.id, params.data.id)).returning();
  if (!quiz) {
    res.status(404).json({ error: "Quiz not found" });
    return;
  }
  const questions = await db.select().from(quizQuestionsTable).where(eq(quizQuestionsTable.quizId, quiz.id));
  res.json(UpdateQuizResponse.parse({ ...quiz, questionCount: questions.length }));
});

router.delete("/quizzes/:id", async (req, res): Promise<void> => {
  const params = DeleteQuizParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(quizQuestionsTable).where(eq(quizQuestionsTable.quizId, params.data.id));
  const [quiz] = await db.delete(quizzesTable).where(eq(quizzesTable.id, params.data.id)).returning();
  if (!quiz) {
    res.status(404).json({ error: "Quiz not found" });
    return;
  }
  res.sendStatus(204);
});

router.post("/quiz-questions", async (req, res): Promise<void> => {
  const parsed = CreateQuizQuestionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [question] = await db.insert(quizQuestionsTable).values(parsed.data).returning();
  res.status(201).json(question);
});

router.delete("/quiz-questions/:id", async (req, res): Promise<void> => {
  const params = DeleteQuizQuestionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [q] = await db.delete(quizQuestionsTable).where(eq(quizQuestionsTable.id, params.data.id)).returning();
  if (!q) {
    res.status(404).json({ error: "Question not found" });
    return;
  }
  res.sendStatus(204);
});

router.post("/quiz-attempts", async (req, res): Promise<void> => {
  const parsed = SubmitQuizAttemptBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { quizId, answers } = parsed.data;
  const questions = await db.select().from(quizQuestionsTable).where(eq(quizQuestionsTable.quizId, quizId));
  let correct = 0;
  for (const answer of answers) {
    const question = questions.find(q => q.id === answer.questionId);
    if (question && question.correctAnswer === answer.selectedAnswer) correct++;
  }
  const percentage = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
  const [attempt] = await db.insert(quizAttemptsTable).values({
    quizId,
    score: correct,
    totalQuestions: questions.length,
    percentage,
  }).returning();
  res.status(201).json(attempt);
});

router.get("/quiz-attempts/:quizId", async (req, res): Promise<void> => {
  const params = ListQuizAttemptsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const attempts = await db.select().from(quizAttemptsTable).where(eq(quizAttemptsTable.quizId, params.data.quizId)).orderBy(quizAttemptsTable.createdAt);
  res.json(ListQuizAttemptsResponse.parse(attempts));
});

export default router;
