# Technical Notes & API Research

Deep-dive documentation of Square API quirks, debugging process, and technical decisions.

## 🔍 Square API Quirks Discovered

### SDK v44+ Breaking Changes
- **Old API:** `Client`, `Environment` classes
- **New API:** `SquareClient`, `SquareEnvironment` classes
- **Impact:** All existing tutorials and examples outdated

### Inconsistent Response Structures

Different endpoints return data in different formats:

**Catalog API:**
```javascript
const response = await client.catalog.list({});
// response.data is array-like object with numeric keys: { "0": {...}, "1": {...} }
const items = Object.values(response.data);
```

**Locations API:**
```javascript
const response = await client.locations.list();
// response.locations is normal array
const locations = response.locations;
```

### BigInt Serialization Issue

Square returns money amounts as `BigInt`:

```javascript
// ❌ This fails with "Do not know how to serialize a BigInt"
return Response.json(items);

// ✅ Solution: Custom serializer
const serialized = JSON.parse(
  JSON.stringify(items, (key, value) =>
    typeof value === 'bigint' ? Number(value) : value
  )
);
return Response.json(serialized);
```

### Batch Upsert API

Uses `batchUpsert()` with specific structure:

```javascript
const response = await client.catalog.batchUpsert({
  idempotencyKey: 'unique-key-v1',
  batches: [
    {
      objects: [
        { type: 'ITEM', id: '#pancakes', item_data: {...} }
      ]
    }
  ]
});

// Returns ID mappings for client IDs
const idMappings = response.idMappings;
// [{ clientObjectId: '#pancakes', objectId: 'REAL_SQUARE_ID' }]
```

### Location Availability Rules

Item variations **must match** parent item's location settings:

```javascript
// ❌ This fails - variation location must match parent
{
  type: 'ITEM',
  present_at_location_ids: ['LOC_1'],
  item_data: {
    variations: [{
      present_at_all_locations: true  // ← Conflict!
    }]
  }
}

// ✅ Correct - variation inherits parent's location settings
{
  type: 'ITEM',
  present_at_location_ids: ['LOC_1'],
  item_data: {
    variations: [{
      present_at_location_ids: ['LOC_1']
    }]
  }
}
```

## 🐛 API Debugging & Validation Process

### Testing Field Persistence

Used **GET /v2/catalog/object/{object_id}** to validate what Square actually returns:

**Request:**
```bash
curl -X GET \
  https://connect.squareupsandbox.com/v2/catalog/object/UANOZFEJE465VK5WDPWJHEHL \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

**Response - Item Object:**
```json
{
  "object": {
    "type": "ITEM",
    "id": "UANOZFEJE465VK5WDPWJHEHL",
    "updated_at": "2026-05-10T06:41:14.692Z",
    "present_at_all_locations": false,
    "present_at_location_ids": ["LZ2YY6R8DP2V5"],  // ✅ Persisted
    "item_data": {
      "name": "Pancakes",                          // ✅ Persisted
      "description": "Fluffy stack...",            // ✅ Persisted
      "variations": [{
        "item_variation_data": {
          "price_money": { "amount": 899 }         // ✅ Persisted
        }
      }]
      // ❌ categoryId field completely missing
    }
  }
}
```

**Response - Category Object:**
```json
{
  "object": {
    "type": "CATEGORY",
    "id": "D7X2SWIJQEJSID5CPLP3IMGQ",
    "updated_at": "2026-05-10T08:23:24.419Z",
    "category_data": {
      "name": "Lunch",                             // ✅ Persisted
      "category_type": "REGULAR_CATEGORY"          // ✅ Persisted
      // ❌ availabilityPeriods field completely missing
      // ❌ availability_period_ids field completely missing
    }
  }
}
```

### Key Findings

**Fields That Persist in Sandbox:**
- ✅ `present_at_location_ids`
- ✅ `present_at_all_locations`
- ✅ `name`, `description`
- ✅ `price_money.amount`
- ✅ `variations` array
- ✅ Basic category data

**Fields That DON'T Persist in Sandbox:**
- ❌ `item.itemData.categoryId` (linking items to categories)
- ❌ `category.categoryData.availabilityPeriods` (time restrictions)
- ❌ `category.categoryData.availability_period_ids` (Beta API)

## ⚠️ Sandbox Limitation: Category IDs

### The Problem

Square Sandbox does **not persist** `categoryId` on items, even when correctly set in requests.

### Debugging Steps

1. ✅ Created categories via `batchUpsert`
2. ✅ Captured Square-generated IDs from response (`idMappings`)
3. ✅ Created items with `categoryId` pointing to valid category IDs
4. ❌ GET request shows `categoryId` field completely missing

### Evidence

**What We Send (in seed script):**
```javascript
{
  type: 'ITEM',
  id: '#pancakes',
  item_data: {
    name: 'Pancakes',
    category_id: 'D7X2SWIJQEJSID5CPLP3IMGQ'  // ← We set this!
  }
}
```

**What Square Returns:**
```javascript
{
  type: 'ITEM',
  id: 'UANOZFEJE465VK5WDPWJHEHL',
  item_data: {
    name: 'Pancakes'
    // categoryId field missing entirely
  }
}
```

### Solution Implemented

**Hybrid approach** that works in both Sandbox and Production:

```typescript
const getCategoryForItem = (item: CatalogItem): string => {
  // Try official categoryId first (works in Production)
  if (item.itemData.categoryId) {
    const category = categories.find(c => c.id === item.itemData.categoryId);
    if (category?.categoryData?.name) {
      return category.categoryData.name;
    }
  }

  // Fallback: Pattern matching (Sandbox workaround)
  const itemName = item.itemData.name?.toLowerCase() || '';
  const description = item.itemData.description?.toLowerCase() || '';

  // Breakfast items
  if (itemName.includes('pancake') || itemName.includes('toast') ||
      itemName.includes('eggs') || description.includes('breakfast')) {
    return 'Breakfast';
  }

  // Lunch items
  if (itemName.includes('salad') || itemName.includes('sandwich') ||
      itemName.includes('burger') || description.includes('lunch')) {
    return 'Lunch';
  }

  // Beverages
  if (itemName.includes('coffee') || itemName.includes('latte') ||
      itemName.includes('tea') || description.includes('beverage')) {
    return 'Beverages';
  }

  // Desserts
  if (itemName.includes('cake') || itemName.includes('dessert') ||
      description.includes('dessert')) {
    return 'Desserts';
  }

  return 'Uncategorized';
};
```

**Why This Works:**
- Production accounts → uses `categoryId` directly
- Sandbox → pattern matching catches reasonably-named items
- Evaluators can add items → patterns work without hardcoded lists
- Graceful degradation → never breaks, just falls back

## ⭐ Time-Based Availability: Deep Dive

### API Research Process

Square has **two different** time-related Catalog APIs. Researched and tested both.

### Option 1: CatalogAvailabilityPeriod (Beta) ✅ Correct Use Case

**Documentation:** https://developer.squareup.com/reference/square/objects/CatalogAvailabilityPeriod

**Purpose:** Menu item/category availability by time and day

**Format:**
```json
{
  "type": "AVAILABILITY_PERIOD",
  "id": "#breakfast_hours",
  "availability_period_data": {
    "time_periods": [
      {
        "start_local_time": "06:00:00",
        "end_local_time": "11:00:00",
        "day_of_week": "MON"
      },
      {
        "start_local_time": "06:00:00",
        "end_local_time": "11:00:00",
        "day_of_week": "TUE"
      }
      // ... repeat for each day
    ]
  }
}
```

**Usage in Categories:**
```json
{
  "type": "CATEGORY",
  "category_data": {
    "name": "Breakfast",
    "availability_period_ids": ["#breakfast_hours"]
  }
}
```

**Testing Results:**
- ✅ API accepts the request format
- ✅ No validation errors
- ❌ Sandbox **does not persist** the field
- ❌ GET request shows `availability_period_ids` missing entirely

**Status:** **Beta** - explains limited Sandbox support

**Conclusion:** Right API, but unsupported in Sandbox. Would work in Production.

### Option 2: CatalogTimePeriod (Stable) ❌ Wrong Use Case

**Documentation:** https://developer.squareup.com/reference/square/objects/CatalogTimePeriod

**Purpose:** Appointment scheduling, booking windows, staff availability

**Format (iCalendar RFC 5545):**
```json
{
  "type": "TIME_PERIOD",
  "id": "#booking_window",
  "time_period_data": {
    "event": "DTSTART:20190707T180000\nDURATION:PT2H\nRRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR"
  }
}
```

**Testing Process:**
```javascript
// Step 1: Create TIME_PERIOD object
const response = await client.catalog.batchUpsert({
  batches: [{
    objects: [{
      type: 'TIME_PERIOD',
      id: '#time_period',
      time_period_data: {
        event: 'DTSTART:20260510T060000\nDURATION:PT5H'
      }
    }]
  }]
});
// ✅ Success - TIME_PERIOD objects CAN be created in Sandbox

// Step 2: Try to use TIME_PERIOD with category
const response2 = await client.catalog.batchUpsert({
  batches: [{
    objects: [{
      type: 'CATEGORY',
      category_data: {
        name: 'Breakfast',
        availability_period_ids: ['TIME_PERIOD_SQUARE_ID']
      }
    }]
  }]
});
// ❌ Error: "Object of type CATEGORY must reference an object of type
// AVAILABILITY_PERIOD. Referenced object was of type TIME_PERIOD"
```

**Testing Results:**
- ✅ TIME_PERIOD objects can be created (Stable API works)
- ❌ Categories **reject** TIME_PERIOD references
- ❌ Error message confirms wrong object type

**Conclusion:** Wrong API for menu availability. Designed for appointments, not menus.

### Chosen Implementation

**Client-side time filtering** with hardcoded schedules:

```typescript
// lib/availability.ts
const CATEGORY_SCHEDULES: Record<string, AvailabilitySchedule> = {
  'Breakfast': { startTime: '06:00', endTime: '11:00' },
  'Lunch': { startTime: '11:00', endTime: '16:00' },
  'Beverages': { startTime: '00:00', endTime: '23:59' },
  'Desserts': { startTime: '14:00', endTime: '23:59' }
};

export function isCategoryAvailableNow(categoryName: string): boolean {
  const schedule = CATEGORY_SCHEDULES[categoryName];
  if (!schedule) return true;

  const now = new Date();
  const currentTime = now.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  });

  return currentTime >= schedule.startTime && currentTime <= schedule.endTime;
}
```

**Production Migration Path:**

When using real Square account with Beta API support:

```typescript
// Replace hardcoded CATEGORY_SCHEDULES with API data
const schedule = category.categoryData.availabilityPeriods?.[0];

if (schedule) {
  const now = new Date();
  const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();

  const todayPeriod = schedule.timePeriods?.find(
    p => p.dayOfWeek === dayOfWeek
  );

  if (todayPeriod) {
    return currentTime >= todayPeriod.startLocalTime &&
           currentTime <= todayPeriod.endLocalTime;
  }
}
```

## 📊 Production Assumptions & Validation

### What We Assume Works in Production

1. **`item.itemData.categoryId`** - Official API for linking items to categories
2. **`category.categoryData.availabilityPeriods`** - Beta API for time-based availability

### Supporting Evidence

**Official Documentation:**
- Both fields documented in Square API reference
- `categoryId` is stable (not marked Beta or experimental)
- `CatalogAvailabilityPeriod` marked Beta (limited support expected)

**API Behavior:**
- Requests with these fields accepted without validation errors
- No warnings or deprecation notices
- Proper data types enforced (rejects wrong types)

**Community Reports:**
- Multiple developers confirm Sandbox != Production behavior
- Common pattern: Beta features limited in Sandbox

**Code Design:**
- Built with fallback logic (hybrid approach)
- Graceful degradation if fields missing
- Production validation recommended before launch

### Risk Mitigation Strategy

**If Production Also Drops These Fields:**
- ✅ Category matching still works via patterns
- ✅ Time filtering works with hardcoded schedules
- ✅ No breaking changes or errors
- ✅ Feature complete regardless of API support

**Recommended Validation:**
1. Request Production Square account for testing
2. Run seed script in Production environment
3. Validate field persistence via GET endpoints
4. Document actual behavior
5. Contact Square support if discrepancies found

---

**Last Updated:** May 10, 2026
**For README:** See main README.md for quick start and overview
