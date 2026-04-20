-- =====================================================
-- Backfill existing products with readable slugs
-- File: sql/backfill_product_slugs.sql
--
-- SAFE TO RUN: Only updates products that have the old
-- garbage timestamp-based slugs (product-XXXXXXXX-XXXX)
-- or NULL slugs. Does NOT touch any product that already
-- has a proper slug.
--
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- =====================================================

-- Step 1: Preview what will be updated (run this first to check)
SELECT
  id,
  name,
  slug AS old_slug,
  -- Generate new slug: Arabic/English name → hyphens, + short random suffix
  LOWER(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        TRIM(name),
        '[^\u0600-\u06FF\w\s-]', '', 'g'  -- keep Arabic, English, digits, spaces, hyphens
      ),
      '[\s_]+', '-', 'g'               -- replace spaces with hyphens
    )
  ) || '-' || SUBSTRING(gen_random_uuid()::TEXT, 1, 5) AS new_slug
FROM products
WHERE
  slug IS NULL
  OR slug LIKE 'product-%'            -- old garbage pattern
ORDER BY created_at DESC;

-- ─────────────────────────────────────────────────────
-- Step 2: Apply the backfill (run after reviewing Step 1)
-- ─────────────────────────────────────────────────────
UPDATE products
SET
  slug = LOWER(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        TRIM(name),
        '[^\u0600-\u06FF\w\s-]', '', 'g'
      ),
      '[\s_]+', '-', 'g'
    )
  ) || '-' || SUBSTRING(gen_random_uuid()::TEXT, 1, 5),
  updated_at = NOW()
WHERE
  slug IS NULL
  OR slug LIKE 'product-%';

-- ─────────────────────────────────────────────────────
-- Step 3: Verify results
-- ─────────────────────────────────────────────────────
SELECT id, name, slug FROM products ORDER BY updated_at DESC LIMIT 20;

-- ─────────────────────────────────────────────────────
-- Step 4 (Optional): Add a unique index to prevent
-- duplicate slugs in the future
-- ─────────────────────────────────────────────────────
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
-- NOTE: Only run this AFTER Step 2 has completed successfully
-- and you've verified there are no duplicate slugs.
