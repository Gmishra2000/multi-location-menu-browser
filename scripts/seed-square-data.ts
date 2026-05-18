/**
 * Seed Script for Square Sandbox
 *
 * Creates test catalog data:
 * - 4 categories (Breakfast, Lunch, Beverages, Desserts)
 * - 6-8 menu items with varying location availability
 *
 * Run with: pnpm seed
 */

import { SquareClient, SquareEnvironment } from 'square';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const client = new SquareClient({
  environment: SquareEnvironment.Sandbox,
  token: process.env.SQUARE_ACCESS_TOKEN!,
});

async function seedData() {
  try {
    console.log('🌱 Starting Square Sandbox data seed...\n');

    // Generate unique timestamp for idempotency keys (forces fresh creation)
    const timestamp = Date.now();
    console.log(`📌 Using timestamp: ${timestamp}\n`);

    // Step 1: Fetch existing locations
    console.log('📍 Fetching locations...');
    const locationsResponse = await client.locations.list();
    const locations = locationsResponse.locations || [];

    if (locations.length === 0) {
      console.error('❌ No locations found. Create at least one location in Square Dashboard first.');
      process.exit(1);
    }

    console.log(`✅ Found ${locations.length} location(s):`);
    locations.forEach((loc) => {
      console.log(`   - ${loc.name} (${loc.id})`);
    });

    // Step 1b: Create a second location if only 1 exists (for multi-location demo)
    let allLocations = [...locations];

    if (locations.length === 1) {
      console.log('\n🏗️  Only 1 location found. Creating a second location for multi-location demo...');

      try {
        const newLocationResponse = await client.locations.create({
          location: {
            name: 'Downtown Cafe',
            address: {
              addressLine1: '123 Main Street',
              locality: 'San Francisco',
              administrativeDistrictLevel1: 'CA',
              postalCode: '94102',
              country: 'US',
            },
            timezone: 'America/Los_Angeles',
            businessName: 'Downtown Cafe',
          },
        });

        const newLocation = newLocationResponse.location;
        if (newLocation?.id) {
          allLocations.push(newLocation);
          console.log(`✅ Created second location: ${newLocation.name} (${newLocation.id})`);
        }
      } catch (createError: any) {
        console.warn(`⚠️  Could not create second location: ${createError.message}`);
        console.warn('   Continuing with 1 location. Items will be available everywhere.');
      }
    }

    const location1Id = allLocations[0].id!;
    const location2Id = allLocations[1]?.id || location1Id; // Use same if only 1 location

    console.log(`\n🎯 Using locations for seed:`);
    console.log(`   Location 1: ${allLocations[0].name} (${location1Id})`);
    if (allLocations.length > 1) {
      console.log(`   Location 2: ${allLocations[1].name} (${location2Id})`);
    } else {
      console.log(`   Location 2: Same as Location 1 (only 1 location available)`);
    }

    // Step 2: Create Categories with Time-Based Availability
    console.log('\n📂 Creating catalog categories with time restrictions...');

    const categories = [
      {
        name: 'Breakfast',
        description: 'Morning favorites',
        // Available 6 AM - 11 AM every day
        availabilityPeriods: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(day => ({
          startLocalTime: '06:00:00',
          endLocalTime: '11:00:00',
          dayOfWeek: day,
        })),
      },
      {
        name: 'Lunch',
        description: 'Midday meals',
        // Available 11 AM - 4 PM every day
        availabilityPeriods: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(day => ({
          startLocalTime: '11:00:00',
          endLocalTime: '16:00:00',
          dayOfWeek: day,
        })),
      },
      {
        name: 'Beverages',
        description: 'Hot and cold drinks',
        // Available all day (no restrictions)
        availabilityPeriods: undefined,
      },
      {
        name: 'Desserts',
        description: 'Sweet treats',
        // Available 2 PM onwards every day
        availabilityPeriods: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(day => ({
          startLocalTime: '14:00:00',
          endLocalTime: '23:59:59',
          dayOfWeek: day,
        })),
      },
    ];

    const categoryIds: Record<string, string> = {};

    for (const cat of categories) {
      const response = await client.catalog.batchUpsert({
        idempotencyKey: `cat_${cat.name}_${timestamp}`, // Timestamp ensures uniqueness
        batches: [{
          objects: [{
            type: 'CATEGORY',
            id: `#${cat.name}`,
            categoryData: {
              name: cat.name,
              availabilityPeriods: cat.availabilityPeriods,
            },
          }],
        }],
      });

      // Get the actual ID from the ID mappings
      const mapping = response.idMappings?.find(m => m.clientObjectId === `#${cat.name}`);
      if (mapping?.objectId) {
        categoryIds[cat.name] = mapping.objectId;
        const timeInfo = cat.availabilityPeriods
          ? `(${cat.availabilityPeriods[0].startLocalTime}-${cat.availabilityPeriods[0].endLocalTime})`
          : '(All day)';
        console.log(`   ✅ ${cat.name} ${timeInfo}`);
      } else {
        console.error(`   ❌ Failed to get ID for ${cat.name}`);
      }
    }

    console.log('\n📋 Category IDs:', categoryIds);

    // Step 3: Create Menu Items
    console.log('\n🍽️  Creating menu items...');

    const items = [
      {
        name: 'Pancakes',
        description: 'Fluffy stack of pancakes with maple syrup',
        price: 899, // $8.99
        category: 'Breakfast',
        locations: [location1Id], // Only at location 1
      },
      {
        name: 'Eggs Benedict',
        description: 'Poached eggs on English muffin with hollandaise',
        price: 1299, // $12.99
        category: 'Breakfast',
        locations: [location1Id, location2Id], // Both locations
      },
      {
        name: 'Avocado Toast',
        description: 'Smashed avocado on artisan bread',
        price: 1099,
        category: 'Breakfast',
        locations: [location1Id],
      },
      {
        name: 'Classic Burger',
        description: 'Grass-fed beef patty with cheese',
        price: 1399,
        category: 'Lunch',
        locations: [location1Id, location2Id],
      },
      {
        name: 'Caesar Salad',
        description: 'Crisp romaine, parmesan, house-made dressing',
        price: 999,
        category: 'Lunch',
        locations: [location2Id], // Only at location 2
      },
      {
        name: 'Grilled Chicken Sandwich',
        description: 'Marinated chicken breast on ciabatta',
        price: 1199,
        category: 'Lunch',
        locations: [location2Id],
      },
      {
        name: 'Iced Coffee',
        description: 'Cold brew coffee over ice',
        price: 399,
        category: 'Beverages',
        locations: [location1Id, location2Id],
      },
      {
        name: 'Latte',
        description: 'Espresso with steamed milk',
        price: 499,
        category: 'Beverages',
        locations: [location1Id, location2Id],
      },
      {
        name: 'Chocolate Cake',
        description: 'Rich triple-layer chocolate cake',
        price: 699,
        category: 'Desserts',
        locations: [location1Id],
      },
      {
        name: 'Cheesecake',
        description: 'New York style cheesecake',
        price: 799,
        category: 'Desserts',
        locations: [location1Id, location2Id],
      },
    ];

    for (const item of items) {
      // With only 1 location, enable items at all locations for simplicity
      // If you have 2+ locations, this will respect the item.locations array
      const atAllLocations = allLocations.length === 1 ? true : (item.locations.length === allLocations.length);
      const categoryId = categoryIds[item.category];

      if (!categoryId) {
        console.error(`   ❌ No category ID found for ${item.category}`);
        continue;
      }

      // Create item with categories array - using current Square API (Dec 2023+)
      const response = await client.catalog.batchUpsert({
        idempotencyKey: `item_${item.name.replace(/\s/g, '_')}_${timestamp}`, // Timestamp ensures uniqueness
        batches: [{
          objects: [{
            type: 'ITEM',
            id: `#${item.name.replace(/\s/g, '_')}`,
            itemData: {
              name: item.name,
              description: item.description,
              categoryId: categoryId, // Use real category ID from Square
              categories: [{
                id: categoryId,
                ordinal: BigInt(0)  // BigInt required by Square API
              }],
              variations: [
                {
                  type: 'ITEM_VARIATION',
                  id: `#${item.name.replace(/\s/g, '_')}_var`,
                  itemVariationData: {
                    name: 'Regular',
                    pricingType: 'FIXED_PRICING',
                    priceMoney: {
                      amount: BigInt(item.price),
                      currency: 'USD',
                    },
                  },
                  presentAtAllLocations: atAllLocations,
                  presentAtLocationIds: atAllLocations ? undefined : item.locations,
                },
              ],
            },
            presentAtAllLocations: atAllLocations,
            presentAtLocationIds: atAllLocations ? undefined : item.locations,
          }],
        }],
      });

      // Verify categoryId was set
      const createdItemId = response.idMappings?.find(m => m.clientObjectId === `#${item.name.replace(/\s/g, '_')}`)?.objectId;
      const availability = atAllLocations
        ? 'All locations'
        : `Location ${item.locations.length === 1 ? item.locations.indexOf(location1Id) >= 0 ? '1' : '2' : '1+2'}`;

      console.log(`   ✅ ${item.name} ($${(item.price / 100).toFixed(2)}) - ${availability} [Cat: ${item.category}]`);
    }

    console.log('\n✨ Seed completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - ${categories.length} categories created`);
    console.log(`   - ${items.length} items created`);
    console.log(`   - ${allLocations.length} location(s) used\n`);
    console.log('🔗 Test your APIs:');
    console.log('   - http://localhost:3000/api/locations');
    console.log('   - http://localhost:3000/api/catalog\n');

  } catch (error: any) {
    console.error('\n❌ Seed error:', error.message);
    if (error.errors) {
      console.error('Details:', JSON.stringify(error.errors, null, 2));
    }
    process.exit(1);
  }
}

seedData();
