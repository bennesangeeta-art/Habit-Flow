# HabitFlow

Full-stack habit tracker app with authentication, habit management, daily check-ins, and stats.

## Stack

- Frontend: React + Vite + TypeScript
- Backend: Express + TypeScript
- Auth: JWT + bcrypt
- Storage: file-based JSON persistence (`backend/data/habitflow-data.json`)
- Testing: Vitest + Supertest
- Containers: Docker + Docker Compose

## Local development

```bash
npm install
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`

## Build and test

```bash
npm run build
npm test
```

## Docker (one command)

```bash
npm run docker:up
```

- Frontend: `http://localhost:8080`
- Backend: `http://localhost:3000`

Stop:

```bash
npm run docker:down
```

## Deployment configs

- `render.yaml` for backend deployment on Render
- `frontend/vercel.json` for frontend deployment on Vercel

Set `JWT_SECRET` in production before deploying backend.
