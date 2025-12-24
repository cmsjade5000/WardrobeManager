# Digital Wardrobe

## Overview

A private, single-user digital wardrobe application for organizing clothing items, uploading photos, and building outfits. Users can add clothing items with images, categorize them by type and custom tags, and compose outfits by selecting and arranging items visually.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state and caching
- **UI Components**: Shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom theme configuration
- **Forms**: React Hook Form with Zod validation
- **Animations**: Framer Motion for UI transitions

### Backend Architecture
- **Runtime**: Node.js with Express server
- **API Pattern**: RESTful API endpoints under `/api/*`
- **File Uploads**: Multer middleware handling image uploads (JPG, PNG, WebP up to 8MB)
- **Static Files**: Uploaded images served from `/uploads` directory

### Data Storage
- **Primary Database**: PostgreSQL using Drizzle ORM for schema definition and queries
- **Secondary ORM**: Prisma Client is also present (used for seed data and some operations)
- **Schema Location**: `shared/schema.ts` contains Drizzle table definitions
- **Migrations**: Drizzle Kit manages database migrations in `/migrations` directory

### Key Design Patterns
- **Shared Types**: Common types and schemas in `shared/` directory accessible by both client and server
- **API Client**: Centralized API functions in `client/src/lib/api.ts` for all HTTP operations
- **Component Structure**: UI components in `client/src/components/ui/`, pages in `client/src/pages/`

## External Dependencies

### Database
- PostgreSQL database (requires `DATABASE_URL` environment variable)
- Drizzle ORM for type-safe database operations
- Prisma Client for additional database operations

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