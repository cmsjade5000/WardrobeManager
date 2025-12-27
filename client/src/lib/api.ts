import { ImportJob, Item, Outfit, OutfitRecord, OutfitWithItems, Tag } from './types';

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

const parseErrorResponse = async (res: Response, fallbackMessage: string): Promise<never> => {
  let message = fallbackMessage;
  let details: unknown;
  try {
    const data = await res.json();
    if (typeof data?.error === "string") {
      message = data.error;
    }
    if (typeof data?.details !== "undefined") {
      details = data.details;
    }
  } catch {
    // ignore parse errors
  }
  throw new ApiError(message, res.status, details);
};

const requireOkJson = async <T>(res: Response, fallbackMessage: string): Promise<T> => {
  if (!res.ok) {
    return parseErrorResponse(res, fallbackMessage);
  }
  return res.json();
};

export const getApiErrorMessage = (error: unknown, fallback: string): string => {
  return error instanceof Error ? error.message : fallback;
};

export const getApiErrorFieldErrors = (error: unknown): Record<string, string[]> | null => {
  if (!(error instanceof ApiError)) {
    return null;
  }
  if (!error.details || typeof error.details !== "object" || Array.isArray(error.details)) {
    return null;
  }
  return error.details as Record<string, string[]>;
};

export const getApiErrorDetailMessages = (error: unknown): string[] => {
  if (!(error instanceof ApiError)) {
    return [];
  }
  const details = error.details;
  if (!details) {
    return [];
  }
  if (typeof details === "string") {
    return [details];
  }
  if (Array.isArray(details)) {
    return details.filter((item): item is string => typeof item === "string");
  }
  if (typeof details === "object") {
    const messages: string[] = [];
    for (const [field, fieldMessages] of Object.entries(details)) {
      if (Array.isArray(fieldMessages)) {
        const message = fieldMessages.find((item) => typeof item === "string");
        if (message) {
          messages.push(`${field}: ${message}`);
        }
      }
    }
    return messages;
  }
  return [];
};

export const api = {
  ai: {
    prompt: async (prompt: string) => {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      return requireOkJson<{ content?: string }>(res, "Failed to generate response");
    },
  },
  items: {
    list: async (filters?: any) => {
      const params = new URLSearchParams();
      if (filters) {
        if (filters.search) params.append('search', filters.search);
        if (filters.type && filters.type !== 'ALL') params.append('type', filters.type);
        if (filters.tag && filters.tag !== 'ALL') params.append('tag', filters.tag);
        if (filters.color && filters.color !== 'ALL') params.append('color', filters.color);
      }
      const res = await fetch(`/api/items?${params.toString()}`);
      return requireOkJson<Item[]>(res, "Failed to fetch items");
    },
    get: async (id: string) => {
      const res = await fetch(`/api/items/${id}`);
      return requireOkJson<Item>(res, "Failed to fetch item");
    },
    create: async (data: any) => {
      const formData = new FormData();
      Object.keys(data).forEach(key => {
        if (key === 'tags' && Array.isArray(data[key])) {
          formData.append('tags', JSON.stringify(data[key]));
        } else if (data[key] !== undefined && data[key] !== null) {
          formData.append(key, data[key]);
        }
      });

      const res = await fetch('/api/items', {
        method: 'POST',
        body: formData,
      });
      return requireOkJson<Item>(res, "Failed to create item");
    },
    update: async (id: string, updates: Partial<Item> & { image?: File }) => {
      const formData = new FormData();
      Object.keys(updates).forEach(key => {
        const value = (updates as any)[key];
        if (key === 'tags' && Array.isArray(value)) {
          formData.append('tags', JSON.stringify(value));
        } else if (key === 'image' && value instanceof File) {
          formData.append('image', value);
        } else if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      });
      const res = await fetch(`/api/items/${id}`, {
        method: 'PUT',
        body: formData,
      });
      return requireOkJson<Item>(res, "Failed to update item");
    },
    delete: async (id: string) => {
      const res = await fetch(`/api/items/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        return parseErrorResponse(res, "Failed to delete item");
      }
      return true;
    }
  },
  
  tags: {
    list: async () => {
      const res = await fetch('/api/tags');
      return requireOkJson<Tag[]>(res, "Failed to fetch tags");
    },
    create: async (name: string) => {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      return requireOkJson<Tag>(res, "Failed to create tag");
    },
    update: async (id: string, name: string) => {
      const res = await fetch(`/api/tags/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      return requireOkJson<Tag>(res, "Failed to update tag");
    },
    delete: async (id: string) => {
      const res = await fetch(`/api/tags/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        return parseErrorResponse(res, "Failed to delete tag");
      }
      return true;
    }
  },

  imports: {
    create: async (payload: {
      files: File[];
      type: string;
      category: string;
      color: string;
      brand?: string;
      size?: string;
      material?: string;
      notes?: string;
      tags?: string[];
    }) => {
      const formData = new FormData();
      for (const file of payload.files) {
        formData.append("images", file);
      }
      formData.append("type", payload.type);
      formData.append("category", payload.category);
      formData.append("color", payload.color);
      if (payload.brand) formData.append("brand", payload.brand);
      if (payload.size) formData.append("size", payload.size);
      if (payload.material) formData.append("material", payload.material);
      if (payload.notes) formData.append("notes", payload.notes);
      if (payload.tags?.length) {
        formData.append("tags", JSON.stringify(payload.tags));
      }

      const res = await fetch("/api/imports", {
        method: "POST",
        body: formData,
      });
      return requireOkJson<ImportJob>(res, "Failed to start import");
    },
    createCsv: async (payload: {
      csv: File;
      zip: File;
      type?: string;
      category?: string;
      color?: string;
      brand?: string;
      size?: string;
      material?: string;
      notes?: string;
      tags?: string[];
    }) => {
      const formData = new FormData();
      formData.append("csv", payload.csv);
      formData.append("zip", payload.zip);
      if (payload.type) formData.append("type", payload.type);
      if (payload.category) formData.append("category", payload.category);
      if (payload.color) formData.append("color", payload.color);
      if (payload.brand) formData.append("brand", payload.brand);
      if (payload.size) formData.append("size", payload.size);
      if (payload.material) formData.append("material", payload.material);
      if (payload.notes) formData.append("notes", payload.notes);
      if (payload.tags?.length) {
        formData.append("tags", JSON.stringify(payload.tags));
      }

      const res = await fetch("/api/imports/csv", {
        method: "POST",
        body: formData,
      });
      return requireOkJson<ImportJob>(res, "Failed to start CSV import");
    },
    status: async (id: string): Promise<ImportJob> => {
      const res = await fetch(`/api/imports/${id}`);
      return requireOkJson<ImportJob>(res, "Failed to fetch import status");
    },
  },

  outfits: {
    list: async () => {
      const res = await fetch('/api/outfits');
      return requireOkJson<OutfitWithItems[]>(res, "Failed to fetch outfits");
    },
    get: async (id: string) => {
      const res = await fetch(`/api/outfits/${id}`);
      return requireOkJson<OutfitWithItems>(res, "Failed to fetch outfit");
    },
    create: async (outfit: Omit<Outfit, 'id' | 'createdAt'>) => {
      const res = await fetch('/api/outfits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(outfit),
      });
      return requireOkJson<OutfitRecord>(res, "Failed to create outfit");
    },
    delete: async (id: string) => {
      const res = await fetch(`/api/outfits/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        return parseErrorResponse(res, "Failed to delete outfit");
      }
      return true;
    },
    update: async (id: string, outfit: { name?: string; notes?: string; items?: { itemId: string; position: number }[] }) => {
      const res = await fetch(`/api/outfits/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(outfit),
      });
      return requireOkJson<OutfitRecord>(res, "Failed to update outfit");
    }
  }
};
