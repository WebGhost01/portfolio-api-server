import { Router } from "express";
import { db } from "@workspace/db";
import { conversations, messages } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import { generateImageBuffer } from "@workspace/integrations-openai-ai-server/image";

const router = Router();

router.get("/openai/conversations", async (_req, res) => {
  const result = await db
    .select()
    .from(conversations)
    .orderBy(desc(conversations.createdAt));
  res.json(result);
});

router.post("/openai/conversations", async (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: "title is required" });
  const [conv] = await db.insert(conversations).values({ title }).returning();
  res.status(201).json(conv);
});

router.get("/openai/conversations/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [conv] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, id));
  if (!conv) return res.status(404).json({ error: "Not found" });
  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(messages.createdAt);
  res.json({ ...conv, messages: msgs });
});

router.delete("/openai/conversations/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [deleted] = await db
    .delete(conversations)
    .where(eq(conversations.id, id))
    .returning();
  if (!deleted) return res.status(404).json({ error: "Not found" });
  res.status(204).end();
});

router.get("/openai/conversations/:id/messages", async (req, res) => {
  const id = parseInt(req.params.id);
  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(messages.createdAt);
  res.json(msgs);
});

router.post("/openai/conversations/:id/messages", async (req, res) => {
  const id = parseInt(req.params.id);
  const { content, systemPrompt } = req.body;
  if (!content) return res.status(400).json({ error: "content is required" });

  const [conv] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, id));
  if (!conv) return res.status(404).json({ error: "Not found" });

  const history = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(messages.createdAt);

  await db
    .insert(messages)
    .values({ conversationId: id, role: "user", content });

  const sysMsg = systemPrompt || "You are a helpful, knowledgeable AI assistant. Be concise but thorough. Format responses with markdown when helpful.";

  const chatMessages = [
    { role: "system" as const, content: sysMsg },
    ...history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content },
  ];

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let fullResponse = "";

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 8192,
      messages: chatMessages,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        fullResponse += delta;
        res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
      }
    }

    await db.insert(messages).values({
      conversationId: id,
      role: "assistant",
      content: fullResponse,
    });

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  } catch (err) {
    console.error("OpenAI error:", err);
    res.write(`data: ${JSON.stringify({ error: "AI request failed" })}\n\n`);
  }

  res.end();
});

router.post("/openai/generate-image", async (req, res) => {
  const { prompt, size = "1024x1024" } = req.body;
  if (!prompt) return res.status(400).json({ error: "prompt is required" });
  try {
    const buffer = await generateImageBuffer(prompt, size as "1024x1024" | "512x512" | "256x256");
    res.json({ b64_json: buffer.toString("base64") });
  } catch (err) {
    console.error("Image generation error:", err);
    res.status(500).json({ error: "Image generation failed" });
  }
});

export default router;
