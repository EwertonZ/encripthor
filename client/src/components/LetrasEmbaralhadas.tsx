'use client';

interface LetrasEmbaralhadasProps {
  letters: string[];
  wordLength: number | null;
}

export default function LetrasEmbaralhadas({ letters, wordLength }: LetrasEmbaralhadasProps) {
  // Se tem wordLength mas letters vazio, mostrar placeholders
  if (wordLength && letters.length === 0) {
    return (
      <div className="flex items-center justify-center gap-2 flex-wrap py-8">
        {Array.from({ length: wordLength }).map((_, i) => (
          <div
            key={i}
            className="w-10 h-12 bg-zinc-800/50 border border-zinc-700/50 rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (letters.length === 0) return null;

  return (
    <div className="flex items-center justify-center gap-2.5 flex-wrap py-8 max-w-lg mx-auto">
      {letters.map((letter, i) => {
        // Rotação pseudo-aleatória consistente por índice
        const rotation = ((i * 37 + 15) % 18) - 9; // -9° a +9°

        return (
          <div
            key={`${letter}-${i}`}
            className="letter-card w-12 h-14 sm:w-14 sm:h-16 bg-gradient-to-b from-zinc-800 to-zinc-900 border border-zinc-700/70 rounded-xl shadow-lg flex items-center justify-center select-none"
            style={{ '--index': i } as React.CSSProperties}
          >
            <span className="text-white text-xl sm:text-2xl font-bold font-mono tracking-wide letter-float"
              style={{ '--index': i } as React.CSSProperties}
            >
              {letter}
            </span>
          </div>
        );
      })}
    </div>
  );
}
