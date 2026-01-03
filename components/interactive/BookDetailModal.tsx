import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { shouldReduceMotion } from '@/lib/utils';
import type { BookData } from '@/lib/utils/csvParser';

interface BookDetailModalProps {
  book: BookData;
  onClose: () => void;
}

export default function BookDetailModal({ book, onClose }: BookDetailModalProps) {
  const reduceMotion = shouldReduceMotion();

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.2 }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="book-title"
    >
      <motion.div
        className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        transition={{ duration: reduceMotion ? 0 : 0.3 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <h2 id="book-title" className="text-2xl font-bold text-neutral-900 pr-8">
            {book.title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 rounded-lg transition-colors flex-shrink-0"
            aria-label="Close modal"
          >
            <X size={24} />
          </button>
        </div>

        {/* Book Details */}
        <div className="space-y-4 text-neutral-700">
          <div>
            <span className="font-semibold">Author:</span>{' '}
            <span>{book.author}</span>
          </div>

          {book.myRating > 0 && (
            <div>
              <span className="font-semibold">My Rating:</span>
              <div className="flex items-center gap-1 mt-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span
                    key={i}
                    className={`text-2xl ${
                      i < book.myRating ? 'text-yellow-400' : 'text-neutral-300'
                    }`}
                  >
                    ★
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <span className="font-semibold">Average Rating:</span>{' '}
            <span>{book.avgRating.toFixed(2)} / 5.00</span>
          </div>

          {book.pages > 0 && (
            <div>
              <span className="font-semibold">Pages:</span>{' '}
              <span>{book.pages.toLocaleString()}</span>
            </div>
          )}

          {book.yearPublished > 0 && (
            <div>
              <span className="font-semibold">Year Published:</span>{' '}
              <span>{book.yearPublished}</span>
            </div>
          )}

          {book.dateRead && (
            <div>
              <span className="font-semibold">Date Read:</span>{' '}
              <span>{new Date(book.dateRead).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
