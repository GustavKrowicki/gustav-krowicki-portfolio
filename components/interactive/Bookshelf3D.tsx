'use client';

import { useState, useEffect } from 'react';
import Bookshelf3DScene from './Bookshelf3DScene';
import { parseCSV } from '@/lib/utils/csvParser';
import type { BookData } from '@/lib/utils/csvParser';

export default function Bookshelf3D() {
  const [books, setBooks] = useState<BookData[]>([]);
  const [expandedBookId, setExpandedBookId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load CSV data on mount
  useEffect(() => {
    async function loadBooks() {
      try {
        setLoading(true);

        // Fetch and parse CSV
        const response = await fetch('/Books/goodreads_library_export-2.csv');
        if (!response.ok) {
          throw new Error('Failed to load books CSV');
        }

        const csvText = await response.text();
        const parsedBooks = parseCSV(csvText);

        if (parsedBooks.length === 0) {
          throw new Error('No books found in CSV');
        }

        setBooks(parsedBooks);
      } catch (err) {
        console.error('Error loading books:', err);
        setError(err instanceof Error ? err.message : 'Failed to load books');
      } finally {
        setLoading(false);
      }
    }

    loadBooks();
  }, []);

  // Handle ESC key to collapse expanded book
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && expandedBookId) {
        setExpandedBookId(null);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [expandedBookId]);

  if (loading) {
    return (
      <div className="w-full h-[600px] bg-gradient-to-b from-neutral-100 to-neutral-200 rounded-xl flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-neutral-300 border-t-neutral-900 mb-4"></div>
          <p className="text-neutral-600 font-medium">Loading bookshelf...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-[600px] bg-gradient-to-b from-neutral-100 to-neutral-200 rounded-xl flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <p className="text-red-600 font-semibold mb-2">Error loading bookshelf</p>
          <p className="text-neutral-600 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (books.length === 0) {
    return (
      <div className="w-full h-[600px] bg-gradient-to-b from-neutral-100 to-neutral-200 rounded-xl flex items-center justify-center">
        <p className="text-neutral-600">No books found</p>
      </div>
    );
  }

  return (
    <div role="region" aria-label="Interactive 3D bookshelf">
      {/* Instructions */}
      <div className="mb-4 text-center">
        <p className="text-neutral-600 text-sm">
          Scroll horizontally to browse • Click a book to pull it out • Hover for preview
        </p>
      </div>

      {/* 3D Scene */}
      <Bookshelf3DScene
        books={books}
        expandedBookId={expandedBookId}
        onBookClick={(book) => {
          // Toggle: if same book clicked, collapse it; otherwise expand new book
          setExpandedBookId(prev => prev === book.id ? null : book.id);
        }}
      />

      {/* Book count */}
      <div className="mt-4 text-center">
        <p className="text-neutral-500 text-sm">
          {books.length} {books.length === 1 ? 'book' : 'books'} read
        </p>
      </div>
    </div>
  );
}
