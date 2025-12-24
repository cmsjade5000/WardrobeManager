import { Item, Outfit, Tag, INITIAL_ITEMS, INITIAL_TAGS } from './types';

// Simple Mock API using LocalStorage to persist across reloads for the user session
// In a real app, this would fetch from the Express backend

const STORAGE_KEYS = {
  ITEMS: 'dw_items',
  OUTFITS: 'dw_outfits',
  TAGS: 'dw_tags',
};

const getFromStorage = <T>(key: string, initial: T): T => {
  const stored = localStorage.getItem(key);
  if (!stored) return initial;
  try {
    return JSON.parse(stored);
  } catch (e) {
    return initial;
  }
};

const saveToStorage = (key: string, data: any) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// Delay to simulate network request
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const api = {
  items: {
    list: async (filters?: any) => {
      await delay(300);
      let items = getFromStorage<Item[]>(STORAGE_KEYS.ITEMS, INITIAL_ITEMS);
      
      if (filters) {
        if (filters.search) {
          const q = filters.search.toLowerCase();
          items = items.filter(i => i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q));
        }
        if (filters.type && filters.type !== 'ALL') {
          items = items.filter(i => i.type === filters.type);
        }
        if (filters.tag) {
          items = items.filter(i => i.tags.includes(filters.tag));
        }
      }
      return items;
    },
    get: async (id: string) => {
      await delay(200);
      const items = getFromStorage<Item[]>(STORAGE_KEYS.ITEMS, INITIAL_ITEMS);
      return items.find(i => i.id === id);
    },
    create: async (item: Omit<Item, 'id' | 'createdAt'>) => {
      await delay(400);
      const items = getFromStorage<Item[]>(STORAGE_KEYS.ITEMS, INITIAL_ITEMS);
      const newItem: Item = {
        ...item,
        id: Math.random().toString(36).substring(2, 9),
        createdAt: new Date().toISOString(),
      };
      saveToStorage(STORAGE_KEYS.ITEMS, [newItem, ...items]);
      return newItem;
    },
    update: async (id: string, updates: Partial<Item>) => {
      await delay(400);
      const items = getFromStorage<Item[]>(STORAGE_KEYS.ITEMS, INITIAL_ITEMS);
      const index = items.findIndex(i => i.id === id);
      if (index === -1) throw new Error('Item not found');
      
      const updatedItem = { ...items[index], ...updates };
      items[index] = updatedItem;
      saveToStorage(STORAGE_KEYS.ITEMS, items);
      return updatedItem;
    },
    delete: async (id: string) => {
      await delay(300);
      const items = getFromStorage<Item[]>(STORAGE_KEYS.ITEMS, INITIAL_ITEMS);
      const newItems = items.filter(i => i.id !== id);
      saveToStorage(STORAGE_KEYS.ITEMS, newItems);
      return true;
    }
  },
  
  tags: {
    list: async () => {
      await delay(200);
      return getFromStorage<Tag[]>(STORAGE_KEYS.TAGS, INITIAL_TAGS);
    },
    create: async (name: string) => {
      await delay(200);
      const tags = getFromStorage<Tag[]>(STORAGE_KEYS.TAGS, INITIAL_TAGS);
      const newTag = { id: Math.random().toString(36).substring(2, 9), name };
      saveToStorage(STORAGE_KEYS.TAGS, [...tags, newTag]);
      return newTag;
    }
  },

  outfits: {
    list: async () => {
      await delay(300);
      return getFromStorage<Outfit[]>(STORAGE_KEYS.OUTFITS, []);
    },
    get: async (id: string) => {
      await delay(200);
      const outfits = getFromStorage<Outfit[]>(STORAGE_KEYS.OUTFITS, []);
      return outfits.find(o => o.id === id);
    },
    create: async (outfit: Omit<Outfit, 'id' | 'createdAt'>) => {
      await delay(500);
      const outfits = getFromStorage<Outfit[]>(STORAGE_KEYS.OUTFITS, []);
      const newOutfit: Outfit = {
        ...outfit,
        id: Math.random().toString(36).substring(2, 9),
        createdAt: new Date().toISOString(),
      };
      saveToStorage(STORAGE_KEYS.OUTFITS, [newOutfit, ...outfits]);
      return newOutfit;
    },
    delete: async (id: string) => {
      await delay(300);
      const outfits = getFromStorage<Outfit[]>(STORAGE_KEYS.OUTFITS, []);
      const newOutfits = outfits.filter(o => o.id !== id);
      saveToStorage(STORAGE_KEYS.OUTFITS, newOutfits);
      return true;
    }
  }
};
