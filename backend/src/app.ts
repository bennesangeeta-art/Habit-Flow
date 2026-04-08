import cors from "cors";
import express from "express";
import { z } from "zod";

import { hashPassword, signToken, verifyPassword, verifyToken } from "./auth.js";
import { analyzeHabit } from "./habitInsight.js";
import { createId } from "./id.js";
import { Store } from "./store.js";

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

const habitSchema = z.object({
  name: z.string().min(1),
  description: z.string().max(250).default(""),
  targetPerWeek: z.number().int().min(1).max(14)
});

type AuthedRequest = express.Request & {
  userId?: string;
};

export function createApp(store = new Store()) {
  const app = express();
  function withInsight(habit: {
    id: string;
    name: string;
    description: string;
    targetPerWeek: number;
    completedDates: string[];
    createdAt: string;
  }) {
    return {
      ...habit,
      insight: analyzeHabit(habit.name, habit.description)
    };
  }

  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok", service: "habitflow-backend" });
  });

  app.post("/auth/register", async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    }

    const { name, email, password } = parsed.data;
    const existing = store.getUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: "Email already in use" });
    }

    const user = store.createUser({
      id: createId("usr"),
      name,
      email: email.toLowerCase(),
      passwordHash: await hashPassword(password),
      createdAt: new Date().toISOString()
    });

    const token = signToken({ userId: user.id, email: user.email, name: user.name });
    return res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email }
    });
  });

  app.post("/auth/login", async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    }

    const { email, password } = parsed.data;
    const user = store.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = signToken({ userId: user.id, email: user.email, name: user.name });
    return res.status(200).json({
      token,
      user: { id: user.id, name: user.name, email: user.email }
    });
  });

  function authMiddleware(req: AuthedRequest, res: express.Response, next: express.NextFunction) {
    const auth = req.header("authorization");
    if (!auth?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid authorization header" });
    }
    try {
      const token = auth.replace("Bearer ", "");
      const payload = verifyToken(token);
      req.userId = payload.userId;
      return next();
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }
  }

  app.get("/me", authMiddleware, (req: AuthedRequest, res) => {
    const user = store.getUserById(req.userId!);
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json({ id: user.id, name: user.name, email: user.email });
  });

  app.get("/habits", authMiddleware, (req: AuthedRequest, res) => {
    const habits = store.listHabits(req.userId!).map(withInsight);
    return res.json({ habits });
  });

  app.post("/habits", authMiddleware, (req: AuthedRequest, res) => {
    const parsed = habitSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    }

    const habit = store.createHabit(req.userId!, {
      id: createId("hab"),
      createdAt: new Date().toISOString(),
      completedDates: [],
      ...parsed.data
    });

    return res.status(201).json({ habit: withInsight(habit) });
  });

  app.put("/habits/:id", authMiddleware, (req: AuthedRequest, res) => {
    const habitId = String(req.params.id);
    const parsed = habitSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    }
    const habit = store.updateHabit(req.userId!, habitId, parsed.data);
    if (!habit) return res.status(404).json({ error: "Habit not found" });
    return res.json({ habit: withInsight(habit) });
  });

  app.delete("/habits/:id", authMiddleware, (req: AuthedRequest, res) => {
    const habitId = String(req.params.id);
    const deleted = store.deleteHabit(req.userId!, habitId);
    if (!deleted) return res.status(404).json({ error: "Habit not found" });
    return res.status(204).send();
  });

  app.post("/habits/:id/toggle", authMiddleware, (req: AuthedRequest, res) => {
    const habitId = String(req.params.id);
    const habits = store.listHabits(req.userId!);
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return res.status(404).json({ error: "Habit not found" });

    const today = new Date().toISOString().slice(0, 10);
    const alreadyDone = habit.completedDates.includes(today);
    const completedDates = alreadyDone
      ? habit.completedDates.filter((d) => d !== today)
      : [...habit.completedDates, today];

    const updated = store.updateHabit(req.userId!, habitId, { completedDates });
    return res.json({ habit: updated ? withInsight(updated) : undefined, completed: !alreadyDone });
  });

  app.get("/stats", authMiddleware, (req: AuthedRequest, res) => {
    const habits = store.listHabits(req.userId!);
    const totalHabits = habits.length;
    const totalCheckIns = habits.reduce((acc, h) => acc + h.completedDates.length, 0);
    const thisWeekStart = new Date();
    thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
    const weekKey = thisWeekStart.toISOString().slice(0, 10);
    const weeklyCheckIns = habits.reduce((acc, h) => {
      return (
        acc + h.completedDates.filter((d) => d >= weekKey).length
      );
    }, 0);

    return res.json({
      totalHabits,
      totalCheckIns,
      weeklyCheckIns
    });
  });

  return app;
}

export const app = createApp();
