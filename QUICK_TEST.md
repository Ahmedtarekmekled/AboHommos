# 🚀 Quick Testing Checklist

## ⚡ 5-Minute Quick Test

### 1. Start Dev Server
```bash
npm run dev
```
✅ Server running at http://localhost:5173

---

### 2. Update Shop Coordinates (REQUIRED)

**Open Supabase SQL Editor and run:**

```sql
-- Get your shop IDs first
SELECT id, name FROM shops LIMIT 5;

-- Update 2-3 shops with test coordinates (Cairo area)
UPDATE shops SET 
  latitude = 30.0444,  -- Downtown Cairo
  longitude = 31.2357
WHERE id = 'YOUR_FIRST_SHOP_ID';

UPDATE shops SET 
  latitude = 30.0626,  -- Nasr City
  longitude = 31.3469
WHERE id = 'YOUR_SECOND_SHOP_ID';

-- Verify
SELECT id, name, latitude, longitude 
FROM shops 
WHERE latitude IS NOT NULL;
```

---

### 3. Test Multi-Shop Cart (UI)

1. Open http://localhost:5173
2. Login
3. Add item from **Shop A** → Cart
4. Add item from **Shop B** → Cart  
5. Go to `/cart`

**✅ SUCCESS if you see:**
- Items from BOTH shops
- "طلب من 2 متاجر" badge
- Items grouped by shop name
- No cart clearing!

**❌ FAIL if:**
- Only one shop's items show
- Cart got cleared when adding from 2nd shop

---

### 4. Test Mapbox (Browser Console)

Open DevTools (F12) → Console:

```javascript
// Quick Mapbox test
fetch('https://api.mapbox.com/directions-matrix/v1/mapbox/driving/31.2357,30.0444;31.3469,30.0626?access_token=' + import.meta.env.VITE_MAPBOX_ACCESS_TOKEN)
  .then(r => r.json())
  .then(d => console.log('✅ Mapbox works!', d))
  .catch(e => console.error('❌ Mapbox failed', e));
```

**✅ SUCCESS:** Response with `distances` and `durations`  
**❌ FAIL:** 401 Unauthorized (bad token) or other error

---

### 5. Quick Backend Service Test

**Browser Console:**

```javascript
// Test delivery settings
const test = async () => {
  try {
    const { deliverySettingsService } = await import('/src/services/delivery-settings.service.ts');
    const settings = await deliverySettingsService.getSettings();
    console.log('✅ Settings loaded:', settings);
    console.log('Base fee:', settings.base_fee);
    console.log('KM rate:', settings.km_rate);
  } catch (e) {
    console.error('❌ Failed:', e);
  }
};
test();
```

**✅ SUCCESS:** Settings object with `base_fee: 20`  
**❌ FAIL:** Error message

---

## 📋 Detailed Tests

For complete testing, see **`TESTING_GUIDE.md`** which includes:
- 8 comprehensive backend tests
- Expected outputs for each test
- Troubleshooting guide
- Test results template

---

## 🎯 Quick Status Check

Run this in Supabase SQL Editor:

```sql
-- One query to check everything
SELECT 
  (SELECT COUNT(*) FROM parent_orders) as parent_orders_count,
  (SELECT COUNT(*) FROM delivery_settings) as settings_count,
  (SELECT COUNT(*) FROM shops WHERE latitude IS NOT NULL) as shops_with_coords,
  (SELECT is_nullable FROM information_schema.columns 
   WHERE table_name='carts' AND column_name='shop_id') as cart_shop_nullable;
```

**Expected:**
```
parent_orders_count: 0 (no orders yet - OK)
settings_count: 1 (delivery settings row - REQUIRED)
shops_with_coords: 2+ (shops you updated - REQUIRED)
cart_shop_nullable: YES (cart allows multi-shop - REQUIRED)
```

---

## ✅ You're Ready When:

- [x] Dev server running
- [x] At least 2 shops have coordinates
- [x] Multi-shop cart UI shows both shops
- [x] Mapbox API responds successfully
- [x] Delivery settings load in console

**Next:** Option 1 (Checkout UI) or Option 3 (Dashboards) - Your choice!

---

## 🆘 Common First-Time Issues

| Problem | Solution |
|---------|----------|
| Mapbox 401 error | Token expired - get new one from mapbox.com |
| "Shop missing coordinates" | Run Step 2 SQL above |
| Settings not found | Run `sql/multi-store-setup.sql` |
| Cart still clears | Hard refresh (Ctrl+F5) browser |
| Type errors in console | Restart dev server |

---

**Your Mapbox Token:** ✅ Already configured in `.env`  
**Database:** ✅ Tables created (verify with SQL above)  
**Build:** ✅ Successful  
**Server:** ✅ Running

**Start Testing!** 🚀
