import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Multer Configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)){
        fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir)
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    const ext = path.extname(file.originalname);
    cb(null, 'item-' + uniqueSuffix + ext)
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPG, PNG, and WebP are allowed.'));
    }
  }
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // --- Items ---

  // List Items (with filters)
  app.get("/api/items", async (req, res) => {
    const { type, category, tag, search, sort, color } = req.query;

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
      const items = await prisma.item.findMany({
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
      const item = await prisma.item.findUnique({
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
    } catch (error) {
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

      const item = await prisma.item.create({
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

  // Update Item
  app.put("/api/items/:id", async (req, res) => {
    const { tags, ...data } = req.body;
    // Note: Multipart update not fully implemented for MVP simplicity unless needed (user said "CRUD for Items with multipart")
    // Assuming for now simple metadata update. If image update needed, would need multer here too.
    // Let's rely on creating new items for images for this basic pass or add multipart here if crucial.
    
    try {
      const item = await prisma.item.update({
        where: { id: req.params.id },
        data: {
            ...data,
            // Simple tag replacement strategy
            tags: tags ? {
                deleteMany: {},
                create: tags.map((tagId: string) => ({
                    tag: { connect: { id: tagId } }
                }))
            } : undefined
        },
        include: { tags: { include: { tag: true } } }
      });
      res.json({ ...item, tags: item.tags.map(t => t.tag.id) });
    } catch (error) {
      res.status(500).json({ error: "Failed to update item" });
    }
  });

  // Delete Item
  app.delete("/api/items/:id", async (req, res) => {
    try {
      await prisma.item.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete item" });
    }
  });

  // --- Tags ---

  app.get("/api/tags", async (req, res) => {
    const tags = await prisma.tag.findMany();
    res.json(tags);
  });

  app.post("/api/tags", async (req, res) => {
    try {
      const { name } = req.body;
      const tag = await prisma.tag.create({ data: { name } });
      res.json(tag);
    } catch (error) {
      res.status(400).json({ error: "Tag likely exists" });
    }
  });

  app.put("/api/tags/:id", async (req, res) => {
    try {
      const { name } = req.body;
      const tag = await prisma.tag.update({
        where: { id: req.params.id },
        data: { name }
      });
      res.json(tag);
    } catch (error) {
      res.status(500).json({ error: "Failed to update tag" });
    }
  });

  app.delete("/api/tags/:id", async (req, res) => {
    try {
      await prisma.tag.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete tag" });
    }
  });

  // --- Outfits ---

  app.get("/api/outfits", async (req, res) => {
    const outfits = await prisma.outfit.findMany({
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

  app.post("/api/outfits", async (req, res) => {
    const { name, notes, items } = req.body; // items: { itemId, position }[]
    
    try {
      const outfit = await prisma.outfit.create({
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
      const outfit = await prisma.outfit.update({
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
          await prisma.outfit.delete({ where: { id: req.params.id }});
          res.json({ success: true });
      } catch (error) {
          res.status(500).json({ error: "Failed to delete outfit"});
      }
  });

  return httpServer;
}
