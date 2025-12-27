import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import express from "express";
import { createServer } from "http";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import sharp from "sharp";
import AdmZip from "adm-zip";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

describe("API routes", () => {
  const app = express();
  const server = createServer(app);
  const testDbPath = path.resolve("prisma", "test.db");

  let tagId: string | null = null;
  let itemId: string | null = null;
  let outfitId: string | null = null;
  let testPrisma: PrismaClient;
  let registerRoutes: typeof import("../routes").registerRoutes;

  beforeAll(async () => {
    process.env.BG_REMOVAL_ENABLED = "false";
    process.env.IMAGE_CANVAS_WIDTH = "200";
    process.env.IMAGE_CANVAS_HEIGHT = "300";
    process.env.DATABASE_URL = `file:${testDbPath}`;

    fs.rmSync(testDbPath, { force: true });
    execSync("npx prisma migrate deploy", { stdio: "ignore" });

    testPrisma = new PrismaClient({
      datasources: {
        db: {
          url: `file:${testDbPath}`,
        },
      },
    });

    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    ({ registerRoutes } = await import("../routes"));
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

    const searchRes = await request(app).get(`/api/items?search=${encodeURIComponent("test item")}`);
    expect(searchRes.status).toBe(200);
    expect(searchRes.body.some((item: { id: string }) => item.id === itemId)).toBe(true);

    const updateTagsRes = await request(app)
      .put(`/api/items/${itemId}`)
      .field("tags", "[]");
    expect(updateTagsRes.status).toBe(200);
    expect(updateTagsRes.body.tags).toEqual([]);

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

  it("rejects invalid item and outfit payloads", async () => {
    const badItemRes = await request(app)
      .post("/api/items")
      .field("type", "TOP")
      .field("category", "Shirt")
      .field("color", "Blue");
    expect(badItemRes.status).toBe(400);

    const missingImageRes = await request(app)
      .post("/api/items")
      .field("name", "Missing Image")
      .field("type", "TOP")
      .field("category", "Shirt")
      .field("color", "Blue");
    expect(missingImageRes.status).toBe(400);

    const badOutfitRes = await request(app).post("/api/outfits").send({ name: "No items" });
    expect(badOutfitRes.status).toBe(400);
  });

  it("trims and validates tag names", async () => {
    const emptyRes = await request(app).post("/api/tags").send({ name: "   " });
    expect(emptyRes.status).toBe(400);

    const trimmedName = `Trim Tag ${Date.now()}`;
    const tagRes = await request(app).post("/api/tags").send({ name: `  ${trimmedName}  ` });
    expect(tagRes.status).toBe(200);
    expect(tagRes.body.name).toBe(trimmedName);

    const badUpdateRes = await request(app).put(`/api/tags/${tagRes.body.id}`).send({ name: "" });
    expect(badUpdateRes.status).toBe(400);

    await request(app).delete(`/api/tags/${tagRes.body.id}`);
  });

  it("returns 404s for missing records", async () => {
    const missingId = "00000000-0000-0000-0000-000000000000";

    const missingItemUpdate = await request(app)
      .put(`/api/items/${missingId}`)
      .field("name", "Missing");
    expect(missingItemUpdate.status).toBe(404);

    const missingItemDelete = await request(app).delete(`/api/items/${missingId}`);
    expect(missingItemDelete.status).toBe(404);

    const missingTagUpdate = await request(app).put(`/api/tags/${missingId}`).send({ name: "Missing" });
    expect(missingTagUpdate.status).toBe(404);

    const missingTagDelete = await request(app).delete(`/api/tags/${missingId}`);
    expect(missingTagDelete.status).toBe(404);

    const missingOutfitUpdate = await request(app)
      .put(`/api/outfits/${missingId}`)
      .send({ name: "Missing" });
    expect(missingOutfitUpdate.status).toBe(404);

    const missingOutfitDelete = await request(app).delete(`/api/outfits/${missingId}`);
    expect(missingOutfitDelete.status).toBe(404);
  });

  it("processes bulk imports", async () => {
    const tmpDir = path.resolve("uploads", `import-test-${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });
    const fileOne = path.join(tmpDir, "import-one.png");
    const fileTwo = path.join(tmpDir, "import-two.png");

    await sharp({
      create: {
        width: 300,
        height: 400,
        channels: 4,
        background: { r: 200, g: 60, b: 60, alpha: 1 },
      },
    })
      .png()
      .toFile(fileOne);
    await sharp({
      create: {
        width: 300,
        height: 400,
        channels: 4,
        background: { r: 40, g: 90, b: 180, alpha: 1 },
      },
    })
      .png()
      .toFile(fileTwo);

    const importRes = await request(app)
      .post("/api/imports")
      .field("type", "TOP")
      .field("category", "Imported")
      .field("color", "Red")
      .attach("images", fileOne)
      .attach("images", fileTwo);

    expect(importRes.status).toBe(200);
    expect(importRes.body.total).toBe(2);
    const jobId = importRes.body.id;

    let job = importRes.body;
    for (let i = 0; i < 12; i += 1) {
      if (job.status === "completed") {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
      const statusRes = await request(app).get(`/api/imports/${jobId}`);
      expect(statusRes.status).toBe(200);
      job = statusRes.body;
    }

    expect(job.status).toBe("completed");
    expect(job.completed + job.failed).toBe(job.total);
    expect(job.items.length).toBe(2);

    const itemsRes = await request(app).get("/api/items?search=import-one");
    expect(itemsRes.status).toBe(200);
    const importedItem = itemsRes.body.find((item: any) => item.name === "import-one");
    expect(importedItem).toBeTruthy();
    expect(importedItem.color).toBe("Red");

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("flags duplicate images in imports", async () => {
    const tmpDir = path.resolve("uploads", `import-dup-${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });
    const fileOne = path.join(tmpDir, "dup-one.png");
    const fileTwo = path.join(tmpDir, "dup-two.png");

    await sharp({
      create: {
        width: 300,
        height: 400,
        channels: 4,
        background: { r: 90, g: 90, b: 90, alpha: 1 },
      },
    })
      .png()
      .toFile(fileOne);
    fs.copyFileSync(fileOne, fileTwo);

    const importRes = await request(app)
      .post("/api/imports")
      .field("type", "TOP")
      .field("category", "Imported")
      .field("color", "Gray")
      .attach("images", fileOne)
      .attach("images", fileTwo);

    expect(importRes.status).toBe(200);
    const jobId = importRes.body.id;

    let job = importRes.body;
    for (let i = 0; i < 12; i += 1) {
      if (job.status === "completed") {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
      const statusRes = await request(app).get(`/api/imports/${jobId}`);
      expect(statusRes.status).toBe(200);
      job = statusRes.body;
    }

    expect(job.status).toBe("completed");
    expect(job.failed).toBe(1);
    expect(job.completed).toBe(1);
    const failedItem = job.items.find((item: any) => item.status === "failed");
    expect(failedItem?.error).toBe("Duplicate image detected.");

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("processes CSV + ZIP imports", async () => {
    const tmpDir = path.resolve("uploads", `import-csv-${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });
    const fileOne = path.join(tmpDir, "csv-top.png");
    const fileTwo = path.join(tmpDir, "csv-bottom.png");

    await sharp({
      create: {
        width: 320,
        height: 420,
        channels: 4,
        background: { r: 180, g: 180, b: 180, alpha: 1 },
      },
    })
      .png()
      .toFile(fileOne);
    await sharp({
      create: {
        width: 320,
        height: 420,
        channels: 4,
        background: { r: 40, g: 140, b: 90, alpha: 1 },
      },
    })
      .png()
      .toFile(fileTwo);

    const zipPath = path.join(tmpDir, "import.zip");
    const zip = new AdmZip();
    zip.addLocalFile(fileOne);
    zip.addLocalFile(fileTwo);
    zip.writeZip(zipPath);

    const csvPath = path.join(tmpDir, "import.csv");
    const csvRows = [
      "filename,name,type,category,color",
      "csv-top.png,CSV Tee,TOP,T-Shirt,White",
      "csv-bottom.png,CSV Pants,,Pants,Black",
    ];
    fs.writeFileSync(csvPath, csvRows.join("\n"));

    const importRes = await request(app)
      .post("/api/imports/csv")
      .field("type", "BOTTOM")
      .field("category", "Bottoms")
      .field("color", "Black")
      .attach("csv", csvPath)
      .attach("zip", zipPath);

    expect(importRes.status).toBe(200);
    expect(importRes.body.total).toBe(2);
    const jobId = importRes.body.id;

    let job = importRes.body;
    for (let i = 0; i < 12; i += 1) {
      if (job.status === "completed") {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
      const statusRes = await request(app).get(`/api/imports/${jobId}`);
      expect(statusRes.status).toBe(200);
      job = statusRes.body;
    }

    expect(job.status).toBe("completed");
    expect(job.completed + job.failed).toBe(job.total);
    expect(job.items.length).toBe(2);

    const itemsRes = await request(app).get("/api/items?search=CSV%20Pants");
    expect(itemsRes.status).toBe(200);
    const csvItem = itemsRes.body.find((item: any) => item.name === "CSV Pants");
    expect(csvItem).toBeTruthy();
    expect(csvItem.type).toBe("BOTTOM");
    expect(csvItem.category).toBe("Pants");

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("reports CSV validation errors", async () => {
    const tmpDir = path.resolve("uploads", `import-csv-errors-${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });
    const fileOne = path.join(tmpDir, "csv-valid.png");

    await sharp({
      create: {
        width: 300,
        height: 400,
        channels: 4,
        background: { r: 120, g: 120, b: 120, alpha: 1 },
      },
    })
      .png()
      .toFile(fileOne);

    const zipPath = path.join(tmpDir, "import.zip");
    const zip = new AdmZip();
    zip.addLocalFile(fileOne);
    zip.writeZip(zipPath);

    const csvPath = path.join(tmpDir, "import.csv");
    const csvRows = [
      "filename,name,type,category,color",
      "csv-valid.png,Valid Tee,TOP,T-Shirt,White",
      ",Missing Filename,TOP,T-Shirt,White",
    ];
    fs.writeFileSync(csvPath, csvRows.join("\n"));

    const importRes = await request(app)
      .post("/api/imports/csv")
      .field("type", "TOP")
      .field("category", "Tops")
      .field("color", "White")
      .attach("csv", csvPath)
      .attach("zip", zipPath);

    expect(importRes.status).toBe(200);
    const jobId = importRes.body.id;

    let job = importRes.body;
    for (let i = 0; i < 12; i += 1) {
      if (job.status === "completed") {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
      const statusRes = await request(app).get(`/api/imports/${jobId}`);
      expect(statusRes.status).toBe(200);
      job = statusRes.body;
    }

    expect(job.status).toBe("completed");
    expect(job.failed).toBe(1);
    const failedRow = job.items.find((item: any) => item.status === "failed");
    expect(failedRow?.error).toBe("Missing filename in CSV.");

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
