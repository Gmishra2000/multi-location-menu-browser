# Cache Synchronization Strategies

## Problem: Stale Data

With server-side caching (5-10 minute revalidation), data can be stale for that duration after Square catalog updates.

---

## ✅ Solution 1: Square Webhooks (Production)

**How it works:**
1. Square sends real-time notifications when catalog/location data changes
2. Your webhook endpoint receives the event
3. `revalidateTag()` clears the cache immediately
4. Next request fetches fresh data from Square

**Setup:**

1. **Add webhook signature key to `.env.local`:**
   ```bash
   SQUARE_WEBHOOK_SIGNATURE_KEY=your_signature_key_from_square_dashboard
   ```

2. **Register webhook in Square Dashboard:**
   - Go to: https://developer.squareup.com/apps
   - Select your app → Webhooks
   - Add webhook URL: `https://yourdomain.com/api/webhooks/square`
   - Subscribe to events:
     - `catalog.version.updated`
     - `location.updated`
     - `location.created`
   - Copy the "Signature Key" to `.env.local`

3. **Deploy and test:**
   ```bash
   # Update a menu item in Square Dashboard
   # Your app cache invalidates within ~1 second
   ```

**Pros:**
- ⚡ Real-time sync (sub-second latency)
- 🔒 Secure (signature verification)
- 🚀 Production-ready
- 💰 Free (no polling needed)

**Cons:**
- 🔧 Requires webhook configuration
- 🌐 Needs public URL (use ngrok for local testing)

---

## ✅ Solution 2: Manual Revalidation (Dev/Testing)

**How it works:**
Call a manual endpoint to clear cache on-demand.

**Usage:**

```bash
# Clear all caches
curl -X POST http://localhost:3000/api/revalidate

# Clear specific cache
curl -X POST http://localhost:3000/api/revalidate?tag=catalog
curl -X POST http://localhost:3000/api/revalidate?tag=locations
```

**Workflow:**
1. Update data in Square Dashboard
2. Run `curl -X POST http://localhost:3000/api/revalidate`
3. Refresh your app - fresh data loads

**Pros:**
- ✅ Simple for development
- ✅ No external setup needed
- ✅ Good for demos

**Cons:**
- ❌ Manual process (not automated)
- ❌ Not suitable for production

---

## ✅ Solution 3: Accept Staleness (MVP)

**How it works:**
Live with 5-10 minutes of stale data.

**When acceptable:**
- 🍕 Menu items don't change frequently (daily/weekly updates)
- 📱 MVP/demo phase
- 👥 Small business with manual control

**Tradeoffs:**
- ✅ Zero additional code
- ✅ 99% reduction in API calls
- ⏱️ Max 5 minutes staleness (usually less)

**Reality check:**
Most menu apps update items daily, not real-time. Your customers won't notice 5-minute staleness.

---

## 🎯 Recommendation

| Stage | Strategy | Why |
|-------|----------|-----|
| **Development** | Manual revalidation | Quick testing, no setup |
| **Demo/Interview** | Accept staleness | Simple, shows caching knowledge |
| **Production** | Square webhooks | Real-time, scalable, professional |

---

## 🧪 Testing Webhooks Locally

Use ngrok to expose localhost for Square webhooks:

```bash
# Install ngrok
brew install ngrok

# Expose port 3000
ngrok http 3000

# Copy ngrok URL (e.g., https://abc123.ngrok.io)
# Use in Square Dashboard: https://abc123.ngrok.io/api/webhooks/square
```

---

## 🔍 Interview Answer Template

**Q: "How do you handle stale data with caching?"**

**A:**
> "I implemented three sync strategies:
>
> 1. **Square Webhooks (production):** Square sends real-time notifications when catalog data changes. My webhook endpoint receives the event and calls `revalidateTag()` to invalidate the cache immediately. This gives sub-second sync with 99% fewer API calls.
>
> 2. **Manual revalidation (dev):** For testing, I created a POST endpoint that clears the cache on-demand. Useful for development and demos.
>
> 3. **Acceptable staleness (MVP):** For a menu app, 5 minutes of staleness is acceptable since items don't change frequently. This is the simplest approach for an MVP.
>
> For production, I'd use Square webhooks. The signature verification ensures security, and the automatic cache invalidation keeps data fresh without polling."

**Why this impresses:**
- ✅ Multiple solutions (shows depth)
- ✅ Production focus (webhooks)
- ✅ Practical tradeoffs (staleness acceptable for MVP)
- ✅ Security awareness (signature verification)
- ✅ Actually implemented the code

---

## 📊 Performance Comparison

| Strategy | API Calls | Staleness | Complexity |
|----------|-----------|-----------|------------|
| No caching | 1000/min | 0s | Low |
| Caching only | 1/5min | 0-300s | Low |
| **Caching + Webhooks** | 1/5min | ~1s | Medium |
| Polling | 12/min | ~5s | Medium |

**Winner:** Caching + Webhooks (best of all worlds)

---

## 🚀 Next Steps

1. **For your interview:** Mention all three strategies, emphasize you'd use webhooks in production
2. **For the Loom video:** Demo manual revalidation (easy to show)
3. **Post-interview:** Set up ngrok and test webhooks if you want to learn more
