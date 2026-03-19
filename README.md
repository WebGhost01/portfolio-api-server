# Portfolio API Server

Shared Express.js REST API powering all portfolio apps.

## Stack
Node.js · TypeScript · Express 5 · PostgreSQL · Drizzle ORM · Zod · OpenAI

## Run
```bash
npm install
DATABASE_URL=... npm run dev
```

## Routes
- `/api/health` · `/api/projects` · `/api/tasks` · `/api/transactions`
- `/api/budgets` · `/api/medical-records` · `/api/medications`
- `/api/quizzes` · `/api/recipes` · `/api/jobs` · `/api/bookmarks`
- `/api/habits` · `/api/events` · `/api/flashcards`
- `/api/openai/conversations` (streaming GPT-5.2)
- `/api/portfolio/profile` · `/api/portfolio/jobs`