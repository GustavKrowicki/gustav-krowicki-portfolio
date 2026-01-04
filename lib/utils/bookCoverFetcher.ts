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
 * Generate a consistent color from a book title for fallback spines
 */
export function generateColorFromTitle(title: string): string {
  const colors = [
    '#525252', // neutral-600
    '#737373', // neutral-500
    '#a3a3a3', // neutral-400
    '#2563eb', // blue-600
    '#dc2626', // red-600
    '#16a34a', // green-600
    '#ea580c', // orange-600
    '#7c3aed', // violet-600
  ];

  // Generate hash from title
  const hash = title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

  return colors[hash % colors.length];
}
