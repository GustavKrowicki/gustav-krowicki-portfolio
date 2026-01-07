import { Canvas } from '@react-three/fiber';
import { ScrollControls, Scroll, Text } from '@react-three/drei';
import Book3D from './Book3D';
import type { BookData } from '@/lib/utils/csvParser';

interface Bookshelf3DSceneProps {
  books: BookData[];
  expandedBookId: string | null;
  onBookClick: (book: BookData) => void;
}

export default function Bookshelf3DScene({
  books,
  expandedBookId,
  onBookClick,
}: Bookshelf3DSceneProps) {
  // Calculate total width needed for all books with spacing
  const bookSpacing = 0.7;
  const gapBetweenReadingAndRead = 1; // Extra space between currently-reading and read books

  // Find the index where currently-reading books end
  const lastCurrentlyReadingIndex = books.findIndex((book, index) =>
    book.status === 'read' && (index === 0 || books[index - 1].status === 'currently-reading')
  ) - 1;

  const totalWidth = books.length * bookSpacing + (lastCurrentlyReadingIndex >= 0 ? gapBetweenReadingAndRead : 0);

  // Find the index of the expanded book
  const selectedBookIndex = expandedBookId
    ? books.findIndex(book => book.id === expandedBookId)
    : null;

  // Check if the expanded book is currently-reading
  const expandedBook = expandedBookId
    ? books.find(book => book.id === expandedBookId)
    : null;
  const isExpandedBookCurrentlyReading = expandedBook?.status === 'currently-reading';

  // Calculate horizontal offset for each book to make space for expanded book
  const calculateOffset = (currentIndex: number, selectedIndex: number | null): number => {
    // Don't apply offset if the expanded book is currently-reading
    if (selectedIndex === null || isExpandedBookCurrentlyReading) return 0;
    const distance = Math.abs(currentIndex - selectedIndex);
    if (distance === 0) return 0; // The selected book itself doesn't shift

    const direction = currentIndex < selectedIndex ? -1 : 1;
    const baseOffset = 0.8; // Base spacing to create room for rotated cover
    const falloff = Math.pow(0.6, distance - 1); // Exponential falloff
    return direction * baseOffset * falloff;
  };

  return (
    <div className="w-full h-[600px] bg-gradient-to-b from-neutral-100 to-neutral-200 rounded-xl overflow-hidden">
      <Canvas
        camera={{
          position: [0, 0, 6],
          fov: 50,
        }}
        shadows
      >
        {/* Ambient light for overall scene illumination */}
        <ambientLight intensity={0.8} />

        {/* Directional light for depth and shadows */}
        <directionalLight
          position={[5, 5, 5]}
          intensity={1.0}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />

        {/* Spot light for dramatic effect */}
        <spotLight
          position={[0, 10, 0]}
          angle={0.3}
          penumbra={1}
          intensity={0.5}
          castShadow
        />

        {/* Horizontal scroll controls */}
        <ScrollControls
          pages={5} // Increased scroll distance to reach all 23 books
          horizontal
          damping={0.2}
        >
          <Scroll>
            {/* Currently Reading section label */}
            {lastCurrentlyReadingIndex >= 0 && (
              <Text
                position={[(lastCurrentlyReadingIndex * bookSpacing) / 2, 2.1, 0]}
                fontSize={0.25}
                color="#404040"
                anchorX="center"
                anchorY="middle"
                fontWeight="600"
              >
                Currently Reading
              </Text>
            )}

            {/* Render all books in a horizontal line */}
            {books.map((book, index) => {
              // Add extra spacing after currently-reading books
              const extraSpacing = index > lastCurrentlyReadingIndex && lastCurrentlyReadingIndex >= 0
                ? gapBetweenReadingAndRead
                : 0;

              // Position books from 0 onwards, ScrollControls will translate them
              const x = index * bookSpacing + extraSpacing;
              const y = 0;
              const z = 0;
              const isExpanded = expandedBookId === book.id;
              const offsetX = calculateOffset(index, selectedBookIndex);

              return (
                <Book3D
                  key={book.id}
                  book={book}
                  position={[x, y, z]}
                  isExpanded={isExpanded}
                  offsetX={offsetX}
                  onClick={() => onBookClick(book)}
                />
              );
            })}

            {/* Shelf moves with books */}
            <mesh position={[totalWidth / 2, -1.2, 0]} receiveShadow>
              <boxGeometry args={[totalWidth + 4, 0.2, 2]} />
              <meshStandardMaterial color="#8B4513" roughness={0.8} />
            </mesh>
          </Scroll>
        </ScrollControls>
      </Canvas>
    </div>
  );
}
