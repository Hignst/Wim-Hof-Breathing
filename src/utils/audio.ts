
class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private volume: number = 0.6;

  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.setVolume(this.volume);
    this.masterGain.connect(this.ctx.destination);
  }

  setVolume(percent: number) {
    this.volume = percent;
    if (!this.masterGain || !this.ctx) return;
    // Exponential scaling for more natural volume control
    const vol = Math.pow(percent, 2) * 1.5;
    this.masterGain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.05);
  }

  private createOsc(freq: number, relativeVolume: number, destination: AudioNode) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const nodeGain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    nodeGain.gain.setValueAtTime(relativeVolume, this.ctx.currentTime);
    
    osc.connect(nodeGain);
    nodeGain.connect(destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 2.0);
  }

  playTone(freq: number, duration = 1.0, volume = 0.3) {
    if (!this.ctx || !this.masterGain) return;
    
    const now = this.ctx.currentTime;
    const attack = 0.05;

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(volume, now + attack);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    gainNode.connect(this.masterGain);

    this.createOsc(freq, 1.0, gainNode);
    this.createOsc(freq * 2, 0.3, gainNode);
    this.createOsc(freq * 3, 0.1, gainNode);
  }

  playLadder() {
    const freqs = [330, 440, 554, 660];
    freqs.forEach((f, i) => {
      setTimeout(() => this.playTone(f, 0.6, 0.1), i * 700);
    });
  }

  playWarning() {
    this.playTone(880, 0.2, 0.05);
    setTimeout(() => this.playTone(880, 0.4, 0.05), 150);
  }
}

export const audio = new SoundEngine();

export const AUDIO_FREQS = {
  inhale: 660,
  exhale: 440,
  hold: 240,
  recovery: 520,
  endRecovery: 330
};
