export function scrambleWord(word: string, maxAttempts = 10): string[] {
  if (word.length <= 1) return word.split('');

  const upper = word.toUpperCase();
  const letters = upper.split('');

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    for (let i = letters.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [letters[i], letters[j]] = [letters[j], letters[i]];
    }

    if (letters.join('') !== upper) {
      return letters;
    }
  }

  // Fallback: troca as duas primeiras letras diferentes
  for (let i = 1; i < letters.length; i++) {
    if (letters[0] !== letters[i]) {
      [letters[0], letters[i]] = [letters[i], letters[0]];
      return letters;
    }
  }

  return letters;
}

export function validateWord(word: string): { valid: boolean; error?: string } {
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
