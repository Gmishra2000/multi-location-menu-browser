# Queue Architecture & Billion-Scale Data Handling

## 🤔 Problem: When Do You Need Queues?

### ❌ **You DON'T Need Queues:**
- Simple menu browser with 100-1000 items
- Single tenant (one restaurant)
- Read-heavy workload (just displaying data)
- Sync operations work fine (< 1 second response time)

### ✅ **You NEED Queues When:**
1. **Processing takes > 5 seconds** (upload images, generate reports)
2. **Rate limiting** (Square allows 10 req/sec, you need 100 req/sec)
3. **Async jobs** (send emails, sync data, webhooks)
4. **High concurrency** (1000s of simultaneous requests)
5. **Billions of records** (need batch processing, partitioning)
6. **Fault tolerance** (retry failed operations)

---

## 📊 Scaling Scenarios

### Scenario 1: Multi-Tenant SaaS (1000s of Restaurants)

**Problem:**
- 5,000 restaurants using your app
- Each has 100-500 menu items
- Total: 2.5 million items
- Each restaurant updates menu daily
- 5,000 Square API calls needed

**Without Queue:**
```typescript
// ❌ BAD: All updates happen synchronously
async function syncAllRestaurants() {
  const restaurants = await db.query('SELECT * FROM tenants');

  for (const restaurant of restaurants) {
    await fetchSquareCatalog(restaurant.squareToken); // 500ms each
  }
  // Total time: 5000 × 500ms = 41 minutes! 🐌
}
```

**With Queue:**
```typescript
// ✅ GOOD: Queue jobs, process in parallel
import { Queue } from 'bullmq';

const syncQueue = new Queue('catalog-sync', {
  connection: { host: 'localhost', port: 6379 }
});

// Add jobs to queue (fast - returns immediately)
async function queueAllRestaurants() {
  const restaurants = await db.query('SELECT * FROM tenants');

  for (const restaurant of restaurants) {
    await syncQueue.add('sync-catalog', {
      restaurantId: restaurant.id,
      squareToken: restaurant.squareToken,
    });
  }
  // Total time: 5000 × 2ms = 10 seconds ⚡
}

// Process jobs in parallel (separate worker process)
const worker = new Worker('catalog-sync', async (job) => {
  const { restaurantId, squareToken } = job.data;

  try {
    const catalog = await fetchSquareCatalog(squareToken);
    await redis.setEx(`restaurant:${restaurantId}:catalog`, 300, JSON.stringify(catalog));
    console.log(`✅ Synced restaurant ${restaurantId}`);
  } catch (error) {
    console.error(`❌ Failed to sync ${restaurantId}:`, error);
    throw error; // BullMQ will retry automatically
  }
}, {
  connection: { host: 'localhost', port: 6379 },
  concurrency: 50, // Process 50 jobs in parallel
});

// Total processing time: 5000 jobs ÷ 50 workers = 100 batches × 500ms = 50 seconds
```

**Benefits:**
- ⚡ 50x faster (50 seconds vs 41 minutes)
- 🔄 Auto-retry on failures
- 📊 Job progress tracking
- 🎯 Rate limiting (respect Square's 10 req/sec limit)

---

### Scenario 2: Handling Square Rate Limits (429 Errors)

**Problem:**
- Square limits: 10 requests/second
- Your app gets 1000 concurrent requests
- Without queue: 990 requests fail with 429 error

**Without Queue:**
```typescript
// ❌ BAD: All requests hit Square API immediately
export async function GET() {
  const catalog = await squareClient.catalog.list(); // Fails with 429
  return NextResponse.json(catalog);
}
```

**With Queue + Rate Limiting:**
```typescript
// ✅ GOOD: Queue requests, throttle to 10/second
import { Queue, Worker } from 'bullmq';
import { RateLimiterRedis } from 'rate-limiter-flexible';

// Rate limiter: 10 requests per second
const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  points: 10,        // 10 requests
  duration: 1,       // per 1 second
  keyPrefix: 'square-api',
});

const catalogQueue = new Queue('catalog-fetch', {
  connection: { host: 'localhost', port: 6379 }
});

// API route: Queue the request instead of calling Square directly
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const types = searchParams.get('types') || 'ITEM,CATEGORY,IMAGE';

  // Add job to queue
  const job = await catalogQueue.add('fetch-catalog', { types }, {
    jobId: `catalog-${types}`, // Deduplicate: same jobId = single job
  });

  // Wait for job to complete (with timeout)
  const result = await job.waitUntilFinished(queueEvents, 30000);

  return NextResponse.json(result);
}

// Worker: Process jobs with rate limiting
const worker = new Worker('catalog-fetch', async (job) => {
  const { types } = job.data;

  // Wait for rate limiter token
  await rateLimiter.consume('square-api', 1);

  // Now safe to call Square API (guaranteed under 10 req/sec)
  const response = await squareClient.catalog.list({ types });
  const catalog = Object.values(response.data || {});

  return catalog;
}, {
  connection: { host: 'localhost', port: 6379 },
  concurrency: 1, // Process 1 job at a time (controlled by rate limiter)
});
```

**Benefits:**
- ✅ No 429 errors (guaranteed under rate limit)
- ✅ All requests eventually succeed (queued)
- ✅ Graceful degradation under high load
- ✅ Monitoring (see queue length, processing time)

---

### Scenario 3: Billions of Menu Item Views (Analytics)

**Problem:**
- 10 million users
- 100 page views per user per month
- 1 billion events per month
- Need to track: item views, search queries, filter usage

**Without Queue:**
```typescript
// ❌ BAD: Write to database on every page view (blocks response)
export async function GET(request: Request) {
  const catalog = await getCatalog();

  // This blocks the response! 🐌
  await db.query(`
    INSERT INTO analytics_events (type, item_id, user_id, timestamp)
    VALUES ('item_view', $1, $2, NOW())
  `, [itemId, userId]);

  return NextResponse.json(catalog); // User waits for DB write
}
```

**With Queue:**
```typescript
// ✅ GOOD: Queue analytics events, batch insert later
import { Queue } from 'bullmq';

const analyticsQueue = new Queue('analytics', {
  connection: { host: 'localhost', port: 6379 }
});

// API route: Queue event (non-blocking)
export async function GET(request: Request) {
  const catalog = await getCatalog();

  // Queue analytics event (returns immediately)
  analyticsQueue.add('track-view', {
    type: 'catalog_view',
    userId: request.headers.get('x-user-id'),
    timestamp: Date.now(),
  });

  return NextResponse.json(catalog); // User gets instant response ⚡
}

// Worker: Batch insert events every 10 seconds
const worker = new Worker('analytics', async (job) => {
  const events = await job.getBatch(1000); // Get 1000 events

  // Batch insert (1 DB query instead of 1000)
  await db.query(`
    INSERT INTO analytics_events (type, user_id, timestamp, data)
    SELECT * FROM json_populate_recordset(null::analytics_events, $1)
  `, [JSON.stringify(events)]);

  console.log(`📊 Inserted ${events.length} analytics events`);
}, {
  connection: { host: 'localhost', port: 6379 },
  concurrency: 5,
});
```

**Benefits:**
- ⚡ Instant API response (no DB write blocking)
- 💰 1000x fewer DB queries (batch inserts)
- 📈 Handles billions of events (horizontal scaling)
- 🔄 Fault tolerant (retries on failure)

---

## 🗂️ Handling Billions of Records: Data Partitioning

### Problem: Query Performance Degrades

**Without Partitioning:**
```sql
-- ❌ BAD: Single table with 1 billion rows
SELECT * FROM menu_items WHERE restaurant_id = 'REST123';
-- Query time: 5-10 seconds (full table scan) 🐌
```

**With Partitioning (PostgreSQL):**
```sql
-- ✅ GOOD: Partition by restaurant_id
CREATE TABLE menu_items (
  id UUID,
  restaurant_id VARCHAR(50),
  name VARCHAR(255),
  price INTEGER,
  created_at TIMESTAMP
) PARTITION BY HASH (restaurant_id);

-- Create 100 partitions
CREATE TABLE menu_items_p0 PARTITION OF menu_items
  FOR VALUES WITH (MODULUS 100, REMAINDER 0);
CREATE TABLE menu_items_p1 PARTITION OF menu_items
  FOR VALUES WITH (MODULUS 100, REMAINDER 1);
-- ... create p2 through p99

-- Now query hits only 1% of data (10 million rows instead of 1 billion)
SELECT * FROM menu_items WHERE restaurant_id = 'REST123';
-- Query time: 50ms ⚡
```

---

### Sharding Strategy (Multi-Database)

**When you have:**
- 10,000+ tenants (restaurants)
- 100 million+ records per tenant
- Single database can't handle load

**Architecture:**
```
┌─────────────────────────────────────────────────┐
│ Application Layer (Next.js)                     │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ Shard Router (determines which DB to query)     │
│                                                  │
│ hash(restaurant_id) % 10 = shard_number         │
└─────────────────────────────────────────────────┘
         ↓          ↓          ↓          ↓
┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
│ DB Shard│  │ DB Shard│  │ DB Shard│  │ DB Shard│
│    0    │  │    1    │  │    2    │  │   ...   │
│         │  │         │  │         │  │         │
│ 1000    │  │ 1000    │  │ 1000    │  │ 1000    │
│ tenants │  │ tenants │  │ tenants │  │ tenants │
└─────────┘  └─────────┘  └─────────┘  └─────────┘
```

**Implementation:**
```typescript
// app/lib/db-router.ts
import { createPool } from '@vercel/postgres';

const dbShards = [
  createPool({ connectionString: process.env.DB_SHARD_0 }),
  createPool({ connectionString: process.env.DB_SHARD_1 }),
  createPool({ connectionString: process.env.DB_SHARD_2 }),
  // ... 10 shards total
];

export function getShardForRestaurant(restaurantId: string) {
  // Hash restaurant ID to determine shard
  const hash = restaurantId.split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0);
  }, 0);

  const shardIndex = hash % dbShards.length;
  return dbShards[shardIndex];
}

// Usage
const db = getShardForRestaurant('REST123');
const items = await db.query('SELECT * FROM menu_items WHERE restaurant_id = $1', ['REST123']);
```

---

## 🔧 Queue Technology Comparison

| Tool | Best For | Pros | Cons |
|------|----------|------|------|
| **BullMQ** | Job queues (cron, retries) | Simple, Redis-backed, great DX | Requires Redis |
| **Amazon SQS** | Cloud-native, serverless | Managed, scales automatically | AWS lock-in, cost |
| **RabbitMQ** | Complex routing, pub/sub | Feature-rich, flexible | Complex setup |
| **Apache Kafka** | Event streaming (billions) | Insane throughput, durability | Overkill for small apps |
| **Google Pub/Sub** | Real-time events | Scales infinitely, low latency | GCP lock-in |

---

## 🏗️ Complete Architecture: Billion-Scale Menu Platform

```
┌──────────────────────────────────────────────────────┐
│ CDN (Cloudflare) - Edge caching                      │
└──────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────┐
│ Load Balancer (AWS ALB)                              │
└──────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────┐
│ Next.js App (10 instances, auto-scaling)             │
│ - API routes                                          │
│ - React UI                                            │
│ - Queue producers (add jobs)                          │
└──────────────────────────────────────────────────────┘
                        ↓
          ┌─────────────┴─────────────┐
          ↓                           ↓
┌────────────────────┐      ┌────────────────────┐
│ Redis Cluster      │      │ PostgreSQL         │
│ - Cache layer      │      │ (10 shards)        │
│ - Queue storage    │      │ - User data        │
│ - Rate limiting    │      │ - Orders           │
└────────────────────┘      │ - Analytics        │
                            └────────────────────┘
          ↓
┌──────────────────────────────────────────────────────┐
│ BullMQ Workers (100 instances)                       │
│ - Catalog sync (from Square)                         │
│ - Image processing                                   │
│ - Analytics aggregation                              │
│ - Email notifications                                │
└──────────────────────────────────────────────────────┘
          ↓
┌──────────────────────────────────────────────────────┐
│ External APIs                                         │
│ - Square (10,000 restaurants × 1 req/5min)          │
│ - Twilio (SMS notifications)                         │
│ - SendGrid (Email)                                   │
└──────────────────────────────────────────────────────┘
```

**Capacity:**
- 100 million requests/day
- 10,000 restaurants
- 5 million menu items
- 1 billion analytics events/month
- 99.99% uptime

---

## 💻 Implementation: BullMQ for Your Menu App

### 1. Install BullMQ

```bash
pnpm add bullmq ioredis
```

### 2. Create Queue Producer (API Route)

```typescript
// app/api/catalog/sync/route.ts
import { Queue } from 'bullmq';
import { NextResponse } from 'next/server';

const catalogSyncQueue = new Queue('catalog-sync', {
  connection: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
});

export async function POST(request: Request) {
  try {
    const { restaurantId } = await request.json();

    // Add job to queue (returns immediately)
    const job = await catalogSyncQueue.add('sync-catalog', {
      restaurantId,
      timestamp: Date.now(),
    }, {
      attempts: 3,          // Retry up to 3 times
      backoff: {
        type: 'exponential',
        delay: 2000,        // Start with 2 seconds, double each retry
      },
      removeOnComplete: 100, // Keep last 100 completed jobs
      removeOnFail: 500,     // Keep last 500 failed jobs
    });

    return NextResponse.json({
      jobId: job.id,
      message: 'Catalog sync queued',
    });
  } catch (error) {
    console.error('Error queueing catalog sync:', error);
    return NextResponse.json({ error: 'Failed to queue sync' }, { status: 500 });
  }
}
```

### 3. Create Worker (Separate Process)

```typescript
// workers/catalog-sync-worker.ts
import { Worker, Job } from 'bullmq';
import { squareClient } from '../app/lib/square';
import { redisClient } from '../app/lib/redis';

const worker = new Worker('catalog-sync', async (job: Job) => {
  const { restaurantId } = job.data;

  console.log(`🔄 Processing job ${job.id} for restaurant ${restaurantId}`);

  try {
    // Fetch catalog from Square
    const response = await squareClient.catalog.list({
      types: 'ITEM,CATEGORY,IMAGE',
    });

    const catalog = Object.values(response.data || {});

    // Cache in Redis
    await redisClient.setEx(
      `restaurant:${restaurantId}:catalog`,
      300, // 5 minutes
      JSON.stringify(catalog)
    );

    console.log(`✅ Synced ${catalog.length} items for restaurant ${restaurantId}`);

    return {
      success: true,
      itemCount: catalog.length,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error(`❌ Failed to sync restaurant ${restaurantId}:`, error);
    throw error; // BullMQ will retry
  }
}, {
  connection: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
  concurrency: 10, // Process 10 jobs in parallel
  limiter: {
    max: 10,       // Max 10 jobs
    duration: 1000, // per second (respects Square's rate limit)
  },
});

// Event handlers
worker.on('completed', (job) => {
  console.log(`✅ Job ${job.id} completed`);
});

worker.on('failed', (job, error) => {
  console.error(`❌ Job ${job?.id} failed:`, error);
});

worker.on('error', (error) => {
  console.error('Worker error:', error);
});

console.log('🚀 Catalog sync worker started');
```

### 4. Run Worker Process

```json
// package.json
{
  "scripts": {
    "dev": "next dev",
    "worker": "tsx watch workers/catalog-sync-worker.ts",
    "dev:all": "concurrently \"pnpm dev\" \"pnpm worker\""
  }
}
```

```bash
# Terminal 1: Next.js app
pnpm dev

# Terminal 2: Worker process
pnpm worker

# Or run both together
pnpm dev:all
```

---

## 🧪 Testing Queue Flow

```bash
# 1. Start Redis
redis-server

# 2. Start Next.js + Worker
pnpm dev:all

# 3. Trigger catalog sync
curl -X POST http://localhost:3000/api/catalog/sync \
  -H "Content-Type: application/json" \
  -d '{"restaurantId": "REST123"}'

# Response:
# {"jobId": "1", "message": "Catalog sync queued"}

# 4. Check worker logs
# Worker output:
# 🔄 Processing job 1 for restaurant REST123
# ✅ Synced 42 items for restaurant REST123
# ✅ Job 1 completed
```

---

## 📊 Queue Monitoring Dashboard

**BullMQ Board** (Web UI):
```bash
pnpm add @bull-board/api @bull-board/nextjs

# Add route: app/api/admin/queues/[[...path]]/route.ts
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { NextAdapter } from '@bull-board/nextjs';
import { catalogSyncQueue } from '@/app/lib/queues';

const serverAdapter = new NextAdapter();

createBullBoard({
  queues: [new BullMQAdapter(catalogSyncQueue)],
  serverAdapter,
});

export const GET = serverAdapter.getRequestHandler();
export const POST = serverAdapter.getRequestHandler();

# Visit: http://localhost:3000/api/admin/queues
# See: Active jobs, completed jobs, failed jobs, retry counts
```

---

## 🎯 Interview Answer

**Q: "What if you had billions of records? When would you use queues?"**

**A:**
> "Queues become critical when you need async processing, rate limiting, or fault tolerance.
>
> **Example: Multi-tenant SaaS with 10,000 restaurants:**
>
> Without queues, syncing all catalogs takes 41 minutes sequentially. With BullMQ:
> - Queue 10,000 jobs in 20 seconds
> - Process 50 in parallel with rate limiting (respect Square's 10 req/sec)
> - Auto-retry failures
> - Complete in ~3 minutes
>
> **Billion-scale data strategies:**
>
> 1. **Database partitioning:** Hash-partition by `restaurant_id` across 100 partitions. Queries hit 1% of data instead of 100%.
>
> 2. **Sharding:** Distribute 10,000 tenants across 10 database shards. Each shard handles 1,000 tenants.
>
> 3. **Event streaming:** Use Kafka for billions of analytics events. Batch process into data warehouse (Snowflake/BigQuery).
>
> **For this menu browser specifically:**
>
> I'd use queues for:
> - Webhook processing (decouple from HTTP request/response)
> - Batch catalog syncs (if multi-tenant)
> - Analytics event ingestion (track views without blocking API)
>
> The key is choosing the right tool for the scale. BullMQ for job queues, Kafka for event streams, partitioning for query performance."

**Why this impresses:**
- ✅ Concrete examples with numbers
- ✅ Understands multiple scaling strategies
- ✅ Knows when to use each tool
- ✅ Balances simplicity vs. complexity

---

## ✅ Recommendation for Your Interview

**Don't implement queues for the demo** - your current app doesn't need them.

**Instead, mention when asked:**
> "For this single-tenant demo, queues would be over-engineering. But in production with multi-tenant SaaS, I'd use BullMQ for catalog syncs and webhook processing to handle rate limits and ensure fault tolerance."

This shows you understand:
- ✅ When to add complexity
- ✅ When NOT to add complexity
- ✅ Scaling patterns for production

---

## 📚 Further Reading

- **BullMQ Docs:** https://docs.bullmq.io/
- **Database Partitioning:** https://www.postgresql.org/docs/current/ddl-partitioning.html
- **Sharding Strategies:** https://aws.amazon.com/what-is/database-sharding/
- **Rate Limiting Patterns:** https://github.com/animir/node-rate-limiter-flexible
