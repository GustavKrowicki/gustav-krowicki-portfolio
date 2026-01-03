import { Canvas } from '@react-three/fiber';
import { ScrollControls, Scroll } from '@react-three/drei';
import Book3D from './Book3D';
import type { BookData } from '@/lib/utils/csvParser';

interface Bookshelf3DSceneProps {
  books: BookData[];
  onBookClick: (book: BookData) => void;
}

export default function Bookshelf3DScene({
  books,
  onBookClick,
}: Bookshelf3DSceneProps) {
  // Calculate total width needed for all books with spacing
  const bookSpacing = 0.7;
  const totalWidth = books.length * bookSpacing;

  return (
    <div className="w-full h-[600px] bg-gradient-to-b from-neutral-100 to-neutral-200 rounded-xl overflow-hidden">
      <Canvas
        camera={{
          position: [0, 0, 6],
          fov: 45,
        }}
        shadows
      >
        {/* Ambient light for overall scene illumination */}
        <ambientLight intensity={0.5} />

        {/* Directional light for depth and shadows */}
        <directionalLight
          position={[5, 5, 5]}
          intensity={0.8}
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
          pages={10} // Increased scroll distance to reach all 23 books
          horizontal
          damping={0.2}
        >
          <Scroll>
            {/* Render all books in a horizontal line */}
            {books.map((book, index) => {
              // Position books from 0 onwards, ScrollControls will translate them
              const x = index * bookSpacing;
              const y = 0;
              const z = 0;

              return (
                <Book3D
                  key={book.id}
                  book={book}
                  position={[x, y, z]}
                  coverUrl={null}
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
