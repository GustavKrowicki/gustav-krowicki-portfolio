"use client";

const CURRENTLY_READING = [
  {
    title: "Make Something Wonderful",
    author: "Steve Jobs",
  },
  {
    title: "Just Kids",
    author: "Patti Smith",
  },
  {
    title: "Careless People",
    author: "Sarah Wynn-Williams",
  },
];

export default function BookShelf() {
  return (
    <div className="border-[3px] border-[#14181b] bg-[#504d42] px-3 py-2">
      <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#b7ae96]">
        Currently Reading
      </span>
      <div className="mt-1.5 flex flex-col gap-0.5">
        {CURRENTLY_READING.map((book, i) => (
          <div key={i} className="flex items-baseline gap-1.5">
            <span className="font-mono text-[10px] text-[#d78432]">
              {i + 1}.
            </span>
            <span className="truncate font-mono text-[11px] uppercase tracking-[0.08em] text-[#f5ecd2]">
              {book.title}
            </span>
            <span className="font-mono text-[10px] text-[#b7ae96]">—</span>
            <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.08em] text-[#b7ae96]">
              {book.author}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
