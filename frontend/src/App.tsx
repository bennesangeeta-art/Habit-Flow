import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

type User = { id: string; name: string; email: string };
type Habit = {
  id: string;
  name: string;
  description: string;
  targetPerWeek: number;
  completedDates: string[];
  createdAt: string;
  insight: {
    category: "good" | "bad";
    reason: string;
    tips: string[];
  };
};

type Stats = {
  totalHabits: number;
  totalCheckIns: number;
  weeklyCheckIns: number;
};

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:3000";

function App() {
  const [token, setToken] = useState<string>(localStorage.getItem("hf_token") ?? "");
  const [user, setUser] = useState<User | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [habitName, setHabitName] = useState("");
  const [habitDescription, setHabitDescription] = useState("");
  const [targetPerWeek, setTargetPerWeek] = useState(5);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  async function api<T>(path: string, options?: RequestInit): Promise<T> {
    const headers = new Headers(options?.headers);
    headers.set("Content-Type", "application/json");
    if (token) headers.set("Authorization", `Bearer ${token}`);

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error ?? `Request failed: ${response.status}`);
    }

    if (response.status === 204) return {} as T;
    return (await response.json()) as T;
  }

  async function bootstrapAuth() {
    if (!token) return;
    try {
      const me = await api<User>("/me");
      setUser(me);
      await refreshData();
    } catch {
      logout();
    }
  }

  async function refreshData() {
    const [habitData, statsData] = await Promise.all([
      api<{ habits: Habit[] }>("/habits"),
      api<Stats>("/stats")
    ]);
    setHabits(habitData.habits);
    setStats(statsData);
  }

  useEffect(() => {
    void bootstrapAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submitAuth(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const path = mode === "login" ? "/auth/login" : "/auth/register";
      const body =
        mode === "login"
          ? { email, password }
          : { name, email, password };
      const data = await api<{ token: string; user: User }>(path, {
        method: "POST",
        body: JSON.stringify(body)
      });
      localStorage.setItem("hf_token", data.token);
      setToken(data.token);
      setUser(data.user);
      await refreshData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  async function createHabit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api<{ habit: Habit }>("/habits", {
        method: "POST",
        body: JSON.stringify({
          name: habitName,
          description: habitDescription,
          targetPerWeek
        })
      });
      setHabitName("");
      setHabitDescription("");
      setTargetPerWeek(5);
      await refreshData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create habit");
    } finally {
      setLoading(false);
    }
  }

  async function toggleHabit(habitId: string) {
    setLoading(true);
    setError("");
    try {
      await api(`/habits/${habitId}/toggle`, { method: "POST" });
      await refreshData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to toggle habit");
    } finally {
      setLoading(false);
    }
  }

  async function deleteHabit(habitId: string) {
    setLoading(true);
    setError("");
    try {
      await api(`/habits/${habitId}`, { method: "DELETE" });
      await refreshData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete habit");
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("hf_token");
    setToken("");
    setUser(null);
    setHabits([]);
    setStats(null);
  }

  if (!user) {
    return (
      <main className="app">
        <h1>HabitFlow</h1>
        <p className="subtitle">Track habits, streaks, and weekly consistency.</p>
        <form onSubmit={submitAuth} className="card">
          <h2>{mode === "login" ? "Sign in" : "Create account"}</h2>
          {mode === "register" && (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
              required
            />
          )}
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            type="email"
            required
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            type="password"
            minLength={6}
            required
          />
          <button disabled={loading} type="submit">
            {loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
          </button>
          <button
            type="button"
            className="linkButton"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
          >
            {mode === "login" ? "Need an account? Register" : "Have an account? Sign in"}
          </button>
          {error && <p className="error">{error}</p>}
        </form>
      </main>
    );
  }

  return (
    <main className="app">
      <header className="header">
        <div>
          <h1>HabitFlow</h1>
          <p className="subtitle">Welcome, {user.name}</p>
        </div>
        <button onClick={logout}>Logout</button>
      </header>

      {stats && (
        <section className="stats">
          <article className="card">
            <h3>Total habits</h3>
            <strong>{stats.totalHabits}</strong>
          </article>
          <article className="card">
            <h3>Total check-ins</h3>
            <strong>{stats.totalCheckIns}</strong>
          </article>
          <article className="card">
            <h3>This week</h3>
            <strong>{stats.weeklyCheckIns}</strong>
          </article>
        </section>
      )}

      <form onSubmit={createHabit} className="card">
        <h2>Create habit</h2>
        <input
          value={habitName}
          onChange={(e) => setHabitName(e.target.value)}
          placeholder="Habit name"
          required
        />
        <input
          value={habitDescription}
          onChange={(e) => setHabitDescription(e.target.value)}
          placeholder="Description"
        />
        <input
          value={targetPerWeek}
          onChange={(e) => setTargetPerWeek(Number(e.target.value))}
          type="number"
          min={1}
          max={14}
          required
        />
        <button disabled={loading} type="submit">
          Add habit
        </button>
      </form>

      <section className="list">
        {habits.map((habit) => {
          const isDoneToday = habit.completedDates.includes(today);
          return (
            <article key={habit.id} className="card habitItem">
              <div>
                <h3>{habit.name}</h3>
                <p>{habit.description || "No description"}</p>
                <small>
                  Target {habit.targetPerWeek}/week | Check-ins: {habit.completedDates.length}
                </small>
                <p className={habit.insight.category === "bad" ? "badgeBad" : "badgeGood"}>
                  {habit.insight.category === "bad" ? "Bad habit warning" : "Good habit"}
                </p>
                <p>{habit.insight.reason}</p>
                {habit.insight.category === "bad" && (
                  <ul className="tips">
                    {habit.insight.tips.map((tip) => (
                      <li key={tip}>{tip}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="actions">
                <button onClick={() => void toggleHabit(habit.id)}>
                  {isDoneToday ? "Uncheck today" : "Check today"}
                </button>
                <button className="danger" onClick={() => void deleteHabit(habit.id)}>
                  Delete
                </button>
              </div>
            </article>
          );
        })}
        {!habits.length && <p className="subtitle">No habits yet. Add your first habit.</p>}
      </section>

      {error && <p className="error">{error}</p>}
    </main>
  );
}

export default App;
