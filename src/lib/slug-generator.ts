/**
 * slug-generator.ts
 *
 * Generates human-readable, SEO-friendly slugs from Arabic or English product names.
 *
 * Examples:
 *   "برتقال طازج"  → "برتقال-طازج"
 *   "Fresh Orange"  → "fresh-orange"
 *   "مياه معدنية 500ml" → "مياه-معدنية-500ml"
 */

/**
 * Converts a product/shop name into a URL-safe slug.
 * - Supports Arabic (keeps Arabic chars, replaces spaces with -)
 * - Supports English (lowercases, removes special chars)
 * - Appends a short random suffix to guarantee uniqueness
 */
export function generateSlug(name: string, suffix?: string): string {
  const normalized = name
    .trim()
    // Replace common Arabic punctuation with nothing
    .replace(/[،؛؟!«»]/g, '')
    // Replace English punctuation and special chars (keep Arabic, English, digits)
    .replace(/[^\u0600-\u06FF\w\s-]/g, '')
    // Collapse multiple spaces/dashes into a single dash
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    // Remove leading/trailing dashes
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

  // If the result is empty (e.g. name was all special chars), fallback
  const base = normalized || 'product';

  // Append suffix for uniqueness (short random string or provided value)
  const uniquePart = suffix ?? Math.random().toString(36).substring(2, 7);

  return `${base}-${uniquePart}`;
}

/**
 * Generates a slug without a suffix — use ONLY when you can guarantee
 * uniqueness yourself (e.g. via a database unique constraint).
 */
export function generateSlugNoSuffix(name: string): string {
  return name
    .trim()
    .replace(/[،؛؟!«»]/g, '')
    .replace(/[^\u0600-\u06FF\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'product';
}
