# Digital Wardrobe

## Overview

A private, single-user digital wardrobe application for organizing clothing items, uploading photos, and building outfits. Users can add clothing items with images, categorize them by type and custom tags, and compose outfits by selecting and arranging items visually.

## Recent Changes (December 2025)

- **iPhone/Mobile Compatibility**: Full PWA support with installable app experience on iOS
- **Dark Mode**: Theme toggle in sidebar (desktop) and header (mobile) with system preference detection and persistence
- **Color Filter**: 14 predefined color options in Wardrobe page filter bar
- **Outfit Editing**: Full edit capability at /outfit/:id/edit with rename, notes, add/remove items
- **Tag Management**: Complete CRUD for tags including rename (via dialog) and delete
- **Image Replacement**: Can replace item images when editing existing items (multipart upload)
- **Drag-and-Drop Reordering**: dnd-kit powered reordering in Outfit Builder

## Mobile/PWA Features

- **PWA Manifest**: Installable as standalone app from Safari (Add to Home Screen)
- **iOS Safe Areas**: Proper handling of iPhone notch and home bar
- **Touch-Friendly**: 44px minimum touch targets, buttons always visible on mobile
- **Dynamic Viewport**: Uses 100dvh for proper sizing on iOS Safari
- **Momentum Scrolling**: Native iOS scroll behavior enabled

## User Preferences

Preferred communication style: Simple, everyday language.
Design choice: Cool Slate/Steel Blue color palette (hues 215-220) with dark mode variant.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state and caching
- **UI Components**: Shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom theme configuration
- **Forms**: React Hook Form with Zod validation
- **Animations**: Framer Motion for UI transitions
- **Theming**: next-themes for dark/light mode with system preference detection
- **Drag-and-Drop**: dnd-kit for sortable item reordering

### Backend Architecture
- **Runtime**: Node.js with Express server
- **API Pattern**: RESTful API endpoints under `/api/*`
- **File Uploads**: Multer middleware handling image uploads (JPG, PNG, WebP up to 8MB)
- **Static Files**: Uploaded images served from `/uploads` directory

### Data Storage
- **Primary Database**: SQLite using Prisma Client for schema definition and queries
- **Schema Location**: `prisma/schema.prisma` is the source of truth
- **Local Data**: SQLite file lives at `prisma/dev.db` by default
- **Migrations**: Prisma migrations live in `prisma/migrations/` when created

### Key Design Patterns
- **Shared Types**: Common types and Zod schemas in `shared/` for client/server payloads
- **API Client**: Centralized API functions in `client/src/lib/api.ts` for all HTTP operations
- **Component Structure**: UI components in `client/src/components/ui/`, pages in `client/src/pages/`

## External Dependencies

### Database
- SQLite database (file-backed, no `DATABASE_URL` required by default)
- Prisma Client for type-safe database operations

### File Storage
- Local filesystem storage in `/uploads` directory for uploaded images
- Multer for multipart form handling

### UI Libraries
- Radix UI primitives for accessible component foundations
- Lucide React for icons
- Embla Carousel for carousel components
- React Day Picker for calendar functionality

### Development Tools
- Vite with React plugin for development server and HMR
- TypeScript for type checking
- ESBuild for production server bundling
