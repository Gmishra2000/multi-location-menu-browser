# Redis Caching Architecture

## Overview

Redis serves as a **cache layer** between your Next.js app and Square API, reducing API calls by 99%+ while keeping data fresh.

**Data Flow:**
```
User Request → Next.js API → Redis (check) → Square API (if miss) → Redis (store) → Response
                              ↓ (if hit)
                           Return cached data
```

---

## 🗂️ Redis Schema Design

### Key Naming Convention

```
square:{resource}:{id}:{version}
```

**Examples:**
```
square:catalog:full         → Full catalog (items + categories + images)
square:locations:all        → All active locations
square:item:ABC123          → Individual item by ID
square:category:XYZ789      → Individual category by ID
square:version              → Catalog version number from Square
```

---

## 📊 Data Structure by Key

### 1. **Full Catalog** (Most Common)

**Key:** `square:catalog:full`
**Type:** String (JSON)
**TTL:** 300 seconds (5 minutes)
**Value:**
```json
{
  "items": [
    {
      "id": "ITEM123",
      "itemData": {
        "name": "Pancakes",
        "description": "Fluffy pancakes",
        "categories": [{"id": "CAT456", "ordinal": 0}],
        "variations": [
          {
            "id": "VAR789",
            "itemVariationData": {
              "priceMoney": {"amount": 899, "currency": "USD"}
            }
          }
        ]
      }
    }
  ],
  "categories": [
    {
      "id": "CAT456",
      "categoryData": {"name": "Breakfast"}
    }
  ],
  "images": [
    {
      "id": "IMG101",
      "imageData": {"url": "https://..."}
    }
  ]
}
```

**Why JSON string?**
- Single atomic GET/SET operation
- Matches your API response format exactly
- Simpler than Redis Hash for nested data

---

### 2. **Locations**

**Key:** `square:locations:all`
**Type:** String (JSON)
**TTL:** 600 seconds (10 minutes)
**Value:**
```json
[
  {
    "id": "LOC123",
    "name": "Downtown Cafe",
    "address": {"addressLine1": "123 Main St"},
    "status": "ACTIVE"
  },
  {
    "id": "LOC456",
    "name": "Default Test Account",
    "status": "ACTIVE"
  }
]
```

---

### 3. **Catalog Version** (For Cache Invalidation)

**Key:** `square:catalog:version`
**Type:** String
**TTL:** None (permanent)
**Value:** `"1234567890"`

**How it works:**
1. Square returns `version` in catalog responses
2. Store version in Redis
3. On next request, compare versions
4. If different → invalidate cache, fetch fresh data

---

### 4. **Individual Items** (Advanced - For Item Detail Pages)

**Key:** `square:item:{itemId}`
**Type:** String (JSON)
**TTL:** 300 seconds
**Value:**
```json
{
  "id": "ITEM123",
  "itemData": {
    "name": "Pancakes",
    "description": "Fluffy pancakes",
    "variations": [...]
  }
}
```

**When to use:**
- If you add item detail pages (`/item/[id]`)
- To avoid fetching full catalog for single item lookup

---

## 🔄 Cache Strategy: Read-Through Pattern

### Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│ User requests /api/catalog                               │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 1. Check Redis: GET square:catalog:full                 │
└─────────────────────────────────────────────────────────┘
                        ↓
              ┌─────────┴─────────┐
              │                   │
         Cache HIT           Cache MISS
              │                   │
              ↓                   ↓
    ┌─────────────────┐   ┌──────────────────┐
    │ Return cached   │   │ Call Square API  │
    │ data instantly  │   │ (500ms latency)  │
    └─────────────────┘   └──────────────────┘
                                  ↓
                          ┌──────────────────┐
                          │ Store in Redis:  │
                          │ SET square:      │
                          │ catalog:full     │
                          │ EX 300           │
                          └──────────────────┘
                                  ↓
                          ┌──────────────────┐
                          │ Return fresh data│
                          └──────────────────┘
```

---

## 💻 Implementation: Redis + Next.js

### Setup Redis Client

```typescript
// app/lib/redis.ts
import { createClient } from 'redis';

// Create Redis client (singleton pattern)
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        console.error('❌ Redis: Max reconnect attempts reached');
        return new Error('Redis unavailable');
      }
      return retries * 100; // Exponential backoff
    },
  },
});

redisClient.on('error', (err) => console.error('Redis Error:', err));
redisClient.on('connect', () => console.log('✅ Redis connected'));

// Connect on first import
if (!redisClient.isOpen) {
  redisClient.connect();
}

export { redisClient };
```

---

### Updated Catalog Route with Redis

```typescript
// app/api/catalog/route.ts
import { NextResponse } from 'next/server';
import { squareClient } from '@/app/lib/square';
import { redisClient } from '@/app/lib/redis';

const CACHE_KEY = 'square:catalog:full';
const CACHE_TTL = 300; // 5 minutes

export async function GET() {
  try {
    // 1. Try Redis cache first
    const cached = await redisClient.get(CACHE_KEY);
    if (cached) {
      console.log('⚡ Cache HIT - returning from Redis');
      return NextResponse.json(JSON.parse(cached));
    }

    console.log('🔄 Cache MISS - fetching from Square API');

    // 2. Cache miss - fetch from Square
    const response = await squareClient.catalog.list({
      types: 'ITEM,CATEGORY,IMAGE',
    });

    const catalogArray = response.data ? Object.values(response.data) : [];
    const catalogObjects = catalogArray.filter(Boolean);

    // 3. Separate by type (your existing deduplication logic)
    const items: unknown[] = [];
    const categories: unknown[] = [];
    const images: unknown[] = [];

    const itemsByName = new Map();
    catalogObjects.forEach((obj: any) => {
      if (obj.type === 'ITEM') {
        const name = obj.itemData?.name || 'Unknown';
        const existing = itemsByName.get(name);
        if (!existing || obj.updatedAt > existing.updatedAt) {
          itemsByName.set(name, obj);
        }
      } else if (obj.type === 'CATEGORY') {
        categories.push(obj);
      } else if (obj.type === 'IMAGE') {
        images.push(obj);
      }
    });

    itemsByName.forEach((item) => items.push(item));

    const result = {
      items: serializeCatalogObject(items),
      categories: serializeCatalogObject(categories),
      images: serializeCatalogObject(images),
    };

    // 4. Store in Redis with TTL
    await redisClient.setEx(CACHE_KEY, CACHE_TTL, JSON.stringify(result));
    console.log(`💾 Cached in Redis (TTL: ${CACHE_TTL}s)`);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching catalog:', error);

    // Redis failure? Fallback to Square API directly
    if (error instanceof Error && error.message.includes('Redis')) {
      console.warn('⚠️ Redis unavailable - bypassing cache');
      // ... direct Square API call without caching
    }

    return NextResponse.json(
      { error: 'Failed to fetch catalog' },
      { status: 500 },
    );
  }
}

function serializeCatalogObject(obj: unknown): unknown {
  return JSON.parse(
    JSON.stringify(obj, (key, value) =>
      typeof value === 'bigint' ? Number(value) : value,
    ),
  );
}
```

---

### Webhook: Invalidate Cache on Square Updates

```typescript
// app/api/webhooks/square/route.ts (updated)
import { NextRequest, NextResponse } from 'next/server';
import { redisClient } from '@/app/lib/redis';

export async function POST(request: NextRequest) {
  try {
    const event = await request.json();
    console.log('📨 Square webhook received:', event.type);

    switch (event.type) {
      case 'catalog.version.updated':
        // Invalidate Redis cache
        await redisClient.del('square:catalog:full');
        console.log('🗑️ Redis cache invalidated');
        break;

      case 'location.updated':
      case 'location.created':
        await redisClient.del('square:locations:all');
        console.log('🗑️ Locations cache invalidated');
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 });
  }
}
```

---

## 🆚 Redis vs Database Comparison

| Factor | Redis | PostgreSQL/MySQL | Square API |
|--------|-------|------------------|------------|
| **Purpose** | Cache layer | Persistent storage | Source of truth |
| **Data lifespan** | 5-10 minutes | Permanent | Permanent |
| **Speed** | <1ms | 5-50ms | 300-500ms |
| **Data loss** | Acceptable | Not acceptable | N/A |
| **Cost** | $10-30/month | $20-100/month | Free (Sandbox) |
| **Complexity** | Low | Medium | N/A |

---

## 🏗️ When to Add a Database

**Add PostgreSQL/MySQL if you need:**

1. **User-generated data:**
   - Order history
   - User favorites/wishlists
   - Customer reviews
   - Saved payment methods

2. **Analytics/tracking:**
   - Page views per item
   - Search query logs
   - A/B test data

3. **Custom business logic:**
   - Loyalty points
   - Promotional pricing (override Square prices)
   - Multi-tenant data (franchise model)

4. **Offline capability:**
   - Store Square data locally
   - Sync when API is down
   - Audit trail

**Example schema if you added user features:**

```sql
-- PostgreSQL schema
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE favorites (
  user_id UUID REFERENCES users(id),
  square_item_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, square_item_id)
);

CREATE TABLE orders (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  square_order_id VARCHAR(255),
  total_amount INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**But for your menu browser: NOT NEEDED!**

---

## 🚀 Deployment Options

### Option 1: Redis Cloud (Recommended)

**Upstash** (Serverless Redis):
```bash
# Free tier: 10,000 commands/day
# Perfect for this app

# Add to .env.local:
REDIS_URL=rediss://default:xxx@xxx.upstash.io:6379
```

**Pros:**
- ✅ Serverless (pay per request)
- ✅ Free tier generous
- ✅ Global edge caching
- ✅ No maintenance

---

### Option 2: Self-Hosted Redis

**Docker Compose:**
```yaml
# docker-compose.yml
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

volumes:
  redis_data:
```

---

## 📊 Performance Metrics

**With Redis caching:**

| Metric | Without Cache | With Redis | Improvement |
|--------|--------------|------------|-------------|
| API response time | 500ms | 5ms | 100x faster |
| Square API calls | 1000/min | 1/5min | 99.98% ↓ |
| Monthly API quota | 500,000 | 5,000 | 99% saved |
| User experience | Slow | Instant | ⚡ |

---

## 🎯 Interview Answer

**Q: "Would you use Redis? Why or why not?"**

**A:**
> "For this menu browser, I'd use **Redis as a cache layer** between Next.js and Square API, but **no database**.
>
> Here's why:
>
> **Redis schema:**
> - Key `square:catalog:full` stores the full catalog JSON with 5-minute TTL
> - Key `square:locations:all` stores locations with 10-minute TTL
> - This reduces Square API calls by 99% while keeping data fresh
>
> **Why no database?**
> - Square API is already the source of truth for menu data
> - We're just displaying data, not storing user orders or favorites
> - Adding PostgreSQL would be over-engineering for a read-only menu
>
> **When I'd add a database:**
> - If we added user accounts → store user preferences
> - If we processed orders → store order history
> - If we needed analytics → track item views
>
> **Cache invalidation:**
> - Square webhooks call `DELETE square:catalog:full` when data changes
> - This gives sub-second sync with 99%+ cache hit rate
>
> For production, I'd use Upstash (serverless Redis) - free tier handles this traffic easily."

---

## 📁 Files to Create (If Implementing Redis)

1. **`app/lib/redis.ts`** - Redis client singleton
2. **Update `app/api/catalog/route.ts`** - Add Redis read-through cache
3. **Update `app/api/locations/route.ts`** - Add Redis cache
4. **Update `app/api/webhooks/square/route.ts`** - Add cache invalidation
5. **`package.json`** - Add `redis` dependency

---

## 🧪 Testing Redis Locally

```bash
# 1. Install Redis
brew install redis

# 2. Start Redis server
redis-server

# 3. Install npm package
pnpm add redis

# 4. Test in Redis CLI
redis-cli
> SET square:catalog:full '{"test": "data"}'
> GET square:catalog:full
> TTL square:catalog:full
> DEL square:catalog:full
```

---

## ✅ Recommendation for Your Interview

**Don't implement Redis for the demo** - it's over-engineering for a take-home.

**Instead, mention it when asked:**
> "I used Next.js's built-in `unstable_cache` which gives 99% of Redis benefits with zero infrastructure. In production, I'd switch to Redis for distributed caching across multiple Next.js instances."

**This shows:**
- ✅ You understand caching architecture
- ✅ You make pragmatic engineering decisions (YAGNI principle)
- ✅ You know when to add complexity vs. when to keep it simple
