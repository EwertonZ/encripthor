/**
 * Embaralha as letras de uma palavra usando Fisher-Yates.
 * Garante que o resultado seja diferente da palavra original.
 */
export function scrambleWord(word: string): string[] {
  if (word.length <= 1) return word.split('');

  const letters = word.toUpperCase().split('');

  // Fisher-Yates Shuffle (O(n))
  for (let i = letters.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [letters[i], letters[j]] = [letters[j], letters[i]];
  }

  // Garantir que não ficou igual à original
  if (letters.join('') === word.toUpperCase()) {
    return scrambleWord(word); // recursão (raro)
  }

  return letters;
}

/**
 * Valida se a palavra atende aos requisitos mínimos.
 */
export function validateWord(word: string): { valid: true } | { valid: false; error: string } {
  const trimmed = word.trim();
  if (trimmed.length < 3) {
    return { valid: false, error: 'A palavra deve ter pelo menos 3 letras' };
  }
  if (trimmed.length > 20) {
    return { valid: false, error: 'A palavra deve ter no máximo 20 letras' };
  }
  if (!/^[A-Za-zÀ-ÿ]+$/.test(trimmed)) {
    return { valid: false, error: 'A palavra deve conter apenas letras' };
  }
  return { valid: true };
}
