import fs from "node:fs";
import path from "node:path";

import type { AppData, Habit, User } from "./types.js";

const defaultData: AppData = {
  users: [],
  habitsByUserId: {}
};

export class Store {
  private readonly filePath: string;
  private readonly memoryFallback = structuredClone(defaultData);
  private canUseFileStorage = true;

  constructor(filePath?: string) {
    this.filePath =
      filePath ??
      path.resolve(process.cwd(), "data", "habitflow-data.json");
    this.ensureFile();
  }

  private ensureFile() {
    try {
      const dirPath = path.dirname(this.filePath);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      if (!fs.existsSync(this.filePath)) {
        fs.writeFileSync(this.filePath, JSON.stringify(defaultData, null, 2), "utf-8");
      }
    } catch {
      // In some deploy targets the filesystem can be unavailable/read-only.
      // Fall back to in-memory storage to keep the service bootable.
      this.canUseFileStorage = false;
    }
  }

  private readData(): AppData {
    if (!this.canUseFileStorage) {
      return structuredClone(this.memoryFallback);
    }

    try {
      const raw = fs.readFileSync(this.filePath, "utf-8");
      return JSON.parse(raw) as AppData;
    } catch {
      this.canUseFileStorage = false;
      return structuredClone(defaultData);
    }
  }

  private writeData(data: AppData) {
    if (!this.canUseFileStorage) {
      this.memoryFallback.users = data.users;
      this.memoryFallback.habitsByUserId = data.habitsByUserId;
      return;
    }

    try {
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), "utf-8");
    } catch {
      this.canUseFileStorage = false;
      this.memoryFallback.users = data.users;
      this.memoryFallback.habitsByUserId = data.habitsByUserId;
    }
  }

  getUserByEmail(email: string): User | undefined {
    const data = this.readData();
    return data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  getUserById(userId: string): User | undefined {
    const data = this.readData();
    return data.users.find((u) => u.id === userId);
  }

  createUser(user: User): User {
    const data = this.readData();
    data.users.push(user);
    data.habitsByUserId[user.id] = [];
    this.writeData(data);
    return user;
  }

  listHabits(userId: string): Habit[] {
    const data = this.readData();
    return data.habitsByUserId[userId] ?? [];
  }

  createHabit(userId: string, habit: Habit): Habit {
    const data = this.readData();
    const habits = data.habitsByUserId[userId] ?? [];
    habits.push(habit);
    data.habitsByUserId[userId] = habits;
    this.writeData(data);
    return habit;
  }

  updateHabit(userId: string, habitId: string, patch: Partial<Habit>): Habit | undefined {
    const data = this.readData();
    const habits = data.habitsByUserId[userId] ?? [];
    const idx = habits.findIndex((h) => h.id === habitId);
    if (idx < 0) return undefined;
    habits[idx] = { ...habits[idx], ...patch };
    data.habitsByUserId[userId] = habits;
    this.writeData(data);
    return habits[idx];
  }

  deleteHabit(userId: string, habitId: string): boolean {
    const data = this.readData();
    const habits = data.habitsByUserId[userId] ?? [];
    const next = habits.filter((h) => h.id !== habitId);
    if (next.length === habits.length) return false;
    data.habitsByUserId[userId] = next;
    this.writeData(data);
    return true;
  }
}
