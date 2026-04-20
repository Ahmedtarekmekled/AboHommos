import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { SitemapStream, streamToPromise, SitemapIndexStream } from 'sitemap';
import { Readable } from 'stream';

// Load env vars
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const BASE_URL = 'https://www.shopydash.store';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const PUBLIC_DIR = path.resolve(process.cwd(), 'public');

async function generateSitemapFile(filename, links) {
  if (links.length === 0) {
    console.warn(`⚠️  Skipping ${filename} — no entries found.`);
    return;
  }
  const stream = new SitemapStream({ hostname: BASE_URL });
  const data = await streamToPromise(Readable.from(links).pipe(stream));
  fs.writeFileSync(path.join(PUBLIC_DIR, filename), data.toString());
  console.log(`✅ Created ${filename} with ${links.length} entries.`);
}

async function generateSitemaps() {
  console.log("🗺️  Generating sitemaps...");

  // ── 1. Static Pages ────────────────────────────────────────────────────────
  // NOTE: /login and /register are intentionally excluded — no SEO value
  const staticLinks = [
    { url: '/',       priority: 1.0, changefreq: 'daily'   },
    { url: '/shops',  priority: 0.9, changefreq: 'daily'   },
    { url: '/about',  priority: 0.8, changefreq: 'monthly' },
  ];
  await generateSitemapFile('sitemap-static.xml', staticLinks);

  // ── 2. Shops Sitemap ───────────────────────────────────────────────────────
  // FIX: was /shop/ → correct route is /shops/
  // FIX: only index active shops with approval_status = APPROVED
  const { data: shops, error: shopsError } = await supabase
    .from('shops')
    .select('slug, updated_at')
    .eq('is_active', true)
    .eq('approval_status', 'APPROVED');

  if (shopsError) {
    console.error("Error fetching shops:", shopsError.message);
  }

  const shopLinks = (shops || [])
    .filter(shop => shop.slug)  // skip any shop without a slug
    .map(shop => ({
      url: `/shops/${shop.slug}`,   // FIX: was /shop/
      lastmod: shop.updated_at
        ? new Date(shop.updated_at).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      changefreq: 'daily',
      priority: 0.8
    }));

  await generateSitemapFile('sitemap-shops.xml', shopLinks);

  // ── 3. Products Sitemap ────────────────────────────────────────────────────
  // FIX: was fetching id and using /product/ → now uses slug and /products/
  // FIX: was not filtering is_active → now only indexes active products
  // SAFETY: falls back to UUID if slug is somehow missing (during transition)
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, slug, updated_at')
    .eq('is_active', true);

  if (productsError) {
    console.error("Error fetching products:", productsError.message);
  }

  const productLinks = (products || [])
    .map(product => {
      const identifier = product.slug || product.id;  // slug preferred, UUID fallback
      return {
        url: `/products/${identifier}`,   // FIX: was /product/{id}
        lastmod: product.updated_at
          ? new Date(product.updated_at).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        changefreq: 'weekly',
        priority: 0.7
      };
    });

  // Log how many are still on UUID fallback (useful post-backfill check)
  const uuidFallbackCount = (products || []).filter(p => !p.slug).length;
  if (uuidFallbackCount > 0) {
    console.warn(`⚠️  ${uuidFallbackCount} products are using UUID fallback. Run sql/backfill_product_slugs.sql to fix.`);
  }

  await generateSitemapFile('sitemap-products.xml', productLinks);

  // ── 4. Sitemap Index ───────────────────────────────────────────────────────
  const smis = new SitemapIndexStream({ level: 'info' });
  const indexData = await streamToPromise(
    Readable.from([
      { url: `${BASE_URL}/sitemap-static.xml`   },
      { url: `${BASE_URL}/sitemap-shops.xml`    },
      { url: `${BASE_URL}/sitemap-products.xml` },
    ]).pipe(smis)
  );

  fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap.xml'), indexData.toString());
  console.log("✅ Created sitemap.xml index.");
  console.log("🎉 Sitemap generation completed!");
}

generateSitemaps().catch(console.error);

