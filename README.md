# Multi-Location Menu Browser

A Next.js application that integrates with Square's APIs to display location-aware menu catalogs. Built as a demonstration of real-world API integration, TypeScript type safety, and secure backend architecture.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and pnpm
- Square Developer account (free at https://developer.squareup.com)

### Installation

1. **Clone and install dependencies:**
   ```bash
   git clone <your-repo-url>
   cd multi-location
   pnpm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` and add your Square sandbox credentials:
   ```
   SQUARE_ACCESS_TOKEN=your_sandbox_access_token_here
   SQUARE_ENVIRONMENT=sandbox
   ```

3. **Seed test data in Square Sandbox:**

   **Option A: Automated Seed Script (Recommended)**

   Run the automated seed script to create sample data:
   ```bash
   pnpm seed
   ```

   This automatically:
   - Creates a second location if only 1 exists ("Downtown Cafe")
   - Creates 4 categories (Breakfast, Lunch, Beverages, Desserts)
   - Creates 10 menu items with location-specific availability:
     - Some items only at Location 1
     - Some items only at Location 2
     - Some items at both locations

   **Perfect for demonstrating multi-location filtering!**

   **Option B: Manual Setup via Square Dashboard**

   Visit https://squareupsandbox.com/dashboard and manually create:
   - **Locations (2+):** e.g., "Downtown Cafe", "Airport Location"
   - **Categories (3-4):** e.g., Coffee, Breakfast, Lunch, Desserts
   - **Items (8-10):** Mix of items with different availability
   - http://localhost:3000/api/locations
   - http://localhost:3000/api/catalog

## 🏗️ Architecture & Design Decisions

### Tech Stack
- **Next.js 16** with App Router - Modern React patterns, built-in API routes
- **TypeScript** - Type safety at all boundaries
- **Tailwind CSS** - Rapid, maintainable styling
- **Square Node SDK** - Type-safe API client
- **pnpm** - Fast, disk-efficient package manager

### Why pnpm?

Chose pnpm over npm/yarn for several competitive advantages:

**Performance:** 2-3x faster installs via content-addressable storage. Dependencies are hard-linked from a global store rather than copied per project.

**Disk Efficiency:** Saves significant disk space (~50-70% reduction). One copy of each package version globally, symlinked to node_modules.

**Strict by Default:** Non-flat node_modules structure prevents phantom dependencies. Can't accidentally import packages not listed in package.json - catches dependency issues early.

**Monorepo-Ready:** Built-in workspace support. Though this project is single-app, choosing tools that scale shows architectural foresight.

**Industry Momentum:** Used by Vercel, Microsoft, TikTok. Shows awareness of modern tooling trends.

**Why it matters for this project:** Faster CI/CD pipelines, cleaner dependency tree, demonstrates attention to developer experience and build performance.

### Security-First Architecture

**All Square API calls are server-side only.** Access tokens never reach the client.

```
Client → Next.js API Route → Square API
         ↑ (Server-side only)
```

**Why:** Square access tokens provide full merchant data access. Client-side exposure would be a critical vulnerability.

### Type Safety at API Boundaries

Created explicit TypeScript interfaces (`app/lib/types.ts`) for:
- Locations
- Catalog items
- Categories
- Money/pricing data

**Why:** Documents exactly what data we use, catches breaking changes early, improves DX.

### Location Filtering Logic

Implemented Square's three-field availability system:
```typescript
// present_at_all_locations: true → show everywhere
// present_at_location_ids: [...] → show only at these locations
// absent_at_location_ids: [...] → hide at these locations
```

**Why:** Matches Square's merchant-facing logic and prevents ordering unavailable items.

### Money Formatting

Square returns amounts in smallest currency unit (cents for USD). Conversion to dollars happens only at display time using `Intl.NumberFormat`.

**Why:** Avoids floating-point precision errors in financial calculations.

## 📁 Project Structure

```
app/
├── api/
│   ├── locations/
│   │   └── route.ts          # GET /api/locations
│   └── catalog/
│       └── route.ts           # GET /api/catalog
├── lib/
│   ├── square.ts              # Square client (SERVER-SIDE ONLY)
│   ├── types.ts               # TypeScript interfaces
│   └── utils.ts               # formatMoney, isAvailableAtLocation
└── (UI components - to be added)
```

## 🔒 Security Checklist

- ✅ Environment variables in `.env.local` (never committed)
- ✅ Access tokens only used server-side
- ✅ Error messages don't leak sensitive data
- ✅ Using Square's official SDK (handles auth, rate limits, retries)

## 📝 Development Notes

### Current Phase: Backend & Tooling Complete ✅
- [x] Project structure setup
- [x] Square SDK integration (v44+ with updated API)
- [x] Type definitions
- [x] API routes (locations, catalog)
- [x] Utility functions
- [x] Automated seed script with location creation
- [x] Multi-location test data (2 locations, location-specific items)

### Next Steps
- [ ] Build UI components (Location switcher, menu grid)
- [ ] Implement client-side location filtering
- [ ] Add loading/error states

### Square API Quirks Discovered
- **SDK v44+ API changes:** Uses `SquareClient`/`SquareEnvironment` (not `Client`/`Environment`)
- **Inconsistent response structures:**
  - `catalog.list()` returns `response.data` (array-like object with numeric keys)
  - `locations.list()` returns `response.locations` (normal array)
- **BigInt serialization:** Money amounts are `BigInt` - require custom JSON serializer for API responses
- **Catalog batch upsert:** Uses `batchUpsert()` with `batches` array, not `upsertCatalogObject()`
- **ID mappings:** `batchUpsert()` returns `idMappings` array to map client IDs (`#name`) to server IDs
- **Location availability:** Item variations must match parent item's `presentAtAllLocations`/`presentAtLocationIds` settings
- `catalog.upsert()` requires `idempotencyKey` for safe retries

---

**Last Updated:** May 10, 2026
**Authored By:** Chandan Mishra
