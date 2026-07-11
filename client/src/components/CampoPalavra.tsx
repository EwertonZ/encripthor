'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface CampoPalavraProps {
  mode: 'write' | 'guess';
  onSubmit: (word: string) => void;
  disabled?: boolean;
  wordLength?: number | null;
  guessedCorrectly?: boolean;
  isWordMaster: boolean;
}

export default function CampoPalavra({
  mode,
  onSubmit,
  disabled = false,
  wordLength,
  guessedCorrectly = false,
  isWordMaster,
}: CampoPalavraProps) {
  const [value, setValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showShake, setShowShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!disabled && !isWordMaster && mode === 'guess') {
      inputRef.current?.focus();
    }
  }, [disabled, isWordMaster, mode]);

  // Auto-focus no modo write
  useEffect(() => {
    if (mode === 'write' && !disabled) {
      inputRef.current?.focus();
    }
  }, [mode, disabled]);

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim().toUpperCase();
    if (!trimmed || trimmed.length < 3) return;

    setIsSubmitting(true);
    onSubmit(trimmed);
    setValue('');

    // Feedback visual de que o palpite foi enviado (shake)
    setShowShake(true);
    setTimeout(() => {
      setShowShake(false);
      setIsSubmitting(false);
    }, 500);
  }, [value, onSubmit]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !disabled && !isSubmitting) {
      handleSubmit();
    }
  };

  const canSubmit = value.trim().length >= 3 && !disabled && !isSubmitting;

  // Estado de acertou
  if (guessedCorrectly) {
    return (
      <div className="text-center py-6 px-4 bg-emerald-900/20 border border-emerald-800/30 rounded-xl game-phase-enter">
        <p className="text-emerald-400 text-lg font-bold">✅ Você acertou!</p>
        <p className="text-emerald-600/60 text-sm mt-1">Aguardando os outros jogadores...</p>
      </div>
    );
  }

  // Estado de desabilitado (tempo esgotou ou perdeu a vez)
  if (disabled) {
    return (
      <div className="text-center py-6 px-4 bg-zinc-900/50 border border-zinc-800 rounded-xl">
        <p className="text-zinc-400 text-lg">
          {mode === 'write' ? '⏰ Tempo esgotado!' : '⏰ Tempo esgotado!'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className={`relative ${showShake ? 'shake' : ''}`}>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value.toUpperCase());
          }}
          onKeyDown={handleKeyDown}
          placeholder={
            mode === 'write'
              ? 'Digite a palavra para os outros adivinharem...'
              : 'Qual é a palavra?'
          }
          disabled={disabled}
          maxLength={20}
          className={`w-full px-4 py-3.5 bg-zinc-900/80 border rounded-xl text-white text-lg font-mono tracking-widest uppercase placeholder:text-zinc-600 placeholder:font-sans placeholder:tracking-normal placeholder:normal-case focus:outline-none transition-all duration-200 ${
            showShake
              ? 'border-red-500/50'
              : 'border-zinc-700 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20'
          }`}
        />

        {/* Placeholder de letras (modo guess, aguardando palavra) */}
        {mode === 'guess' && wordLength && value.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center gap-1.5 pointer-events-none">
            {Array.from({ length: wordLength }).map((_, i) => (
              <span
                key={i}
                className="w-3 h-0.5 bg-zinc-700 rounded-full animate-pulse"
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-600">
          {mode === 'write' ? 'Mínimo 3 letras' : `${value.length} letras`}
        </span>

        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`px-5 py-2 rounded-lg font-medium text-sm transition-all duration-200 active:scale-95 ${
            canSubmit
              ? mode === 'write'
                ? 'bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/30'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30'
              : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
          }`}
        >
          {isSubmitting ? '...' : mode === 'write' ? 'Confirmar Palavra' : 'Palpitar'}
        </button>
      </div>
    </div>
  );
}
