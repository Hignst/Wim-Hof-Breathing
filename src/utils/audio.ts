
class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private volume: number = 0.6;
  private noiseBuffer: AudioBuffer | null = null;
  private droneGain: GainNode | null = null;

  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.setVolume(this.volume);
    this.masterGain.connect(this.ctx.destination);
    
    this.createNoiseBuffer();
    this.startAtmosphericDrone();
  }

  private createNoiseBuffer() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 2;
    this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
  }

  private startAtmosphericDrone() {
    if (!this.ctx || !this.masterGain) return;
    
    // Very subtle, almost imperceptible low-frequency drone for depth
    this.droneGain = this.ctx.createGain();
    this.droneGain.gain.setValueAtTime(0.02, this.ctx.currentTime);
    this.droneGain.connect(this.masterGain);

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(40, this.ctx.currentTime); // 40Hz sub
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(100, this.ctx.currentTime);
    
    osc.connect(filter);
    filter.connect(this.droneGain);
    osc.start();
  }

  setVolume(percent: number) {
    this.volume = percent;
    if (!this.masterGain || !this.ctx) return;
    const vol = Math.pow(percent, 2) * 1.5;
    this.masterGain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.05);
  }

  playBreath(type: 'inhale' | 'exhale', duration: number) {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;

    const now = this.ctx.currentTime;
    
    // Source
    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    source.loop = true;

    // Shaping Filter
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = type === 'inhale' ? 1.5 : 0.7;

    // Stereo Panner
    const panner = this.ctx.createStereoPanner();
    
    // Gain Envelope
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, now);

    // Variation for realism
    const freqVar = 0.97 + Math.random() * 0.06;
    const volVar = 0.85 + Math.random() * 0.3;
    const durVar = duration * (0.98 + Math.random() * 0.04);

    if (type === 'inhale') {
      // Inhale: 700Hz -> 1400Hz
      filter.frequency.setValueAtTime(700 * freqVar, now);
      filter.frequency.exponentialRampToValueAtTime(1400 * freqVar, now + durVar * 0.95);
      
      gain.gain.linearRampToValueAtTime(0.3 * volVar, now + durVar * 0.8);
      gain.gain.exponentialRampToValueAtTime(0.001, now + durVar);
      
      // Expand stereo
      panner.pan.setValueAtTime(0, now);
      panner.pan.linearRampToValueAtTime(0.4, now + durVar * 0.5);
      panner.pan.linearRampToValueAtTime(0, now + durVar);
    } else {
      // Exhale: 900Hz -> 600Hz
      filter.frequency.setValueAtTime(900 * freqVar, now);
      filter.frequency.exponentialRampToValueAtTime(600 * freqVar, now + durVar * 0.9);
      
      gain.gain.linearRampToValueAtTime(0.2 * volVar, now + durVar * 0.4);
      gain.gain.exponentialRampToValueAtTime(0.001, now + durVar);
      
      // Ground to center
      panner.pan.setValueAtTime(0, now);
    }

    // Connect nodes
    source.connect(filter);
    filter.connect(panner);
    panner.connect(gain);
    gain.connect(this.masterGain);

    source.start(now);
    source.stop(now + durVar + 0.1);
  }

  playTone(freq: number, duration = 1.0, volume = 0.3) {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(volume, now + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    gainNode.connect(this.masterGain);

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.connect(gainNode);
    osc.start();
    osc.stop(now + duration);
  }

  playLadder() {
    const freqs = [330, 440, 554, 660];
    freqs.forEach((f, i) => setTimeout(() => this.playTone(f, 0.6, 0.1), i * 700));
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
