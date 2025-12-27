import type { Express, Request, Response } from "express";
import type { Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import { PrismaClient } from "@prisma/client";
import sharp from "sharp";
import { randomUUID } from "crypto";
import AdmZip from "adm-zip";
import Papa, { type ParseError, type ParseResult } from "papaparse";

export const prisma = new PrismaClient();

const BACKGROUND_REMOVAL_ENABLED = process.env.BG_REMOVAL_ENABLED !== "false";
const BACKGROUND_REMOVAL_MODEL =
  process.env.BG_REMOVAL_MODEL === "medium" || process.env.BG_REMOVAL_MODEL === "large"
    ? process.env.BG_REMOVAL_MODEL
    : "small";
const STANDARD_CANVAS_WIDTH = Number.parseInt(process.env.IMAGE_CANVAS_WIDTH ?? "", 10) || 900;
const STANDARD_CANVAS_HEIGHT = Number.parseInt(process.env.IMAGE_CANVAS_HEIGHT ?? "", 10) || 1200;
const STANDARD_BRIGHTNESS = Number.parseFloat(process.env.IMAGE_BRIGHTNESS ?? "") || 1.03;
const STANDARD_SATURATION = Number.parseFloat(process.env.IMAGE_SATURATION ?? "") || 1.05;
const STANDARD_BG_TOP = process.env.IMAGE_BACKGROUND_TOP || "#f2f4f7";
const STANDARD_BG_BOTTOM = process.env.IMAGE_BACKGROUND_BOTTOM || "#dfe5ec";

type BackgroundRemovalModule = typeof import("@imgly/background-removal-node");
let backgroundRemovalModule: BackgroundRemovalModule | null = null;

const loadBackgroundRemoval = async (): Promise<BackgroundRemovalModule> => {
  if (!backgroundRemovalModule) {
    backgroundRemovalModule = await import("@imgly/background-removal-node");
  }
  return backgroundRemovalModule;
};

const removeBackgroundFromFile = async (filePath: string): Promise<string | null> => {
  if (!BACKGROUND_REMOVAL_ENABLED) {
    return null;
  }

  try {
    const resolvedPath = path.resolve(filePath);
    const { removeBackground } = await loadBackgroundRemoval();
    const publicPath = `file://${path.resolve("node_modules/@imgly/background-removal-node/dist/")}/`;
    let input: Blob | string = resolvedPath;

    try {
      // Normalize EXIF orientation and transcode to PNG for consistent decoding.
      const normalizedBuffer = await sharp(resolvedPath).rotate().png().toBuffer();
      input = new Blob([normalizedBuffer], { type: "image/png" });
    } catch (error) {
      console.warn("Background removal: failed to normalize orientation", error);
    }

    const result = await removeBackground(input, {
      publicPath,
      model: BACKGROUND_REMOVAL_MODEL,
      output: { format: "image/png" },
    });
    const buffer = Buffer.from(await result.arrayBuffer());
    const { dir, name } = path.parse(resolvedPath);
    const outputFilename = `${name}-cutout.png`;
    const outputPath = path.join(dir, outputFilename);

    await fs.promises.writeFile(outputPath, buffer);
    return `/uploads/${outputFilename}`;
  } catch (error) {
    console.error("Background removal failed:", error);
    return null;
  }
};

type StandardizeOptions = {
  trimTransparent?: boolean;
};

const resolveUploadPath = (imageUrl: string): string => {
  return path.resolve(imageUrl.replace(/^\//, ""));
};

const standardizeImage = async (
  filePath: string,
  { trimTransparent }: StandardizeOptions = {}
): Promise<string> => {
  const resolvedPath = path.resolve(filePath);
  const { dir, name } = path.parse(resolvedPath);
  const outputFilename = `${name}-standard.png`;
  const outputPath = path.join(dir, outputFilename);

  let pipeline = sharp(resolvedPath).rotate();
  if (trimTransparent) {
    pipeline = pipeline.trim();
  }

  const standardizedBuffer = await pipeline
    .modulate({ brightness: STANDARD_BRIGHTNESS, saturation: STANDARD_SATURATION })
    .resize(STANDARD_CANVAS_WIDTH, STANDARD_CANVAS_HEIGHT, {
      fit: "contain",
      position: "center",
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    })
    .png()
    .toBuffer();

  const gradientSvg = `
    <svg width="${STANDARD_CANVAS_WIDTH}" height="${STANDARD_CANVAS_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${STANDARD_BG_TOP}" />
          <stop offset="100%" stop-color="${STANDARD_BG_BOTTOM}" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)" />
    </svg>
  `;

  const backgroundBuffer = await sharp(Buffer.from(gradientSvg))
    .png()
    .toBuffer();
  const compositedBuffer = await sharp(backgroundBuffer)
    .composite([{ input: standardizedBuffer }])
    .png()
    .toBuffer();

  await fs.promises.writeFile(outputPath, compositedBuffer);
  return `/uploads/${outputFilename}`;
};

const processUploadedImage = async (filePath: string): Promise<string> => {
  const originalUrl = `/uploads/${path.basename(filePath)}`;
  const cutoutUrl = await removeBackgroundFromFile(filePath);
  const sourceUrl = cutoutUrl || originalUrl;
  const sourcePath = cutoutUrl ? resolveUploadPath(cutoutUrl) : filePath;

  try {
    return await standardizeImage(sourcePath, { trimTransparent: Boolean(cutoutUrl) });
  } catch (error) {
    console.error("Image standardization failed:", error);
    return sourceUrl;
  }
};

type AiRequestBody = {
  prompt?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
};

type OpenAIChatResponse = {
  choices?: { message?: { content?: string } }[];
};

// Multer Configuration
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = "uploads/";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `item-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPG, PNG, and WebP are allowed."));
    }
  },
});

const importUpload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedMimes = new Set([
      "text/csv",
      "application/vnd.ms-excel",
      "application/zip",
      "application/x-zip-compressed",
    ]);
    const allowedExts = new Set([".csv", ".zip"]);
    if (allowedMimes.has(file.mimetype) || allowedExts.has(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only CSV and ZIP are allowed."));
    }
  },
});

export async function registerRoutes(
  httpServer: Server,
  app: Express,
  prismaClient: PrismaClient = prisma
): Promise<Server> {
  type ImportJobStatus = "queued" | "processing" | "completed";
  type ImportItemStatus = "queued" | "processing" | "completed" | "failed";
  type ImportItemPayload = {
    name: string;
    type: string;
    category: string;
    color: string;
    brand?: string;
    size?: string;
    material?: string;
    notes?: string;
    tags: string[];
  };
  type ImportJobItem = {
    id: string;
    filename: string;
    status: ImportItemStatus;
    itemId?: string;
    imageUrl?: string;
    error?: string;
    filePath?: string;
    payload: ImportItemPayload;
  };
  type ImportJob = {
    id: string;
    status: ImportJobStatus;
    total: number;
    completed: number;
    failed: number;
    items: ImportJobItem[];
    defaults: {
      type: string;
      category: string;
      color: string;
      brand?: string;
      size?: string;
      material?: string;
      notes?: string;
      tags: string[];
    };
    createdAt: string;
  };

  const importJobs = new Map<string, ImportJob>();
  const importQueue: string[] = [];
  let importQueueRunning = false;

  const serializeImportJob = (job: ImportJob) => ({
    ...job,
    items: job.items.map(({ filePath: _filePath, payload: _payload, ...item }) => item),
  });

  const resolveTagIds = async (names: string[], cache: Map<string, string>) => {
    const trimmed = names.map((name) => name.trim()).filter(Boolean);
    if (!trimmed.length) {
      return [];
    }

    const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const idCandidates = Array.from(new Set(trimmed.filter((name) => uuidLike.test(name))));
    if (idCandidates.length) {
      const byId = await prismaClient.tag.findMany({
        where: { id: { in: idCandidates } },
      });
      for (const tag of byId) {
        cache.set(tag.id, tag.id);
      }
    }

    const missing = Array.from(
      new Set(trimmed.filter((name) => !cache.has(name) && !uuidLike.test(name)))
    );
    if (missing.length) {
      const existing = await prismaClient.tag.findMany({
        where: { name: { in: missing } },
      });
      for (const tag of existing) {
        cache.set(tag.name, tag.id);
      }
      const existingNames = new Set(existing.map((tag) => tag.name));
      for (const name of missing) {
        if (!existingNames.has(name)) {
          const created = await prismaClient.tag.create({ data: { name } });
          cache.set(name, created.id);
        }
      }
    }

    return trimmed
      .map((name) => cache.get(name))
      .filter((id): id is string => Boolean(id));
  };

  const processImportJob = async (job: ImportJob) => {
    job.status = "processing";
    const tagCache = new Map<string, string>();
    for (const item of job.items) {
      if (item.status === "failed") {
        continue;
      }
      if (!item.filePath) {
        item.status = "failed";
        item.error = "Missing file for import.";
        job.failed += 1;
        continue;
      }
      item.status = "processing";
      try {
        const imageUrl = await processUploadedImage(item.filePath);
        const tagIds = await resolveTagIds(item.payload.tags, tagCache);
        const created = await prismaClient.item.create({
          data: {
            name: item.payload.name,
            type: item.payload.type,
            category: item.payload.category,
            color: item.payload.color,
            imageUrl,
            brand: item.payload.brand,
            size: item.payload.size,
            material: item.payload.material,
            notes: item.payload.notes,
            tags: tagIds.length
              ? {
                  create: tagIds.map((tagId) => ({
                    tag: { connect: { id: tagId } },
                  })),
                }
              : undefined,
          },
        });
        item.status = "completed";
        item.itemId = created.id;
        item.imageUrl = imageUrl;
        job.completed += 1;
      } catch (error) {
        item.status = "failed";
        item.error = error instanceof Error ? error.message : "Unknown error";
        job.failed += 1;
      }
    }
    job.status = "completed";
  };

  const runImportQueue = async () => {
    if (importQueueRunning) {
      return;
    }
    importQueueRunning = true;
    while (importQueue.length) {
      const jobId = importQueue.shift();
      if (!jobId) {
        continue;
      }
      const job = importJobs.get(jobId);
      if (!job) {
        continue;
      }
      await processImportJob(job);
    }
    importQueueRunning = false;
  };

  const enqueueImportJob = (job: ImportJob) => {
    importJobs.set(job.id, job);
    importQueue.push(job.id);
    void runImportQueue();
  };

  // Health Check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // AI Prompt
  app.post(
    "/api/ai",
    async (
      req: Request<Record<string, never>, Record<string, never>, AiRequestBody>,
      res: Response
    ) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "OPENAI_API_KEY is not set" });
    }

    const prompt = req.body?.prompt?.trim();
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const model = req.body?.model || "gpt-4o-mini";
    const temperature = typeof req.body?.temperature === "number" ? req.body.temperature : 0.2;
    const maxTokens = typeof req.body?.maxTokens === "number" ? req.body.maxTokens : 256;

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature,
          max_tokens: maxTokens,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return res.status(response.status).json({
          error: "OpenAI request failed",
          details: errorText,
        });
      }

      const data = (await response.json()) as OpenAIChatResponse;
      const content = data.choices?.[0]?.message?.content ?? "";

      return res.json({ content });
    } catch (error) {
      console.error("OpenAI request error:", error);
      return res.status(500).json({ error: "Failed to reach OpenAI" });
    }
  });

  // --- Items ---

  // List Items (with filters)
  app.get("/api/items", async (req, res) => {
    const { type, category, tag, search, color } = req.query;

    const where: any = {};

    if (type && type !== 'ALL') where.type = String(type);
    if (category) where.category = { contains: String(category) };
    if (color && color !== 'ALL') where.color = { contains: String(color) };
    if (search) {
      where.OR = [
        { name: { contains: String(search) } },
        { category: { contains: String(search) } },
        { brand: { contains: String(search) } }
      ];
    }
    
    if (tag && tag !== 'ALL') {
      where.tags = {
        some: {
          tagId: String(tag)
        }
      };
    }

    try {
      const items = await prismaClient.item.findMany({
        where,
        include: {
          tags: {
            include: {
              tag: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Transform for frontend (flatten tags)
      const formattedItems = items.map(item => ({
        ...item,
        tags: item.tags.map(t => t.tag.id) // Return array of Tag IDs
      }));

      res.json(formattedItems);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch items" });
    }
  });

  // Get Item
  app.get("/api/items/:id", async (req, res) => {
    try {
      const item = await prismaClient.item.findUnique({
        where: { id: req.params.id },
        include: {
          tags: { include: { tag: true } }
        }
      });
      if (!item) return res.status(404).json({ error: "Item not found" });
      
      res.json({
        ...item,
        tags: item.tags.map(t => t.tag.id)
      });
    } catch (_error) {
      res.status(500).json({ error: "Failed to fetch item" });
    }
  });

  // Create Item (Multipart)
  app.post("/api/items", upload.single('image'), async (req, res) => {
    try {
      if (!req.file && !req.body.imageUrl) {
         // Allow external URLs if provided, but prioritize file
      }

      const { name, type, category, color, brand, size, material, notes, tags } = req.body;
      let imageUrl = req.body.imageUrl;

      if (req.file) {
        imageUrl = await processUploadedImage(req.file.path);
      }

      // Parse tags (might come as stringified JSON array or individual fields depending on how frontend sends it)
      // Frontend using FormData usually sends arrays as repeated keys or stringified
      let tagIds: string[] = [];
      if (tags) {
        if (Array.isArray(tags)) tagIds = tags;
        else if (typeof tags === 'string') {
          try {
             // Try parsing JSON if it looks like it
             if (tags.startsWith('[')) tagIds = JSON.parse(tags);
             else tagIds = [tags];
          } catch {
             tagIds = [tags];
          }
        }
      }

      const item = await prismaClient.item.create({
        data: {
          name,
          type,
          category,
          color,
          imageUrl: imageUrl || '',
          brand,
          size,
          material,
          notes,
          tags: {
            create: tagIds.map(tagId => ({
              tag: { connect: { id: tagId } }
            }))
          }
        },
        include: {
          tags: { include: { tag: true } }
        }
      });

      res.json({
        ...item,
        tags: item.tags.map(t => t.tag.id)
      });
    } catch (error) {
      console.error("Create item error:", error);
      res.status(500).json({ error: "Failed to create item" });
    }
  });

  // Update Item (with multipart support for image replacement)
  app.put("/api/items/:id", upload.single('image'), async (req, res) => {
    try {
      const { name, type, category, color, imageUrl, brand, size, material, notes, tags } = req.body;
      
      // Handle image: prefer uploaded file, then URL
      let finalImageUrl = imageUrl;
      if (req.file) {
        finalImageUrl = await processUploadedImage(req.file.path);
      }

      // Parse tags if provided
      let tagIds: string[] = [];
      if (tags) {
        try {
          if (tags.startsWith('[')) tagIds = JSON.parse(tags);
          else tagIds = [tags];
        } catch {
          tagIds = [tags];
        }
      }

      const updateData: any = {};
      if (name) updateData.name = name;
      if (type) updateData.type = type;
      if (category) updateData.category = category;
      if (color) updateData.color = color;
      if (finalImageUrl) updateData.imageUrl = finalImageUrl;
      if (brand !== undefined) updateData.brand = brand;
      if (size !== undefined) updateData.size = size;
      if (material !== undefined) updateData.material = material;
      if (notes !== undefined) updateData.notes = notes;
      
      // Update with tags if provided
      if (tagIds.length > 0) {
        updateData.tags = {
          deleteMany: {},
          create: tagIds.map((tagId: string) => ({
            tag: { connect: { id: tagId } }
          }))
        };
      }

      const item = await prismaClient.item.update({
        where: { id: req.params.id },
        data: updateData,
        include: { tags: { include: { tag: true } } }
      });
      
      res.json({ ...item, tags: item.tags.map(t => t.tag.id) });
    } catch (error) {
      console.error("Update item error:", error);
      res.status(500).json({ error: "Failed to update item" });
    }
  });

  // Delete Item
  app.delete("/api/items/:id", async (req, res) => {
    try {
      await prismaClient.item.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (_error) {
      res.status(500).json({ error: "Failed to delete item" });
    }
  });

  // --- Imports ---

  app.post("/api/imports", upload.array("images", 25), async (req, res) => {
    try {
      const files = Array.isArray(req.files) ? req.files : [];
      const { type, category, color, brand, size, material, notes, tags } = req.body;

      if (!files.length) {
        return res.status(400).json({ error: "No images uploaded" });
      }
      if (!type || !category || !color) {
        return res.status(400).json({ error: "Type, category, and color are required" });
      }

      let tagIds: string[] = [];
      if (tags) {
        if (Array.isArray(tags)) tagIds = tags;
        else if (typeof tags === "string") {
          try {
            if (tags.startsWith("[")) tagIds = JSON.parse(tags);
            else tagIds = [tags];
          } catch {
            tagIds = [tags];
          }
        }
      }

      const defaults = {
        type,
        category,
        color,
        brand,
        size,
        material,
        notes,
        tags: tagIds,
      };

      const job: ImportJob = {
        id: randomUUID(),
        status: "queued",
        total: files.length,
        completed: 0,
        failed: 0,
        items: files.map((file) => ({
          id: randomUUID(),
          filename: file.originalname,
          status: "queued",
          filePath: file.path,
          payload: {
            name: path.parse(file.originalname).name || "Imported item",
            type: defaults.type,
            category: defaults.category,
            color: defaults.color,
            brand: defaults.brand,
            size: defaults.size,
            material: defaults.material,
            notes: defaults.notes,
            tags: defaults.tags,
          },
        })),
        defaults,
        createdAt: new Date().toISOString(),
      };

      enqueueImportJob(job);
      return res.json(serializeImportJob(job));
    } catch (error) {
      console.error("Create import job error:", error);
      return res.status(500).json({ error: "Failed to start import" });
    }
  });

  app.post(
    "/api/imports/csv",
    importUpload.fields([
      { name: "csv", maxCount: 1 },
      { name: "zip", maxCount: 1 },
    ]),
    async (req, res) => {
      const fileMap = req.files as Record<string, Express.Multer.File[]>;
      const csvFile = fileMap?.csv?.[0];
      const zipFile = fileMap?.zip?.[0];

      if (!csvFile || !zipFile) {
        return res.status(400).json({ error: "CSV and ZIP files are required" });
      }

      const { type, category, color, brand, size, material, notes, tags } = req.body;
      const defaults = {
        type: typeof type === "string" ? type.trim() : "",
        category: typeof category === "string" ? category.trim() : "",
        color: typeof color === "string" ? color.trim() : "",
        brand: typeof brand === "string" ? brand.trim() : undefined,
        size: typeof size === "string" ? size.trim() : undefined,
        material: typeof material === "string" ? material.trim() : undefined,
        notes: typeof notes === "string" ? notes.trim() : undefined,
        tags: [] as string[],
      };

      if (tags) {
        if (Array.isArray(tags)) defaults.tags = tags;
        else if (typeof tags === "string") {
          try {
            if (tags.startsWith("[")) defaults.tags = JSON.parse(tags);
            else defaults.tags = [tags];
          } catch {
            defaults.tags = [tags];
          }
        }
      }

      try {
        const csvContent = await fs.promises.readFile(csvFile.path, "utf8");
        const parsed: ParseResult<Record<string, string>> = Papa.parse(csvContent, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header: string) => header.trim().toLowerCase(),
        });

        if (parsed.errors.length) {
          return res.status(400).json({
            error: "CSV parse failed",
            details: parsed.errors.map((err: ParseError) => err.message),
          });
        }

        const rows = parsed.data.filter((row: Record<string, string>) => Object.keys(row).length > 0);
        if (!rows.length) {
          return res.status(400).json({ error: "CSV contains no data rows" });
        }

        const zip = new AdmZip(zipFile.path);
        const entries = zip.getEntries().filter((entry: AdmZip.IZipEntry) => !entry.isDirectory);
        if (!entries.length) {
          return res.status(400).json({ error: "ZIP contains no files" });
        }

        const entryByName = new Map<string, AdmZip.IZipEntry>();
        const entryByBase = new Map<string, AdmZip.IZipEntry>();
        for (const entry of entries) {
          const entryName = path.basename(entry.entryName);
          const lowerName = entryName.toLowerCase();
          if (!entryByName.has(lowerName)) {
            entryByName.set(lowerName, entry);
          }
          const baseName = path.parse(entryName).name.toLowerCase();
          if (!entryByBase.has(baseName)) {
            entryByBase.set(baseName, entry);
          }
        }

        if (!fs.existsSync("uploads")) {
          fs.mkdirSync("uploads");
        }

        const jobId = randomUUID();
        let failed = 0;
        const items: ImportJobItem[] = [];

        for (let index = 0; index < rows.length; index += 1) {
          const row = rows[index];
          const filename = (row.filename || row.file || row.image || "").trim();
          const displayName =
            (row.name || "").trim() ||
            (filename ? path.parse(filename).name : "") ||
            `Imported item ${index + 1}`;
          const itemType = (row.type || "").trim() || defaults.type;
          const itemCategory = (row.category || "").trim() || defaults.category;
          const itemColor = (row.color || "").trim() || defaults.color;
          const itemBrand = (row.brand || "").trim() || defaults.brand;
          const itemSize = (row.size || "").trim() || defaults.size;
          const itemMaterial = (row.material || "").trim() || defaults.material;
          const itemNotes = (row.notes || "").trim() || defaults.notes;
          const itemTags = (row.tags || "").trim()
            ? row.tags.split(",").map((tag: string) => tag.trim()).filter(Boolean)
            : defaults.tags;

          let status: ImportItemStatus = "queued";
          let error: string | undefined;
          let filePath: string | undefined;

          if (!filename) {
            status = "failed";
            error = "Missing filename in CSV.";
            failed += 1;
          } else if (!itemType || !itemCategory || !itemColor) {
            status = "failed";
            error = "Missing type, category, or color for this row.";
            failed += 1;
          } else {
            const match =
              entryByName.get(filename.toLowerCase()) ||
              entryByBase.get(path.parse(filename).name.toLowerCase());
            if (!match) {
              status = "failed";
              error = "File not found in ZIP.";
              failed += 1;
            } else {
              const buffer = match.getData();
              const ext = path.extname(match.entryName) || ".jpg";
              const outputFilename = `import-${jobId}-${index}${ext.toLowerCase()}`;
              const outputPath = path.join("uploads", outputFilename);
              await fs.promises.writeFile(outputPath, buffer);
              filePath = outputPath;
            }
          }

          items.push({
            id: randomUUID(),
            filename: filename || displayName,
            status,
            error,
            filePath,
            payload: {
              name: displayName,
              type: itemType,
              category: itemCategory,
              color: itemColor,
              brand: itemBrand,
              size: itemSize,
              material: itemMaterial,
              notes: itemNotes,
              tags: itemTags,
            },
          });
        }

        const job: ImportJob = {
          id: jobId,
          status: "queued",
          total: items.length,
          completed: 0,
          failed,
          items,
          defaults,
          createdAt: new Date().toISOString(),
        };

        enqueueImportJob(job);
        return res.json(serializeImportJob(job));
      } catch (error) {
        console.error("CSV import error:", error);
        return res.status(500).json({ error: "Failed to start CSV import" });
      } finally {
        await fs.promises.rm(csvFile.path, { force: true });
        await fs.promises.rm(zipFile.path, { force: true });
      }
    }
  );

  app.get("/api/imports/:id", (req, res) => {
    const job = importJobs.get(req.params.id);
    if (!job) {
      return res.status(404).json({ error: "Import job not found" });
    }
    return res.json(serializeImportJob(job));
  });

  // --- Tags ---

  app.get("/api/tags", async (_req, res) => {
    const tags = await prismaClient.tag.findMany();
    res.json(tags);
  });

  app.post("/api/tags", async (req, res) => {
    try {
      const { name } = req.body;
      const tag = await prismaClient.tag.create({ data: { name } });
      res.json(tag);
    } catch (_error) {
      res.status(400).json({ error: "Tag likely exists" });
    }
  });

  app.put("/api/tags/:id", async (req, res) => {
    try {
      const { name } = req.body;
      const tag = await prismaClient.tag.update({
        where: { id: req.params.id },
        data: { name }
      });
      res.json(tag);
    } catch (_error) {
      res.status(500).json({ error: "Failed to update tag" });
    }
  });

  app.delete("/api/tags/:id", async (req, res) => {
    try {
      await prismaClient.tag.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (_error) {
      res.status(500).json({ error: "Failed to delete tag" });
    }
  });

  // --- Outfits ---

  app.get("/api/outfits", async (_req, res) => {
    const outfits = await prismaClient.outfit.findMany({
      include: {
        items: {
          include: { item: true },
          orderBy: { position: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Transform to match frontend expectations
    const formatted = outfits.map(outfit => ({
      ...outfit,
      items: outfit.items.map(oi => ({
        id: `${oi.outfitId}-${oi.itemId}`,
        position: oi.position,
        item: oi.item ? {
          id: oi.item.id,
          name: oi.item.name,
          imageUrl: oi.item.imageUrl,
          category: oi.item.category
        } : null
      }))
    }));
    
    res.json(formatted);
  });

  // Get single outfit by ID
  app.get("/api/outfits/:id", async (req, res) => {
    try {
      const outfit = await prismaClient.outfit.findUnique({
        where: { id: req.params.id },
        include: {
          items: {
            include: { item: true },
            orderBy: { position: 'asc' }
          }
        }
      });
      
      if (!outfit) {
        return res.status(404).json({ error: "Outfit not found" });
      }
      
      res.json({
        ...outfit,
        items: outfit.items.map(oi => ({
          id: `${oi.outfitId}-${oi.itemId}`,
          position: oi.position,
          item: oi.item ? {
            id: oi.item.id,
            name: oi.item.name,
            imageUrl: oi.item.imageUrl,
            category: oi.item.category
          } : null
        }))
      });
    } catch (_error) {
      res.status(500).json({ error: "Failed to fetch outfit" });
    }
  });

  app.post("/api/outfits", async (req, res) => {
    const { name, notes, items } = req.body; // items: { itemId, position }[]
    
    try {
      const outfit = await prismaClient.outfit.create({
        data: {
          name,
          notes,
          items: {
            create: items.map((item: any) => ({
              position: item.position,
              item: { connect: { id: item.itemId } }
            }))
          }
        }
      });
      res.json(outfit);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to create outfit" });
    }
  });
  
  app.put("/api/outfits/:id", async (req, res) => {
    const { name, notes, items } = req.body;
    
    try {
      // Update outfit metadata
      const outfit = await prismaClient.outfit.update({
        where: { id: req.params.id },
        data: {
          name,
          notes,
          // If items provided, replace all items
          ...(items && {
            items: {
              deleteMany: {},
              create: items.map((item: any) => ({
                position: item.position,
                item: { connect: { id: item.itemId } }
              }))
            }
          })
        },
        include: {
          items: {
            include: { item: true },
            orderBy: { position: 'asc' }
          }
        }
      });
      
      res.json({
        ...outfit,
        items: outfit.items.map(oi => ({
          id: `${oi.outfitId}-${oi.itemId}`,
          position: oi.position,
          item: oi.item ? {
            id: oi.item.id,
            name: oi.item.name,
            imageUrl: oi.item.imageUrl,
            category: oi.item.category
          } : null
        }))
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update outfit" });
    }
  });

  app.delete("/api/outfits/:id", async (req, res) => {
      try {
          await prismaClient.outfit.delete({ where: { id: req.params.id }});
          res.json({ success: true });
      } catch (_error) {
          res.status(500).json({ error: "Failed to delete outfit"});
      }
  });

  return httpServer;
}
