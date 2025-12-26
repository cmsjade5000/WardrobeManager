import type { Express, Request, Response } from "express";
import type { Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

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
        imageUrl = `/uploads/${req.file.filename}`;
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
        finalImageUrl = `/uploads/${req.file.filename}`;
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
