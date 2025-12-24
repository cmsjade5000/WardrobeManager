# Digital Wardrobe MVP

A private, single-user digital wardrobe application to organize your closet and build outfits.

## Features

-   **Wardrobe Management**: Add, edit, and categorize your clothing items.
-   **Real Image Uploads**: Upload your own photos (stored locally).
-   **Outfit Builder**: Visual drag-and-drop interface to create looks.
-   **Filtering**: Sort by type, category, tag, or color.
-   **Full Backend**: Node.js, Express, SQLite, Prisma.

## How to Run

Simply click the **Run** button in Replit.

Or manually:
```bash
npm run dev:client
```
(This runs the full stack server via `tsx server/index.ts`)

## Tech Stack

-   **Frontend**: React, TypeScript, Vite, Tailwind CSS, Shadcn UI
-   **Backend**: Node.js, Express
-   **Database**: SQLite with Prisma ORM
-   **Storage**: Local filesystem (`/uploads`)

## API Endpoints

-   `GET /api/health` - Health check
-   `GET /api/items` - List items (supports filtering)
-   `POST /api/items` - Create item (multipart/form-data)
-   `GET /api/tags` - List tags
-   `GET /api/outfits` - List outfits
