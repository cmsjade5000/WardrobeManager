import fs from "fs";
import path from "path";
import express from "express";
import { createServer } from "http";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { registerRoutes } from "../routes";

describe("API routes", () => {
  const app = express();
  const server = createServer(app);
  const testDbPath = path.resolve("prisma", "test.db");

  let tagId: string | null = null;
  let itemId: string | null = null;
  let outfitId: string | null = null;
  let testPrisma: PrismaClient;

  beforeAll(async () => {
    fs.rmSync(testDbPath, { force: true });
    fs.copyFileSync(path.resolve("prisma", "dev.db"), testDbPath);

    testPrisma = new PrismaClient({
      datasources: {
        db: {
          url: `file:${testDbPath}`,
        },
      },
    });

    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    await registerRoutes(server, app, testPrisma);
  });

  afterAll(async () => {
    if (outfitId) {
      await request(app).delete(`/api/outfits/${outfitId}`);
    }
    if (itemId) {
      await request(app).delete(`/api/items/${itemId}`);
    }
    if (tagId) {
      await request(app).delete(`/api/tags/${tagId}`);
    }
    await testPrisma.$disconnect();
    fs.rmSync(testDbPath, { force: true });
  });

  it("returns health status", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("creates and fetches tags, items, and outfits", async () => {
    const tagName = `Test Tag ${Date.now()}`;
    const tagRes = await request(app).post("/api/tags").send({ name: tagName });
    expect(tagRes.status).toBe(200);
    tagId = tagRes.body.id;
    expect(tagRes.body.name).toBe(tagName);

    if (!tagId) {
      throw new Error("Tag creation failed");
    }

    const itemName = `Test Item ${Date.now()}`;
    const itemRes = await request(app)
      .post("/api/items")
      .field("name", itemName)
      .field("type", "TOP")
      .field("category", "Shirt")
      .field("color", "Blue")
      .field("imageUrl", "https://example.com/test.jpg")
      .field("tags", JSON.stringify([tagId]));
    expect(itemRes.status).toBe(200);
    itemId = itemRes.body.id;
    expect(itemRes.body.name).toBe(itemName);
    expect(itemRes.body.tags).toContain(tagId);

    if (!itemId) {
      throw new Error("Item creation failed");
    }

    const getItemRes = await request(app).get(`/api/items/${itemId}`);
    expect(getItemRes.status).toBe(200);
    expect(getItemRes.body.id).toBe(itemId);

    const outfitName = `Test Outfit ${Date.now()}`;
    const outfitRes = await request(app).post("/api/outfits").send({
      name: outfitName,
      notes: "Test notes",
      items: [{ itemId, position: 0 }],
    });
    expect(outfitRes.status).toBe(200);
    outfitId = outfitRes.body.id;
    expect(outfitId).toBeTruthy();

    if (!outfitId) {
      throw new Error("Outfit creation failed");
    }

    const getOutfitRes = await request(app).get(`/api/outfits/${outfitId}`);
    expect(getOutfitRes.status).toBe(200);
    expect(getOutfitRes.body.id).toBe(outfitId);
  });
});
