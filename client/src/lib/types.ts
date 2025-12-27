export type ItemType = 'TOP' | 'BOTTOM' | 'OUTERWEAR' | 'ONE_PIECE' | 'SHOES' | 'ACCESSORY';

export interface Tag {
  id: string;
  name: string;
}

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  category: string;
  color: string;
  imageUrl: string;
  notes?: string;
  brand?: string;
  size?: string;
  material?: string;
  season?: string[];
  tags: string[]; // array of tag IDs
  createdAt: string;
}

export type ImportItemStatus = "queued" | "processing" | "completed" | "failed";
export type ImportJobStatus = "queued" | "processing" | "completed";

export interface ImportJobItem {
  id: string;
  filename: string;
  status: ImportItemStatus;
  itemId?: string;
  imageUrl?: string;
  error?: string;
}

export interface ImportJob {
  id: string;
  status: ImportJobStatus;
  total: number;
  completed: number;
  failed: number;
  items: ImportJobItem[];
  createdAt: string;
}

export interface OutfitItem {
  itemId: string;
  position: number; // For ordering
}

export interface Outfit {
  id: string;
  name: string;
  items: OutfitItem[];
  notes?: string;
  createdAt: string;
}

// Initial Mock Data
export const INITIAL_TAGS: Tag[] = [
  { id: '1', name: 'Casual' },
  { id: '2', name: 'Work' },
  { id: '3', name: 'Summer' },
  { id: '4', name: 'Winter' },
  { id: '5', name: 'Date Night' },
  { id: '6', name: 'Formal' },
];

export const INITIAL_ITEMS: Item[] = [
  {
    id: '1',
    name: 'Classic White Tee',
    type: 'TOP',
    category: 'T-Shirt',
    color: 'White',
    imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    brand: 'Uniqlo',
    size: 'M',
    material: 'Cotton',
    tags: ['1', '3'],
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Vintage Blue Jeans',
    type: 'BOTTOM',
    category: 'Jeans',
    color: 'Blue',
    imageUrl: 'https://images.unsplash.com/photo-1542272617-08f08375810c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    brand: 'Levi\'s',
    size: '32',
    material: 'Denim',
    tags: ['1', '2'],
    createdAt: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'Black Leather Jacket',
    type: 'OUTERWEAR',
    category: 'Jacket',
    color: 'Black',
    imageUrl: 'https://images.unsplash.com/photo-1551028919-ac7bcb7d7162?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    brand: 'AllSaints',
    size: 'L',
    material: 'Leather',
    tags: ['5', '4'],
    createdAt: new Date().toISOString(),
  }
];
