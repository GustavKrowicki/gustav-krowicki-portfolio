interface QuoteBlockProps {
  quote: string;
  author?: string;
}

export default function QuoteBlock({ quote, author }: QuoteBlockProps) {
  return (
    <blockquote className="my-12 border-l-4 border-accent pl-6 py-2">
      <p className="text-2xl font-medium text-neutral-900 italic leading-relaxed">
        "{quote}"
      </p>
      {author && (
        <cite className="block mt-4 text-lg text-neutral-600 not-italic">
          — {author}
        </cite>
      )}
    </blockquote>
  );
}
