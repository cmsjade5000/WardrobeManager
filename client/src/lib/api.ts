import { Item, Outfit } from './types';

export const api = {
  ai: {
    prompt: async (prompt: string) => {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) throw new Error("Failed to generate response");
      return res.json();
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
      if (!res.ok) throw new Error('Failed to fetch items');
      return res.json();
    },
    get: async (id: string) => {
      const res = await fetch(`/api/items/${id}`);
      if (!res.ok) throw new Error('Failed to fetch item');
      return res.json();
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
      if (!res.ok) throw new Error('Failed to create item');
      return res.json();
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
      if (!res.ok) throw new Error('Failed to update item');
      return res.json();
    },
    delete: async (id: string) => {
      const res = await fetch(`/api/items/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete item');
      return true;
    }
  },
  
  tags: {
    list: async () => {
      const res = await fetch('/api/tags');
      if (!res.ok) throw new Error('Failed to fetch tags');
      return res.json();
    },
    create: async (name: string) => {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error('Failed to create tag');
      return res.json();
    },
    update: async (id: string, name: string) => {
      const res = await fetch(`/api/tags/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error('Failed to update tag');
      return res.json();
    },
    delete: async (id: string) => {
      const res = await fetch(`/api/tags/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete tag');
      return true;
    }
  },

  outfits: {
    list: async () => {
      const res = await fetch('/api/outfits');
      if (!res.ok) throw new Error('Failed to fetch outfits');
      return res.json();
    },
    get: async (id: string) => {
      const res = await fetch(`/api/outfits/${id}`);
      if (!res.ok) throw new Error('Failed to fetch outfit');
      return res.json();
    },
    create: async (outfit: Omit<Outfit, 'id' | 'createdAt'>) => {
      const res = await fetch('/api/outfits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(outfit),
      });
      if (!res.ok) throw new Error('Failed to create outfit');
      return res.json();
    },
    delete: async (id: string) => {
      const res = await fetch(`/api/outfits/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete outfit');
      return true;
    },
    update: async (id: string, outfit: { name?: string; notes?: string; items?: { itemId: string; position: number }[] }) => {
      const res = await fetch(`/api/outfits/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(outfit),
      });
      if (!res.ok) throw new Error('Failed to update outfit');
      return res.json();
    }
  }
};
