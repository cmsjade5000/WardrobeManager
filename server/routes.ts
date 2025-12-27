import type { Express, Request, Response } from "express";
import type { Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import { PrismaClient } from "@prisma/client";
import sharp from "sharp";
import { randomUUID } from "crypto";

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

export async function registerRoutes(
  httpServer: Server,
  app: Express,
  prismaClient: PrismaClient = prisma
): Promise<Server> {
  type ImportJobStatus = "queued" | "processing" | "completed";
  type ImportItemStatus = "queued" | "processing" | "completed" | "failed";
  type ImportJobItem = {
    id: string;
    filename: string;
    status: ImportItemStatus;
    itemId?: string;
    imageUrl?: string;
    error?: string;
    filePath: string;
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
    items: job.items.map(({ filePath: _filePath, ...item }) => item),
  });

  const processImportJob = async (job: ImportJob) => {
    job.status = "processing";
    for (const item of job.items) {
      item.status = "processing";
      try {
        const imageUrl = await processUploadedImage(item.filePath);
        const created = await prismaClient.item.create({
          data: {
            name: item.filename,
            type: job.defaults.type,
            category: job.defaults.category,
            color: job.defaults.color,
            imageUrl,
            brand: job.defaults.brand,
            size: job.defaults.size,
            material: job.defaults.material,
            notes: job.defaults.notes,
            tags: job.defaults.tags.length
              ? {
                  create: job.defaults.tags.map((tagId) => ({
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

      const job: ImportJob = {
        id: randomUUID(),
        status: "queued",
        total: files.length,
        completed: 0,
        failed: 0,
        items: files.map((file) => ({
          id: randomUUID(),
          filename: path.parse(file.originalname).name || "Imported item",
          status: "queued",
          filePath: file.path,
        })),
        defaults: {
          type,
          category,
          color,
          brand,
          size,
          material,
          notes,
          tags: tagIds,
        },
        createdAt: new Date().toISOString(),
      };

      enqueueImportJob(job);
      return res.json(serializeImportJob(job));
    } catch (error) {
      console.error("Create import job error:", error);
      return res.status(500).json({ error: "Failed to start import" });
    }
  });

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
