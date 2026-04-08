export type Habit = {
  id: string;
  name: string;
  description: string;
  targetPerWeek: number;
  completedDates: string[];
  createdAt: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
};

export type AppData = {
  users: User[];
  habitsByUserId: Record<string, Habit[]>;
};
