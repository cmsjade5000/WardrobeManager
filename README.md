# Digital Wardrobe MVP

A private, single-user digital wardrobe application to organize your closet, upload photos of your clothing items, and build outfits.

## ✨ Features

- **📸 Real Image Uploads**: Upload photos directly from your device (JPG, PNG, WebP, max 8MB)
- **🖼️ Background Removal**: Automatically removes image backgrounds on upload for cleaner cards
- **👕 Wardrobe Management**: Add, edit, categorize, and delete clothing items
- **🏷️ Smart Tagging**: Create custom tags and filter items (Casual, Work, Summer, etc.)
- **👗 Outfit Builder**: Visually compose outfits by adding items and reordering them
- **🔍 Advanced Filtering**: Search by name, filter by type, category, or tag
- **💾 Persistent Storage**: SQLite database stores all your data permanently

## 🚀 Quick Start

Click the **Run** button in Replit, or manually:
```bash
npm run dev
```

The app will start at `http://0.0.0.0:5000`

## 📋 MVP Verification Checklist

### ✅ 1. Upload an Item with Image
1. Click "Add Item" button on the Wardrobe page
2. Fill in the form:
   - **Name**: e.g., "Vintage Denim Jacket"
   - **Type**: Select from dropdown (TOP, BOTTOM, etc.)
   - **Category**: e.g., "Jacket"
   - **Color**: e.g., "Blue"
3. **Upload Image**: Click "Choose File" and select a photo from your device
   - Or paste an image URL in the "Image URL" field
   - Or click one of the stock image thumbnails
4. (Optional) Assign tags by clicking the "Select tags" dropdown
5. Click "Save Item"
6. ✅ **Expected**: You're redirected to the Wardrobe page and your item appears

### ✅ 2. Item Appears in Wardrobe Grid
1. After adding an item, observe the Wardrobe grid
2. Refresh the page (to test database persistence)
3. ✅ **Expected**: Your item is still there with the image you uploaded

### ✅ 3. Filters and Search Work
1. **Search**: Type "jacket" in the search box
   - ✅ **Expected**: Only items matching "jacket" appear
2. **Filter by Type**: Select "TOP" from the Type dropdown
   - ✅ **Expected**: Only tops are shown
3. **Filter by Tag**: 
   - First, go to the "Tags" page and create a new tag (e.g., "Favorite")
   - Go back to Wardrobe, edit an item, and assign the tag
   - Use the Tag filter to show only items with that tag
   - ✅ **Expected**: Only tagged items appear
4. Clear filters to see all items again

### ✅ 4. Create and Save an Outfit
1. Click "Outfits" in the sidebar
2. Enter an outfit name in the top input (e.g., "Weekend Casual")
3. Browse your wardrobe on the right sidebar
4. Click items to add them to your outfit canvas (center area)
5. Use the ↑↓ arrows to reorder items in your outfit
6. Click "Save Look"
7. ✅ **Expected**: Toast notification confirms save
8. Refresh the page
9. ✅ **Expected**: Your outfit is still saved (check by clicking "Outfits")

## 🏗️ Tech Stack

### Frontend
- **React 19** + **TypeScript**
- **Vite** for fast dev server and HMR
- **Tailwind CSS v4** for styling
- **Shadcn UI** components
- **Wouter** for routing
- **TanStack Query** for data fetching
- **Framer Motion** for animations

### Backend
- **Node.js** + **Express**
- **TypeScript** throughout
- **Multer** for multipart file uploads
- **Prisma ORM** for type-safe database queries
- **SQLite** for persistence

## 📂 Project Structure

```
.
├── client/               # React frontend
│   ├── src/
│   │   ├── pages/       # Wardrobe, ItemDetail, OutfitBuilder, Tags
│   │   ├── components/  # Layout, UI components
│   │   └── lib/         # API client, types, utils
│   └── index.html
├── server/              # Express backend
│   ├── routes.ts        # API endpoints
│   └── index.ts         # Server entry point
├── prisma/              # Database schema and migrations
│   └── schema.prisma
├── uploads/             # User-uploaded images (served statically)
└── shared/              # Shared schemas/types (Zod)
```

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/items` | List all items (supports `?search=`, `?type=`, `?tag=`) |
| `GET` | `/api/items/:id` | Get single item |
| `POST` | `/api/items` | Create item (multipart/form-data for image upload) |
| `PUT` | `/api/items/:id` | Update item |
| `DELETE` | `/api/items/:id` | Delete item |
| `GET` | `/api/tags` | List all tags |
| `POST` | `/api/tags` | Create tag |
| `GET` | `/api/outfits` | List all outfits |
| `POST` | `/api/outfits` | Create outfit |
| `DELETE` | `/api/outfits/:id` | Delete outfit |
| `POST` | `/api/ai` | Generate AI response from prompt |

## 🎨 Design Philosophy

The UI follows a **Modern Minimalist Boutique** aesthetic:
- **Fonts**: Playfair Display (serif, headers) + DM Sans (sans-serif, body)
- **Colors**: Warm neutrals with terracotta accents
- **Layout**: Clean cards, generous whitespace, subtle shadows

## 🗂️ Database Schema

```prisma
model Item {
  id           String   (uuid)
  name         String
  type         String   // TOP, BOTTOM, OUTERWEAR, etc.
  category     String
  color        String
  imageUrl     String
  notes        String?
  brand        String?
  // ... + tags relation
}

model Tag {
  id    String (uuid)
  name  String (unique)
}

model Outfit {
  id        String (uuid)
  name      String
  notes     String?
  items     OutfitItem[]
}

model OutfitItem {
  outfitId String
  itemId   String
  position Int  // For ordering
}
```

## 🚧 Next Steps (Future Enhancements)

1. **📊 Wear Tracking (OOTD)**
   - Log when you wear an item or outfit
   - Calculate "Cost Per Wear" analytics
   - Track most/least worn items

2. **🤖 AI Features**
   - Auto-tagging: Detect colors and categories from uploaded images
   - Duplicate Detection: Warn if you already own something similar
   - Style Recommendations: Suggest outfit combinations

3. **📅 Calendar Integration**
   - Plan outfits for specific dates/events
   - Weather API integration for smart suggestions

4. **☁️ Cloud Storage**
   - Migrate from local `/uploads` to AWS S3
   - Enable multi-device access

5. **📦 Data Portability**
   - Export wardrobe to CSV/JSON
   - Import from spreadsheets
   - Backup & restore

## 🐛 Troubleshooting

**Images not uploading?**
- Check file size (max 8MB)
- Ensure file type is JPG, PNG, or WebP

**Database reset:**
```bash
rm -rf prisma/migrations prisma/dev.db
npx prisma migrate dev --name init
npx tsx prisma/seed.ts
```

## 📄 License

MIT
