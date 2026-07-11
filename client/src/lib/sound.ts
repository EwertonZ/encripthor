class SoundManager {
  private audioContext: AudioContext | null = null;

  private getContext(): AudioContext {
    if (!this.audioContext) {
      try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch {
        // Web Audio não suportado — jogo funciona sem som
        return null as any;
      }
    }
    return this.audioContext;
  }

  play(type: 'correct' | 'wrong' | 'tick' | 'timeout' | 'victory' | 'round_start'): void {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      // Retomar se estiver suspenso (política de autoplay)
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;

      switch (type) {
        case 'correct':
          oscillator.frequency.setValueAtTime(523, now); // C5
          oscillator.frequency.setValueAtTime(659, now + 0.1); // E5
          oscillator.frequency.setValueAtTime(784, now + 0.2); // G5
          gain.gain.setValueAtTime(0.3, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
          oscillator.start(now);
          oscillator.stop(now + 0.4);
          break;

        case 'wrong':
          oscillator.type = 'square' as OscillatorType;
          oscillator.frequency.setValueAtTime(200, now);
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
          oscillator.start(now);
          oscillator.stop(now + 0.3);
          break;

        case 'tick':
          oscillator.frequency.setValueAtTime(1000, now);
          gain.gain.setValueAtTime(0.05, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
          oscillator.start(now);
          oscillator.stop(now + 0.05);
          break;

        case 'timeout':
          oscillator.frequency.setValueAtTime(440, now);
          gain.gain.setValueAtTime(0.3, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
          oscillator.start(now);
          oscillator.stop(now + 0.5);
          break;

        case 'victory':
          oscillator.frequency.setValueAtTime(523, now);
          oscillator.frequency.setValueAtTime(659, now + 0.15);
          oscillator.frequency.setValueAtTime(784, now + 0.3);
          oscillator.frequency.setValueAtTime(1047, now + 0.45);
          gain.gain.setValueAtTime(0.3, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
          oscillator.start(now);
          oscillator.stop(now + 0.8);
          break;

        case 'round_start':
          oscillator.frequency.setValueAtTime(440, now);
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
          oscillator.start(now);
          oscillator.stop(now + 0.15);
          break;
      }
    } catch {
      // Ignorar erros de áudio — jogo funciona sem som
    }
  }
}

export const soundManager = new SoundManager();
