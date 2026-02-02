# 🧪 Multi-Store Backend Testing Guide

**Goal:** Test the multi-store delivery system without completing the full UI

---

## ✅ Prerequisites Checklist

- [x] Database migration completed (`sql/multi-store-setup.sql`)
- [x] Mapbox token added to `.env`
- [x] Build successful (`npm run build`)
- [x] TypeScript types updated

---

## 🔬 Test Plan

### Test 1: Verify Database Tables & Data

**SQL Queries to run in Supabase SQL Editor:**

```sql
-- 1. Check delivery_settings exists with defaults
SELECT * FROM delivery_settings;
/* Expected: 
   id=true, base_fee=20, km_rate=3, pickup_stop_fee=10, 
   min_fee=20, max_fee=200, rounding_rule='nearest_int'
*/

-- 2. Check if any shops have coordinates (will be empty for now)
SELECT id, name, latitude, longitude 
FROM shops 
WHERE latitude IS NOT NULL;
/* Expected: Empty or existing shops with coords */

-- 3. Check if carts.shop_id is nullable
SELECT column_name, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'carts' AND column_name = 'shop_id';
/* Expected: is_nullable = 'YES' */

-- 4. Check orders table has new suborder columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'orders' 
  AND column_name IN ('parent_order_id', 'pickup_sequence_index', 'is_critical')
ORDER BY column_name;
/* Expected: 3 rows */
```

---

### Test 2: Update Shop Coordinates (Required for Testing)

**Add coordinates to at least 2-3 shops for testing:**

```sql
-- Example: Update shops with test coordinates in Egypt
-- (You can use Google Maps to get real coordinates)

-- Shop 1: Downtown Cairo example
UPDATE shops 
SET latitude = 30.0444, longitude = 31.2357
WHERE id = 'YOUR_SHOP_1_ID'
RETURNING id, name, latitude, longitude;

-- Shop 2: Nasr City example
UPDATE shops 
SET latitude = 30.0626, longitude = 31.3469
WHERE id = 'YOUR_SHOP_2_ID'
RETURNING id, name, latitude, longitude;

-- Shop 3: Heliopolis example
UPDATE shops 
SET latitude = 30.0875, longitude = 31.3241
WHERE id = 'YOUR_SHOP_3_ID'
RETURNING id, name, latitude, longitude;

-- Or update ALL shops with sample coordinates
-- WARNING: Replace with real coordinates later!
UPDATE shops 
SET 
  latitude = 30.0444 + (RANDOM() * 0.1), 
  longitude = 31.2357 + (RANDOM() * 0.1)
WHERE latitude IS NULL;
```

**Get your actual shop IDs:**
```sql
SELECT id, name, address FROM shops ORDER BY created_at DESC LIMIT 10;
```

---

### Test 3: Test Mapbox Distance Matrix Service

**Browser Console Test (Open DevTools → Console):**

```javascript
// Test Mapbox service directly
const testMapbox = async () => {
  const { mapboxMatrix } = await import('./src/services/mapbox-matrix.ts');
  
  // Test coordinates (Cairo downtown, Nasr City)
  const coords = [
    { latitude: 30.0444, longitude: 31.2357 }, // Customer
    { latitude: 30.0626, longitude: 31.3469 }, // Shop 1
    { latitude: 30.0875, longitude: 31.3241 }, // Shop 2
  ];
  
  try {
    const result = await mapboxMatrix.getMatrix(coords);
    console.log('✅ Mapbox Matrix Result:', result);
    console.log('Distances (meters):', result.distances);
    console.log('Durations (seconds):', result.durations);
  } catch (error) {
    console.error('❌ Mapbox Error:', error);
  }
};

testMapbox();
```

**Expected Output:**
- `distances`: 2D array of distances in meters
- `durations`: 2D array of times in seconds
- No errors

**If you get errors:**
- Check Mapbox token is correct
- Check network connectivity
- Verify coordinates are valid (lat: -90 to 90, lng: -180 to 180)

---

### Test 4: Test Route Planner

**Browser Console Test:**

```javascript
const testRoutePlanner = async () => {
  const { planRoute } = await import('./src/services/route-planner.ts');
  
  // Mock matrix result from Mapbox
  const mockMatrix = {
    distances: [
      [0, 5000, 8000],      // From customer
      [5000, 0, 3500],      // From shop 1
      [8000, 3500, 0]       // From shop 2
    ],
    durations: [
      [0, 600, 900],
      [600, 0, 420],
      [900, 420, 0]
    ],
    sources: [],
    destinations: []
  };
  
  const route = planRoute(mockMatrix);
  console.log('✅ Route Plan:', route);
  console.log('Pickup sequence:', route.pickup_sequence);
  console.log('Total km:', route.total_km);
  console.log('Total minutes:', route.total_minutes);
};

testRoutePlanner();
```

**Expected Output:**
- `pickup_sequence`: [1, 2] or [2, 1] (shop indices)
- `total_km`: ~16-18 km
- `total_minutes`: ~26-32 min

---

### Test 5: Test Delivery Fee Calculation

**Browser Console Test:**

```javascript
const testPricing = async () => {
  const { calculateDeliveryFee } = await import('./src/services/delivery-pricing.ts');
  
  // Mock route result
  const mockRoute = {
    pickup_sequence: [1, 2],
    route_points: [0, 1, 2, 0],
    legs: [],
    total_km: 16.5,
    total_minutes: 28
  };
  
  try {
    const fee = await calculateDeliveryFee(mockRoute, 2); // 2 shops
    console.log('✅ Delivery Fee Breakdown:', fee);
    console.log('Base fee:', fee.base_fee);
    console.log('KM component:', fee.km_component);
    console.log('Stops component:', fee.stops_component);
    console.log('Final fee:', fee.final_fee);
  } catch (error) {
    console.error('❌ Pricing Error:', error);
  }
};

testPricing();
```

**Expected Calculation (with defaults):**
```
Base fee: 20 EGP
KM component: 16.5 km × 3 = 49.5 EGP
Stops component: (2 - 1) × 10 = 10 EGP
Subtotal: 79.5 EGP
Final (rounded): 80 EGP
```

---

### Test 6: Test Multi-Shop Cart (Manual UI Test)

**Steps:**
1. Start dev server: `npm run dev`
2. Login as a customer
3. Add product from Shop A to cart
4. Add product from Shop B to cart (**Shouldn't clear cart!**)
5. Go to Cart page (`/cart`)

**What to verify:**
- ✅ Cart shows items from BOTH shops
- ✅ Items are grouped by shop with shop logos
- ✅ Badge shows "طلب من 2 متاجر" (Ordering from 2 shops)
- ✅ Each shop section shows its own subtotal
- ✅ Total is sum of all items
- ✅ Delivery fee shows "يُحسب عند الدفع" (Calculated at checkout)

**What would FAIL in old system:**
- ❌ Adding from Shop B would delete Shop A items
- ❌ Cart would only show items from one shop

---

### Test 7: Test Delivery Settings Service

**Browser Console Test:**

```javascript
const testSettings = async () => {
  const { deliverySettingsService } = await import('./src/services/delivery-settings.service.ts');
  
  try {
    const settings = await deliverySettingsService.getSettings();
    console.log('✅ Delivery Settings:', settings);
    console.log('Pricing mode:', settings.fallback_mode);
    console.log('Max shops per order:', settings.max_shops_per_order);
  } catch (error) {
    console.error('❌ Settings Error:', error);
  }
};

testSettings();
```

**Expected Output:**
```javascript
{
  id: true,
  base_fee: 20,
  km_rate: 3,
  pickup_stop_fee: 10,
  min_fee: 20,
  max_fee: 200,
  rounding_rule: "nearest_int",
  fallback_mode: "fixed_fee",
  fixed_fallback_fee: 50,
  // ... etc
}
```

---

### Test 8: Test Complete Checkout Calculation (Backend Only)

**Browser Console Test:**

```javascript
const testCheckout = async () => {
  const { calculateMultiStoreCheckout } = await import('./src/services/multi-store-checkout.service.ts');
  
  // Mock cart items from 2 shops
  const mockCart = [
    {
      id: '1',
      product_id: 'prod1',
      quantity: 2,
      product: {
        id: 'prod1',
        name: 'Product A',
        price: 50,
        shop_id: 'shop1',
        image_url: null
      }
    },
    {
      id: '2',
      product_id: 'prod2',
      quantity: 1,
      product: {
        id: 'prod2',
        name: 'Product B',
        price: 75,
        shop_id: 'shop2',
        image_url: null
      }
    }
  ];
  
  const params = {
    userId: 'YOUR_USER_ID',
    cartItems: mockCart,
    deliveryAddress: 'Test Address, Cairo',
    deliveryLatitude: 30.0444,
    deliveryLongitude: 31.2357,
    customerName: 'Test Customer',
    customerPhone: '01234567890',
    notes: 'Test order'
  };
  
  try {
    const result = await calculateMultiStoreCheckout(params);
    
    if (result.validation_errors.length > 0) {
      console.error('❌ Validation Errors:', result.validation_errors);
    } else {
      console.log('✅ Checkout Calculation:', result);
      console.log('Parent order subtotal:', result.parent_order_data.subtotal);
      console.log('Delivery fee:', result.parent_order_data.total_delivery_fee);
      console.log('Total:', result.parent_order_data.total);
      console.log('Route km:', result.parent_order_data.route_km);
      console.log('Pickup sequence:', result.parent_order_data.pickup_sequence);
      console.log('Suborders count:', result.suborders_data.length);
    }
  } catch (error) {
    console.error('❌ Checkout Error:', error);
  }
};

testCheckout();
```

**Expected validation error (if shops don't have coordinates):**
```
[
  "المتجر \"Shop Name\" لا يحتوي على موقع محدد. لا يمكن إتمام الطلب."
]
```

**After adding shop coords, expected success:**
```javascript
{
  parent_order_data: {
    subtotal: 175,        // (50×2) + (75×1)
    total_delivery_fee: 65-80, // Depends on distance
    total: 240-255,
    route_km: 10-20,
    route_minutes: 15-30,
    pickup_sequence: [1, 2] or [2, 1]
  },
  suborders_data: [
    { shop_id: 'shop1', subtotal: 100, items: [...] },
    { shop_id: 'shop2', subtotal: 75, items: [...] }
  ]
}
```

---

## 🐛 Common Issues & Solutions

### Issue: "فشل حساب المسافات" (Mapbox failed)
**Solutions:**
1. Check Mapbox token is valid
2. Check internet connection
3. Verify coordinates are in valid ranges
4. Check Mapbox API quota (100k free/month)
5. System will fallback to fixed fee (50 EGP) automatically

### Issue: "المتجر لا يحتوي على موقع محدد" (Shop missing coordinates)
**Solution:** Run Test 2 to add coordinates to shops

### Issue: "الحد الأقصى المسموح به هو X متاجر"
**Solution:** Default is 10 shops, update `delivery_settings.max_shops_per_order` if needed

### Issue: Cart items disappearing when adding from different shop
**Solution:** Clear browser cache/localStorage, or check cart service was updated correctly

---

## ✅ Success Criteria

After running all tests, you should have:

- [x] All database tables created and verified
- [x] At least 2-3 shops with valid coordinates
- [x] Mapbox Matrix API returning distance data
- [x] Route planner calculating optimal sequence
- [x] Delivery fee calculation working with configurable rules
- [x] Multi-shop cart not clearing items
- [x] Cart UI showing grouped items by shop
- [x] Full checkout calculation (backend) working

---

## 📊 Test Results Template

**Copy this and fill in your results:**

```
=== TEST RESULTS ===
Date: ______
Tester: ______

✅ Test 1 - Database Tables: PASS/FAIL
   Notes: ___________

✅ Test 2 - Shop Coordinates: PASS/FAIL
   Shops updated: ____
   
✅ Test 3 - Mapbox Matrix: PASS/FAIL
   Distance result: _____ meters
   
✅ Test 4 - Route Planner: PASS/FAIL
   Sequence: [__, __]
   
✅ Test 5 - Pricing: PASS/FAIL
   Final fee: _____ EGP
   
✅ Test 6 - Multi-Shop Cart UI: PASS/FAIL
   Shops in cart: ____
   
✅ Test 7 - Settings Service: PASS/FAIL
   Base fee: _____
   
✅ Test 8 - Checkout Calculation: PASS/FAIL
   Total: _____ EGP
   Route km: _____

Overall Status: ✅ READY / ⚠️ ISSUES / ❌ BLOCKED
```

---

## 🚀 After Testing

Once all tests pass:
1. Document any issues found
2. Decide: Continue to Checkout UI (Option 1) or Dashboards first
3. Consider adding more shops with coordinates for realistic testing
4. Prepare sample customer addresses with coordinates

---

**Need Help?**
- Check `MULTISTORE_PROGRESS.md` for full system documentation
- Review service code in `src/services/` for implementation details
- Check browser console for detailed error messages
