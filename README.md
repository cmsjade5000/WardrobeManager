# Digital Wardrobe MVP

A private, single-user digital wardrobe application to organize your closet and build outfits.

## Features

-   **Wardrobe Management**: Add, edit, and categorize your clothing items.
-   **Outfit Builder**: visual drag-and-drop interface to create looks.
-   **Filtering**: Sort by type, category, tag, or color.
-   **Local Persistence**: Your data is saved to your browser's local storage for privacy and speed.

## How to Run

Simply click the **Run** button in Replit.

Or manually:
```bash
npm run dev:client
```

## Tech Stack

-   **Frontend**: React, TypeScript, Vite
-   **Styling**: Tailwind CSS (v4), Shadcn UI, Framer Motion
-   **State/Data**: React Query, LocalStorage (Mock API)

## Next Steps (Planned Upgrades)

1.  **Wear Tracking (OOTD)**
    -   Log when you wear an item or outfit.
    -   Calculate "Cost Per Wear" analytics.

2.  **Smart Features**
    -   AI Auto-tagging: Automatically detect color and category from uploaded images.
    -   Duplicate Detection: Warn if you're buying something similar to what you own.

3.  **Calendar Integration**
    -   Plan outfits for specific dates/events.
    -   Weather API integration to suggest outfits based on forecast.

4.  **Data & Storage**
    -   Migrate from LocalStorage to a real backend (PostgreSQL + Prisma).
    -   Implement S3 for scalable image storage.
    -   Export/Import CSV/JSON data for backup.
