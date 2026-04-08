import request from "supertest";
import { describe, expect, it } from "vitest";

import { app } from "./app.js";

describe("GET /health", () => {
  it("returns service health", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "ok",
      service: "habitflow-backend"
    });
  });
});

describe("Habit insight", () => {
  it("classifies smoking-related habit as bad with tips", async () => {
    const register = await request(app).post("/auth/register").send({
      name: "Insight User",
      email: `insight_${Date.now()}@example.com`,
      password: "password123"
    });

    const token = register.body.token as string;
    const created = await request(app)
      .post("/habits")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Smoking break",
        description: "smoke after lunch",
        targetPerWeek: 7
      });

    expect(created.status).toBe(201);
    expect(created.body.habit.insight.category).toBe("bad");
    expect(created.body.habit.insight.tips.length).toBeGreaterThan(0);
  });
});
