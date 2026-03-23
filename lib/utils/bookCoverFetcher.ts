import type { BookData, CoverCache } from './csvParser';

/**
 * Fetch a single book cover from Open Library API
 * Returns the cover URL if found, null otherwise
 */
export async function fetchBookCover(isbn13: string): Promise<string | null> {
  if (!isbn13) return null;

  const url = `https://covers.openlibrary.org/b/isbn/${isbn13}-L.jpg`;

  try {
    const response = await fetch(url, { method: 'HEAD' });

    // Open Library returns 404 or redirect to placeholder for missing covers
    if (response.ok && response.status === 200) {
      // Additional check: if redirected to placeholder, it's not a real cover
      if (response.url.includes('placeholder')) {
        return null;
      }
      return url;
    }

    return null;
  } catch (error) {
    console.warn(`Failed to fetch cover for ISBN ${isbn13}:`, error);
    return null;
  }
}

/**
 * Fetch covers for all books with staggered timing to respect API limits
 * Returns a cache object mapping book ID to cover URL (or null if not found)
 */
export async function fetchAllCovers(books: BookData[]): Promise<CoverCache> {
  const cache: CoverCache = {};

  for (let i = 0; i < books.length; i++) {
    const book = books[i];

    if (!book.isbn13) {
      cache[book.id] = null;
      continue;
    }

    // Stagger requests by 100ms to be respectful to the API
    if (i > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    cache[book.id] = await fetchBookCover(book.isbn13);
  }

  return cache;
}

/**
 * Generate a consistent color from a book title for fallback spines.
 * Palette inspired by warm/dusty book spine tones — oranges, olives,
 * teals, corals, and muted tones that pop against a blue background.
 */
export function generateColorFromTitle(title: string): string {
  const colors = [
    '#D4875B', // warm peach/orange
    '#E8956A', // salmon
    '#C4694A', // terracotta
    '#4A6741', // olive green
    '#3B5238', // dark olive
    '#2D6B6B', // deep teal
    '#377A7A', // sea green
    '#1E3A5F', // navy blue
    '#7B4B8A', // dusty purple
    '#C94C7C', // magenta/pink
    '#D4536A', // dusty rose
    '#C2A65A', // mustard gold
    '#8B7355', // warm khaki
    '#6B8E8E', // sage teal
    '#A45B4A', // burnt sienna
    '#E6D5B8', // cream/off-white
    '#5C7FA3', // dusty blue
    '#D4A574', // warm tan
  ];

  // Generate hash from title
  const hash = title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

  return colors[hash % colors.length];
}
