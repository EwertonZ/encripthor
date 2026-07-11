'use client';

interface TimerProps {
  remaining: number | null;
  phase: 'choosing' | 'guessing' | null;
}

export default function Timer({ remaining, phase }: TimerProps) {
  if (remaining === null || !phase) return null;

  const total = phase === 'choosing' ? 20 : 60;
  const progress = (remaining / total) * 100;

  // Cor conforme tempo restante
  let barColor = 'bg-emerald-500';
  let textColor = 'text-emerald-400';
  if (progress < 25) {
    barColor = 'bg-red-500';
    textColor = 'text-red-400';
  } else if (progress < 50) {
    barColor = 'bg-amber-500';
    textColor = 'text-amber-400';
  }

  const phaseLabel = phase === 'choosing' ? 'Escolha da palavra' : 'Adivinhação';
  const isUrgent = remaining <= 5;

  return (
    <div className="w-full">
      {/* Label e tempo */}
      <div className="flex items-center justify-between mb-1.5 px-1">
        <span className="text-zinc-500 text-xs font-medium uppercase tracking-wider">
          {phaseLabel}
        </span>
        <span className={`text-sm font-mono font-bold tabular-nums ${textColor} ${isUrgent ? 'animate-pulse' : ''}`}>
          {remaining}s
        </span>
      </div>

      {/* Barra de progresso */}
      <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-linear ${barColor}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
