export interface BookData {
  id: string;
  title: string;
  author: string;
  isbn13: string;
  myRating: number;
  avgRating: number;
  pages: number;
  yearPublished: number;
  dateRead: string;
  status: 'read' | 'currently-reading';
}

export interface CoverCache {
  [bookId: string]: string | null;
}

/**
 * Parse a CSV line handling quoted commas
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      // Handle escaped quotes
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

/**
 * Clean ISBN format - remove ="" wrapper from Goodreads CSV
 * Example: =""9781668072110"" → 9781668072110
 */
function cleanISBN(rawISBN: string): string {
  if (!rawISBN) return '';
  return rawISBN.replace(/^=""|""$/g, '').replace(/^="|"$/g, '');
}

/**
 * Parse Goodreads library export CSV and extract "read" and "currently-reading" books
 */
export function parseCSV(csvText: string): BookData[] {
  const lines = csvText.split('\n').filter(line => line.trim());

  if (lines.length === 0) return [];

  // Skip header row
  const dataLines = lines.slice(1);

  const books: BookData[] = [];

  for (const line of dataLines) {
    // Quick check if this is a "read" or "currently-reading" book
    if (!line.includes(',read,') && !line.includes(',currently-reading,')) continue;

    const values = parseCSVLine(line);

    // Verify we have enough columns
    if (values.length < 20) continue;

    // Column indices based on Goodreads CSV structure:
    // 0: Book Id
    // 1: Title
    // 2: Author
    // 6: ISBN13
    // 7: My Rating
    // 8: Average Rating
    // 11: Number of Pages
    // 12: Year Published
    // 14: Date Read
    // 18: Exclusive Shelf

    const exclusiveShelf = values[18]?.trim();
    if (exclusiveShelf !== 'read' && exclusiveShelf !== 'currently-reading') continue;

    const bookData: BookData = {
      id: values[0]?.trim() || '',
      title: values[1]?.trim() || 'Unknown Title',
      author: values[2]?.trim() || 'Unknown Author',
      isbn13: cleanISBN(values[6]),
      myRating: parseInt(values[7]) || 0,
      avgRating: parseFloat(values[8]) || 0,
      pages: parseInt(values[11]) || 0,
      yearPublished: parseInt(values[12]) || 0,
      dateRead: values[14]?.trim() || '',
      status: exclusiveShelf as 'read' | 'currently-reading',
    };

    books.push(bookData);
  }

  // Sort: currently-reading first, then by date read (most recent first)
  books.sort((a, b) => {
    // Currently-reading books always come first
    if (a.status === 'currently-reading' && b.status !== 'currently-reading') return -1;
    if (a.status !== 'currently-reading' && b.status === 'currently-reading') return 1;

    // For books with same status, sort by date read
    if (!a.dateRead) return 1;
    if (!b.dateRead) return -1;
    return new Date(b.dateRead).getTime() - new Date(a.dateRead).getTime();
  });

  return books;
}
