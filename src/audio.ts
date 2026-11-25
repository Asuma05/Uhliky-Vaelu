import type { EnemyKind } from './types';

export type StepSurface = 'grass' | 'stone' | 'wood' | 'water' | 'marsh';
export type UiSoundKind = 'open' | 'close' | 'select' | 'potion' | 'equip';

export type AmbientBiomeId =
  | 'meadow'
  | 'forest'
  | 'marsh'
  | 'volcanic_forge'
  | 'siltmoor'
  | 'aethelgard'
  | 'ash_wasteland'
  | 'quarry'
  | 'frost';

interface BiomeAudioConfig {
  /** Base drone oscillator frequencies (Hz) & waveforms */
  droneOscs: { freq: number; type: OscillatorType; gain?: number }[];
  droneFilterType: BiquadFilterType;
  droneFilterFreq: number;
  droneFilterQ: number;
  droneLfoRate: number;
  droneLfoDepth: number;
  droneGain: number;
  /** Optional wet pitch-wobble LFO (e.g. marsh/water) */
  pitchLfoRate?: number;
  pitchLfoDepth?: number;
  /** Environmental noise bed */
  noiseSource: 'pink' | 'white';
  noiseFilterType: BiquadFilterType;
  noiseFilterFreq: number;
  noiseFilterQ: number;
  noiseLfoRate: number;
  noiseLfoDepth: number;
  noiseGain: number;
  /** Optional cathedral/cavern delay feedback */
  reverbDelay?: { time: number; feedback: number; wet: number };
  /** Sparse distant event interval range (seconds) */
  eventInterval: [number, number];
  /** Sparse distant event kind */
  eventKind:
    | 'meadow_tone'
    | 'forest_echo'
    | 'marsh_bubble'
    | 'forge_clang'
    | 'siltmoor_creak'
    | 'crystal_bell'
    | 'wasteland_chime'
    | 'quarry_rock'
    | 'frost_chime';
}

interface ActiveBiomeVoice {
  id: AmbientBiomeId;
  gain: GainNode;
  stopNodes: AudioScheduledSourceNode[];
  allNodes: AudioNode[];
  cleanupTimer: number | null;
}

const AUDIO_STORAGE_KEY = 'uhliky_audio_settings_v1';
const BIOME_CROSSFADE_SEC = 2.5;

const BIOME_PROFILES: Record<AmbientBiomeId, BiomeAudioConfig> = {
  // Popelavá louka / Startovní mýtina: A minor melancholic drone + ash wind + lonely warm tone
  meadow: {
    droneOscs: [
      { freq: 55.0, type: 'sine', gain: 0.45 },
      { freq: 55.35, type: 'triangle', gain: 0.3 },
      { freq: 82.41, type: 'sine', gain: 0.35 },
    ],
    droneFilterType: 'lowpass',
    droneFilterFreq: 145,
    droneFilterQ: 1.4,
    droneLfoRate: 0.08,
    droneLfoDepth: 35,
    droneGain: 0.065,
    noiseSource: 'pink',
    noiseFilterType: 'bandpass',
    noiseFilterFreq: 310,
    noiseFilterQ: 3.2,
    noiseLfoRate: 0.11,
    noiseLfoDepth: 115,
    noiseGain: 0.045,
    eventInterval: [5.5, 10.5],
    eventKind: 'meadow_tone',
  },

  // Lesy / Hluboký hvozd: deeper earthy D minor drone + treetop rustle + distant woody echoes
  forest: {
    droneOscs: [
      { freq: 73.42, type: 'triangle', gain: 0.35 },
      { freq: 55.0, type: 'sine', gain: 0.45 },
      { freq: 87.31, type: 'sine', gain: 0.25 },
    ],
    droneFilterType: 'lowpass',
    droneFilterFreq: 120,
    droneFilterQ: 1.6,
    droneLfoRate: 0.06,
    droneLfoDepth: 28,
    droneGain: 0.072,
    noiseSource: 'pink',
    noiseFilterType: 'bandpass',
    noiseFilterFreq: 540,
    noiseFilterQ: 1.8,
    noiseLfoRate: 0.15,
    noiseLfoDepth: 190,
    noiseGain: 0.052,
    reverbDelay: { time: 0.34, feedback: 0.32, wet: 0.25 },
    eventInterval: [4.5, 9.0],
    eventKind: 'forest_echo',
  },

  // Řeky, mokřady a bažiny: dark wet-modulated drone + water lapping & bubbling
  marsh: {
    droneOscs: [
      { freq: 69.3, type: 'triangle', gain: 0.35 },
      { freq: 98.0, type: 'sine', gain: 0.38 },
      { freq: 69.65, type: 'sine', gain: 0.35 },
    ],
    droneFilterType: 'lowpass',
    droneFilterFreq: 155,
    droneFilterQ: 2.1,
    droneLfoRate: 0.13,
    droneLfoDepth: 48,
    droneGain: 0.062,
    pitchLfoRate: 0.28,
    pitchLfoDepth: 1.4,
    noiseSource: 'pink',
    noiseFilterType: 'bandpass',
    noiseFilterFreq: 420,
    noiseFilterQ: 2.6,
    noiseLfoRate: 0.24,
    noiseLfoDepth: 160,
    noiseGain: 0.048,
    eventInterval: [3.2, 6.8],
    eventKind: 'marsh_bubble',
  },

  // Sopečné pustiny a Kael'Varr (Železná výheň): deep industrial bass + furnace crackle + metallic clang
  volcanic_forge: {
    droneOscs: [
      { freq: 41.2, type: 'sawtooth', gain: 0.28 },
      { freq: 41.45, type: 'triangle', gain: 0.42 },
      { freq: 61.74, type: 'triangle', gain: 0.32 },
    ],
    droneFilterType: 'lowpass',
    droneFilterFreq: 115,
    droneFilterQ: 2.2,
    droneLfoRate: 0.16,
    droneLfoDepth: 32,
    droneGain: 0.085,
    noiseSource: 'white',
    noiseFilterType: 'bandpass',
    noiseFilterFreq: 1650,
    noiseFilterQ: 1.3,
    noiseLfoRate: 0.45,
    noiseLfoDepth: 650,
    noiseGain: 0.024,
    reverbDelay: { time: 0.28, feedback: 0.38, wet: 0.28 },
    eventInterval: [4.0, 8.5],
    eventKind: 'forge_clang',
  },

  // Siltmoor (Kalný přístav): mysterious foggy G minor pad + dark water under pilings + wooden creak
  siltmoor: {
    droneOscs: [
      { freq: 49.0, type: 'sine', gain: 0.45 },
      { freq: 73.42, type: 'triangle', gain: 0.3 },
      { freq: 116.54, type: 'sine', gain: 0.22 },
    ],
    droneFilterType: 'lowpass',
    droneFilterFreq: 165,
    droneFilterQ: 1.5,
    droneLfoRate: 0.09,
    droneLfoDepth: 42,
    droneGain: 0.068,
    pitchLfoRate: 0.18,
    pitchLfoDepth: 0.8,
    noiseSource: 'pink',
    noiseFilterType: 'bandpass',
    noiseFilterFreq: 340,
    noiseFilterQ: 2.2,
    noiseLfoRate: 0.22,
    noiseLfoDepth: 130,
    noiseGain: 0.048,
    reverbDelay: { time: 0.38, feedback: 0.3, wet: 0.24 },
    eventInterval: [4.0, 8.0],
    eventKind: 'siltmoor_creak',
  },

  // Aethelgard (Bílý relikviář): cold ethereal choral/glass pad + temple reverb + high crystal bell
  aethelgard: {
    droneOscs: [
      { freq: 92.5, type: 'sine', gain: 0.32 },
      { freq: 138.59, type: 'triangle', gain: 0.2 },
      { freq: 220.0, type: 'sine', gain: 0.24 },
      { freq: 329.63, type: 'sine', gain: 0.14 },
    ],
    droneFilterType: 'lowpass',
    droneFilterFreq: 480,
    droneFilterQ: 1.1,
    droneLfoRate: 0.07,
    droneLfoDepth: 110,
    droneGain: 0.068,
    noiseSource: 'pink',
    noiseFilterType: 'bandpass',
    noiseFilterFreq: 760,
    noiseFilterQ: 2.8,
    noiseLfoRate: 0.09,
    noiseLfoDepth: 140,
    noiseGain: 0.025,
    reverbDelay: { time: 0.46, feedback: 0.52, wet: 0.45 },
    eventInterval: [4.5, 9.0],
    eventKind: 'crystal_bell',
  },

  // Popelavá pustina / Kostěná pláň (ruiny / pustiny)
  ash_wasteland: {
    droneOscs: [
      { freq: 65.41, type: 'sine', gain: 0.42 },
      { freq: 77.78, type: 'triangle', gain: 0.24 },
      { freq: 98.0, type: 'sine', gain: 0.26 },
    ],
    droneFilterType: 'lowpass',
    droneFilterFreq: 150,
    droneFilterQ: 1.7,
    droneLfoRate: 0.07,
    droneLfoDepth: 40,
    droneGain: 0.06,
    noiseSource: 'pink',
    noiseFilterType: 'bandpass',
    noiseFilterFreq: 460,
    noiseFilterQ: 3.5,
    noiseLfoRate: 0.14,
    noiseLfoDepth: 180,
    noiseGain: 0.05,
    eventInterval: [5.0, 10.0],
    eventKind: 'wasteland_chime',
  },

  // Skalnatý kamenolom
  quarry: {
    droneOscs: [
      { freq: 46.25, type: 'triangle', gain: 0.36 },
      { freq: 69.3, type: 'sine', gain: 0.4 },
    ],
    droneFilterType: 'lowpass',
    droneFilterFreq: 125,
    droneFilterQ: 1.8,
    droneLfoRate: 0.06,
    droneLfoDepth: 25,
    droneGain: 0.068,
    noiseSource: 'pink',
    noiseFilterType: 'bandpass',
    noiseFilterFreq: 250,
    noiseFilterQ: 2.8,
    noiseLfoRate: 0.1,
    noiseLfoDepth: 85,
    noiseGain: 0.044,
    reverbDelay: { time: 0.4, feedback: 0.36, wet: 0.3 },
    eventInterval: [5.0, 9.5],
    eventKind: 'quarry_rock',
  },

  // Zmrzlá pustina
  frost: {
    droneOscs: [
      { freq: 61.74, type: 'sine', gain: 0.38 },
      { freq: 92.5, type: 'triangle', gain: 0.22 },
      { freq: 293.66, type: 'sine', gain: 0.12 },
    ],
    droneFilterType: 'lowpass',
    droneFilterFreq: 360,
    droneFilterQ: 1.3,
    droneLfoRate: 0.08,
    droneLfoDepth: 80,
    droneGain: 0.058,
    noiseSource: 'white',
    noiseFilterType: 'bandpass',
    noiseFilterFreq: 920,
    noiseFilterQ: 3.4,
    noiseLfoRate: 0.16,
    noiseLfoDepth: 320,
    noiseGain: 0.032,
    reverbDelay: { time: 0.42, feedback: 0.44, wet: 0.35 },
    eventInterval: [5.0, 9.5],
    eventKind: 'frost_chime',
  },
};

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  private rainGain: GainNode | null = null;
  private rainShimmerGain: GainNode | null = null;

  private whiteNoiseBuffer: AudioBuffer | null = null;
  private pinkNoiseBuffer: AudioBuffer | null = null;

  private muted = false;
  private unlocked = false;
  private currentRainIntensity = 0;

  private ambientVolume = 0.8;
  private sfxVolume = 0.85;
  private readonly masterVolume = 0.65;

  private currentBiome: AmbientBiomeId = 'meadow';
  private activeVoice: ActiveBiomeVoice | null = null;
  private fadingVoices: ActiveBiomeVoice[] = [];
  private nextEventTimer = 3.5;

  constructor() {
    this.loadSettings();
  }

  private loadSettings(): void {
    try {
      const raw = localStorage.getItem(AUDIO_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { ambientVolume?: number; sfxVolume?: number };
      if (typeof parsed.ambientVolume === 'number' && Number.isFinite(parsed.ambientVolume)) {
        this.ambientVolume = Math.max(0, Math.min(1, parsed.ambientVolume));
      }
      if (typeof parsed.sfxVolume === 'number' && Number.isFinite(parsed.sfxVolume)) {
        this.sfxVolume = Math.max(0, Math.min(1, parsed.sfxVolume));
      }
    } catch {
      // Ignore invalid localStorage
    }
  }

  private saveSettings(): void {
    try {
      localStorage.setItem(
        AUDIO_STORAGE_KEY,
        JSON.stringify({ ambientVolume: this.ambientVolume, sfxVolume: this.sfxVolume })
      );
    } catch {
      // Ignore storage errors
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public isUnlocked(): boolean {
    return this.unlocked && this.ctx !== null && this.ctx.state === 'running';
  }

  public getAmbientVolume(): number {
    return this.ambientVolume;
  }

  public getSfxVolume(): number {
    return this.sfxVolume;
  }

  public getCurrentBiome(): AmbientBiomeId {
    return this.currentBiome;
  }

  public setAmbientVolume(volume: number): void {
    this.ambientVolume = Math.max(0, Math.min(1, volume));
    this.saveSettings();
    if (this.ctx && this.ambientGain) {
      const now = this.ctx.currentTime;
      this.ambientGain.gain.cancelScheduledValues(now);
      this.ambientGain.gain.setTargetAtTime(this.ambientVolume, now, 0.04);
    }
  }

  public setSfxVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
    this.saveSettings();
    if (this.ctx && this.sfxGain) {
      const now = this.ctx.currentTime;
      this.sfxGain.gain.cancelScheduledValues(now);
      this.sfxGain.gain.setTargetAtTime(this.sfxVolume, now, 0.04);
    }
  }

  /**
   * Safely initializes and resumes the Web Audio API context on the first
   * user click or keypress to comply with browser autoplay policies.
   */
  public unlock(): void {
    try {
      if (!this.ctx) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;

        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.muted ? 0 : this.masterVolume;
        this.masterGain.connect(this.ctx.destination);

        this.ambientGain = this.ctx.createGain();
        this.ambientGain.gain.value = this.ambientVolume;
        this.ambientGain.connect(this.masterGain);

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = this.sfxVolume;
        this.sfxGain.connect(this.masterGain);

        this.whiteNoiseBuffer = this.createWhiteNoiseBuffer(this.ctx, 2.0);
        this.pinkNoiseBuffer = this.createPinkNoiseBuffer(this.ctx, 2.0);

        this.startRainBed(this.ctx, this.ambientGain);
        this.startBiomeVoice(this.currentBiome, false);
        this.unlocked = true;
      }

      if (this.ctx.state === 'suspended') {
        void this.ctx.resume().catch(() => {
          // Ignore autoplay resume rejections if triggered outside a valid gesture
        });
      }
    } catch {
      // Fail gracefully if Web Audio API is unavailable in the environment
    }
  }

  public toggleMute(): boolean {
    this.unlock();
    this.muted = !this.muted;
    if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : this.masterVolume, now, 0.04);
    }
    return this.muted;
  }

  /** Smoothly adjusts ambient rain volume (0..1) driven by EnvironmentSystem */
  public setRainIntensity(intensity: number): void {
    const clamped = Math.max(0, Math.min(1, intensity));
    this.currentRainIntensity = clamped;

    if (!this.ctx || !this.rainGain || !this.rainShimmerGain) return;
    const now = this.ctx.currentTime;
    this.rainGain.gain.setTargetAtTime(clamped * 0.16, now, 0.25);
    this.rainShimmerGain.gain.setTargetAtTime(clamped * 0.045, now, 0.25);
  }

  /** Smoothly crossfades (2.5s linearRampToValueAtTime) to the target biome's ambient profile */
  public setBiome(biome: AmbientBiomeId): void {
    if (biome === this.currentBiome) return;
    this.currentBiome = biome;

    if (!this.ctx || !this.ambientGain) return;
    this.startBiomeVoice(biome, true);
  }

  /** Periodic tick to trigger sparse distant biome tones */
  public update(dt: number): void {
    if (!this.ctx || !this.activeVoice || this.muted || this.ambientVolume <= 0.01) return;
    if (this.ctx.state !== 'running') return;

    this.nextEventTimer -= dt;
    if (this.nextEventTimer <= 0) {
      const cfg = BIOME_PROFILES[this.activeVoice.id];
      this.triggerBiomeEvent(this.ctx, this.activeVoice.gain, cfg.eventKind);
      const [minInt, maxInt] = cfg.eventInterval;
      this.nextEventTimer = minInt + Math.random() * (maxInt - minInt);
    }
  }

  private getReadyNodes(): { ctx: AudioContext; out: GainNode } | null {
    if (!this.ctx || !this.sfxGain || this.muted || this.sfxVolume <= 0.001 || this.ctx.state !== 'running') {
      return null;
    }
    return { ctx: this.ctx, out: this.sfxGain };
  }

  // =========================================================================
  // NOISE BUFFER GENERATORS
  // =========================================================================
  private createWhiteNoiseBuffer(ctx: AudioContext, durationSec: number): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * durationSec);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  /** Paul Kellet's warm pink noise approximation for organic wind, rain, and footsteps */
  private createPinkNoiseBuffer(ctx: AudioContext, durationSec: number): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * durationSec);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    let b3 = 0;
    let b4 = 0;
    let b5 = 0;
    let b6 = 0;

    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.969 * b2 + white * 0.153852;
      b3 = 0.8665 * b3 + white * 0.3104856;
      b4 = 0.55 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.016898;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.09;
      b6 = white * 0.115926;
    }
    return buffer;
  }

  // =========================================================================
  // DYNAMIC RAIN BED (UNCHANGED TIMBRE, ROUTED TO AMBIENT BUS)
  // =========================================================================
  private startRainBed(ctx: AudioContext, dest: GainNode): void {
    if (!this.pinkNoiseBuffer) return;

    const rainSrc = ctx.createBufferSource();
    rainSrc.buffer = this.pinkNoiseBuffer;
    rainSrc.loop = true;

    const rainHp = ctx.createBiquadFilter();
    rainHp.type = 'highpass';
    rainHp.frequency.value = 780;

    const rainLp = ctx.createBiquadFilter();
    rainLp.type = 'lowpass';
    rainLp.frequency.value = 3200;

    this.rainGain = ctx.createGain();
    this.rainGain.gain.value = this.currentRainIntensity * 0.16;

    rainSrc.connect(rainHp);
    rainHp.connect(rainLp);
    rainLp.connect(this.rainGain);
    this.rainGain.connect(dest);
    rainSrc.start();

    if (this.whiteNoiseBuffer) {
      const shimmerSrc = ctx.createBufferSource();
      shimmerSrc.buffer = this.whiteNoiseBuffer;
      shimmerSrc.loop = true;

      const shimmerBp = ctx.createBiquadFilter();
      shimmerBp.type = 'bandpass';
      shimmerBp.frequency.value = 5400;
      shimmerBp.Q.value = 1.2;

      this.rainShimmerGain = ctx.createGain();
      this.rainShimmerGain.gain.value = this.currentRainIntensity * 0.045;

      shimmerSrc.connect(shimmerBp);
      shimmerBp.connect(this.rainShimmerGain);
      this.rainShimmerGain.connect(dest);
      shimmerSrc.start();
    }
  }

  // =========================================================================
  // BIOME AMBIENT ENGINE WITH 2.5s CROSSFADE
  // =========================================================================
  private startBiomeVoice(biome: AmbientBiomeId, crossfade: boolean): void {
    if (!this.ctx || !this.ambientGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Fade out current voice smoothly over 2.5s
    if (this.activeVoice) {
      const oldVoice = this.activeVoice;
      this.activeVoice = null;
      this.fadeOutVoice(oldVoice, now);
    }

    const cfg = BIOME_PROFILES[biome];
    const voiceGain = ctx.createGain();
    if (crossfade) {
      voiceGain.gain.setValueAtTime(0, now);
      voiceGain.gain.linearRampToValueAtTime(1, now + BIOME_CROSSFADE_SEC);
    } else {
      voiceGain.gain.setValueAtTime(1, now);
    }
    voiceGain.connect(this.ambientGain);

    const stopNodes: AudioScheduledSourceNode[] = [];
    const allNodes: AudioNode[] = [voiceGain];

    // Optional reverb bus (feedback delay) for spacious biomes
    let reverbBus: GainNode | null = null;
    if (cfg.reverbDelay) {
      const delay = ctx.createDelay(1.0);
      delay.delayTime.value = cfg.reverbDelay.time;
      const fb = ctx.createGain();
      fb.gain.value = cfg.reverbDelay.feedback;
      const wet = ctx.createGain();
      wet.gain.value = cfg.reverbDelay.wet;
      const damp = ctx.createBiquadFilter();
      damp.type = 'lowpass';
      damp.frequency.value = 1800;

      reverbBus = ctx.createGain();
      reverbBus.connect(delay);
      delay.connect(damp);
      damp.connect(fb);
      fb.connect(delay);
      damp.connect(wet);
      wet.connect(voiceGain);
      allNodes.push(delay, fb, wet, damp, reverbBus);
    }

    // 1. Synth drone layer
    const droneFilter = ctx.createBiquadFilter();
    droneFilter.type = cfg.droneFilterType;
    droneFilter.frequency.value = cfg.droneFilterFreq;
    droneFilter.Q.value = cfg.droneFilterQ;

    const droneOut = ctx.createGain();
    droneOut.gain.value = cfg.droneGain;
    droneFilter.connect(droneOut);
    droneOut.connect(voiceGain);
    if (reverbBus) droneOut.connect(reverbBus);

    const droneLfo = ctx.createOscillator();
    const droneLfoGain = ctx.createGain();
    droneLfo.type = 'sine';
    droneLfo.frequency.value = cfg.droneLfoRate;
    droneLfoGain.gain.value = cfg.droneLfoDepth;
    droneLfo.connect(droneLfoGain);
    droneLfoGain.connect(droneFilter.frequency);
    droneLfo.start(now);
    stopNodes.push(droneLfo);
    allNodes.push(droneFilter, droneOut, droneLfo, droneLfoGain);

    let pitchLfo: OscillatorNode | null = null;
    let pitchLfoGain: GainNode | null = null;
    if (cfg.pitchLfoRate && cfg.pitchLfoDepth) {
      pitchLfo = ctx.createOscillator();
      pitchLfoGain = ctx.createGain();
      pitchLfo.type = 'sine';
      pitchLfo.frequency.value = cfg.pitchLfoRate;
      pitchLfoGain.gain.value = cfg.pitchLfoDepth;
      pitchLfo.connect(pitchLfoGain);
      pitchLfo.start(now);
      stopNodes.push(pitchLfo);
      allNodes.push(pitchLfo, pitchLfoGain);
    }

    for (const oscCfg of cfg.droneOscs) {
      const osc = ctx.createOscillator();
      osc.type = oscCfg.type;
      osc.frequency.value = oscCfg.freq;
      if (pitchLfoGain) {
        pitchLfoGain.connect(osc.frequency);
      }
      const g = ctx.createGain();
      g.gain.value = oscCfg.gain ?? 0.35;
      osc.connect(g);
      g.connect(droneFilter);
      osc.start(now);
      stopNodes.push(osc);
      allNodes.push(osc, g);
    }

    // 2. Environmental noise texture layer
    const noiseBuf = cfg.noiseSource === 'white' ? this.whiteNoiseBuffer : this.pinkNoiseBuffer;
    if (noiseBuf) {
      const noiseSrc = ctx.createBufferSource();
      noiseSrc.buffer = noiseBuf;
      noiseSrc.loop = true;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = cfg.noiseFilterType;
      noiseFilter.frequency.value = cfg.noiseFilterFreq;
      noiseFilter.Q.value = cfg.noiseFilterQ;

      const noiseLfo = ctx.createOscillator();
      const noiseLfoGain = ctx.createGain();
      noiseLfo.type = 'sine';
      noiseLfo.frequency.value = cfg.noiseLfoRate;
      noiseLfoGain.gain.value = cfg.noiseLfoDepth;
      noiseLfo.connect(noiseLfoGain);
      noiseLfoGain.connect(noiseFilter.frequency);

      const noiseOut = ctx.createGain();
      noiseOut.gain.value = cfg.noiseGain;

      noiseSrc.connect(noiseFilter);
      noiseFilter.connect(noiseOut);
      noiseOut.connect(voiceGain);
      noiseSrc.start(now);
      noiseLfo.start(now);

      stopNodes.push(noiseSrc, noiseLfo);
      allNodes.push(noiseSrc, noiseFilter, noiseLfo, noiseLfoGain, noiseOut);
    }

    this.activeVoice = {
      id: biome,
      gain: voiceGain,
      stopNodes,
      allNodes,
      cleanupTimer: null,
    };

    const [minInt, maxInt] = cfg.eventInterval;
    this.nextEventTimer = minInt * 0.45 + Math.random() * (maxInt - minInt) * 0.5;
  }

  private fadeOutVoice(voice: ActiveBiomeVoice, now: number): void {
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
    voice.gain.gain.linearRampToValueAtTime(0, now + BIOME_CROSSFADE_SEC);

    this.fadingVoices.push(voice);
    voice.cleanupTimer = window.setTimeout(() => {
      this.disposeVoice(voice);
      const idx = this.fadingVoices.indexOf(voice);
      if (idx !== -1) this.fadingVoices.splice(idx, 1);
    }, (BIOME_CROSSFADE_SEC + 0.15) * 1000);
  }

  private disposeVoice(voice: ActiveBiomeVoice): void {
    if (voice.cleanupTimer !== null) {
      clearTimeout(voice.cleanupTimer);
      voice.cleanupTimer = null;
    }
    for (const node of voice.stopNodes) {
      try {
        node.stop();
      } catch {
        // Ignore already stopped
      }
    }
    for (const node of voice.allNodes) {
      try {
        node.disconnect();
      } catch {
        // Ignore disconnect errors
      }
    }
  }

  private triggerBiomeEvent(
    ctx: AudioContext,
    dest: GainNode,
    kind: BiomeAudioConfig['eventKind']
  ): void {
    const now = ctx.currentTime;

    if (kind === 'meadow_tone') {
      const notes = [220, 261.63, 329.63, 392.0];
      const freq = notes[Math.floor(Math.random() * notes.length)];
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 900;

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(0.045, now + 0.08);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 2.4);

      osc.connect(lp);
      lp.connect(g);
      g.connect(dest);
      osc.start(now);
      osc.stop(now + 2.45);
      return;
    }

    if (kind === 'forest_echo') {
      // Distant woody hollow echo (two soft taps)
      const baseFreq = 180 + Math.random() * 110;
      for (let i = 0; i < 2; i++) {
        const t = now + i * 0.28;
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(baseFreq, t);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.72, t + 0.14);

        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = baseFreq * 1.4;
        bp.Q.value = 3.5;

        const g = ctx.createGain();
        const amp = i === 0 ? 0.05 : 0.022;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(amp, t + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);

        osc.connect(bp);
        bp.connect(g);
        g.connect(dest);
        osc.start(t);
        osc.stop(t + 0.24);
      }
      return;
    }

    if (kind === 'marsh_bubble') {
      // Muffled swamp bubble blips
      const count = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < count; i++) {
        const t = now + i * (0.12 + Math.random() * 0.14);
        const startF = 170 + Math.random() * 140;
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(startF, t);
        osc.frequency.exponentialRampToValueAtTime(startF * 2.1, t + 0.09);

        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.032, t + 0.018);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);

        osc.connect(g);
        g.connect(dest);
        osc.start(t);
        osc.stop(t + 0.12);
      }
      return;
    }

    if (kind === 'forge_clang') {
      // Distant metallic anvil / furnace resonance
      const base = 260 + Math.random() * 120;
      const partials = [1, 1.58, 2.41];
      partials.forEach((ratio, idx) => {
        const osc = ctx.createOscillator();
        osc.type = idx === 0 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(base * ratio, now);

        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, now);
        g.gain.linearRampToValueAtTime(0.032 / (idx + 1), now + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 1.4 - idx * 0.25);

        osc.connect(g);
        g.connect(dest);
        osc.start(now);
        osc.stop(now + 1.45);
      });
      return;
    }

    if (kind === 'siltmoor_creak') {
      // Subtle wooden dock/plank creak
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      const f0 = 115 + Math.random() * 35;
      osc.frequency.setValueAtTime(f0, now);
      osc.frequency.linearRampToValueAtTime(f0 * 0.74, now + 0.42);

      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 340;
      bp.Q.value = 4.2;

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(0.035, now + 0.08);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.46);

      osc.connect(bp);
      bp.connect(g);
      g.connect(dest);
      osc.start(now);
      osc.stop(now + 0.48);
      return;
    }

    if (kind === 'crystal_bell' || kind === 'frost_chime') {
      const notes =
        kind === 'crystal_bell'
          ? [987.77, 1318.51, 1479.98, 1760.0]
          : [1174.66, 1396.91, 1760.0];
      const freq = notes[Math.floor(Math.random() * notes.length)];
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(0.03, now + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 2.6);

      osc.connect(g);
      g.connect(dest);
      osc.start(now);
      osc.stop(now + 2.65);
      return;
    }

    if (kind === 'quarry_rock' && this.pinkNoiseBuffer) {
      // Distant falling pebble echo
      const src = ctx.createBufferSource();
      src.buffer = this.pinkNoiseBuffer;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 620 + Math.random() * 240;
      bp.Q.value = 3.0;

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(0.04, now + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

      src.connect(bp);
      bp.connect(g);
      g.connect(dest);
      src.start(now, Math.random(), 0.18);
      return;
    }

    // wasteland_chime
    const notes = [196.0, 233.08, 261.63];
    const freq = notes[Math.floor(Math.random() * notes.length)];
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 640;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.035, now + 0.06);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 1.9);
    osc.connect(lp);
    lp.connect(g);
    g.connect(dest);
    osc.start(now);
    osc.stop(now + 1.95);
  }

  // =========================================================================
  // PROCEDURAL ACTION SFX
  // =========================================================================

  /** Surface-aware footstep sound; significantly quieter while sneaking (C) */
  public playStep(sprinting: boolean, surface: StepSurface = 'grass', sneaking = false): void {
    const ready = this.getReadyNodes();
    if (!ready || !this.pinkNoiseBuffer) return;
    const { ctx, out } = ready;
    const now = ctx.currentTime;

    const src = ctx.createBufferSource();
    src.buffer = this.pinkNoiseBuffer;
    src.playbackRate.value = 0.85 + Math.random() * 0.35;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    const baseFreq =
      surface === 'stone'
        ? 1350
        : surface === 'wood'
          ? 640
          : surface === 'water'
            ? 980
            : surface === 'marsh'
              ? 440
              : 740;
    filter.frequency.value = (sneaking ? baseFreq * 0.72 : baseFreq) + (Math.random() - 0.5) * 160;
    filter.Q.value = surface === 'stone' ? 2.6 : surface === 'wood' ? 3.2 : 1.5;

    const gain = ctx.createGain();
    const peak = sneaking ? 0.011 : sprinting ? 0.088 : 0.05;
    const dur = surface === 'water' ? 0.11 : 0.055;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peak, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(out);

    const offset = Math.random() * 1.4;
    src.start(now, offset, dur + 0.015);

    // Subtle wooden thump on Siltmoor walkways / bridges
    if (surface === 'wood') {
      const thump = ctx.createOscillator();
      thump.type = 'triangle';
      thump.frequency.setValueAtTime(145 + Math.random() * 25, now);
      thump.frequency.exponentialRampToValueAtTime(75, now + 0.045);

      const tg = ctx.createGain();
      tg.gain.setValueAtTime(sneaking ? 0.01 : sprinting ? 0.065 : 0.038, now);
      tg.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

      thump.connect(tg);
      tg.connect(out);
      thump.start(now);
      thump.stop(now + 0.055);
    }

    // Subtle water splash droplet when wading in river/marsh water
    if (surface === 'water') {
      const splash = ctx.createOscillator();
      splash.type = 'sine';
      splash.frequency.setValueAtTime(320 + Math.random() * 140, now + 0.012);
      splash.frequency.exponentialRampToValueAtTime(680, now + 0.075);

      const sg = ctx.createGain();
      sg.gain.setValueAtTime(0.0001, now + 0.01);
      sg.gain.linearRampToValueAtTime(sneaking ? 0.008 : 0.035, now + 0.025);
      sg.gain.exponentialRampToValueAtTime(0.0001, now + 0.085);

      splash.connect(sg);
      sg.connect(out);
      splash.start(now + 0.01);
      splash.stop(now + 0.09);
    }
  }

  /** Mechanical latch click + soft flame ignition / snuff hiss for Lantern (F) */
  public playLanternToggle(turnedOn: boolean): void {
    const ready = this.getReadyNodes();
    if (!ready || !this.pinkNoiseBuffer) return;
    const { ctx, out } = ready;
    const now = ctx.currentTime;

    const clickOsc = ctx.createOscillator();
    clickOsc.type = 'triangle';
    clickOsc.frequency.setValueAtTime(turnedOn ? 1550 : 1050, now);
    clickOsc.frequency.exponentialRampToValueAtTime(turnedOn ? 520 : 340, now + 0.028);

    const clickGain = ctx.createGain();
    clickGain.gain.setValueAtTime(0.11, now);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.032);

    clickOsc.connect(clickGain);
    clickGain.connect(out);
    clickOsc.start(now);
    clickOsc.stop(now + 0.035);

    const hissSrc = ctx.createBufferSource();
    hissSrc.buffer = this.pinkNoiseBuffer;

    const hissFilter = ctx.createBiquadFilter();
    hissFilter.type = 'bandpass';
    hissFilter.Q.value = 1.8;
    if (turnedOn) {
      hissFilter.frequency.setValueAtTime(850, now + 0.015);
      hissFilter.frequency.exponentialRampToValueAtTime(2400, now + 0.11);
      hissFilter.frequency.exponentialRampToValueAtTime(1100, now + 0.22);
    } else {
      hissFilter.frequency.setValueAtTime(1600, now + 0.01);
      hissFilter.frequency.exponentialRampToValueAtTime(380, now + 0.13);
    }

    const hissGain = ctx.createGain();
    const dur = turnedOn ? 0.22 : 0.13;
    hissGain.gain.setValueAtTime(0.0001, now + 0.01);
    hissGain.gain.linearRampToValueAtTime(turnedOn ? 0.12 : 0.085, now + 0.045);
    hissGain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    hissSrc.connect(hissFilter);
    hissFilter.connect(hissGain);
    hissGain.connect(out);
    hissSrc.start(now + 0.01, Math.random(), dur);
  }

  /** Fast filtered-noise blade swish on melee attack */
  public playSlash(): void {
    const ready = this.getReadyNodes();
    if (!ready || !this.whiteNoiseBuffer) return;
    const { ctx, out } = ready;
    const now = ctx.currentTime;

    const src = ctx.createBufferSource();
    src.buffer = this.whiteNoiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 2.6;
    filter.frequency.setValueAtTime(2600 + Math.random() * 400, now);
    filter.frequency.exponentialRampToValueAtTime(480, now + 0.15);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(out);
    src.start(now, Math.random(), 0.17);
  }

  /** Airy sweeping whoosh when dashing / dodging (RMB) */
  public playDash(): void {
    const ready = this.getReadyNodes();
    if (!ready || !this.pinkNoiseBuffer) return;
    const { ctx, out } = ready;
    const now = ctx.currentTime;

    const src = ctx.createBufferSource();
    src.buffer = this.pinkNoiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 1.6;
    filter.frequency.setValueAtTime(420, now);
    filter.frequency.exponentialRampToValueAtTime(1450, now + 0.06);
    filter.frequency.exponentialRampToValueAtTime(300, now + 0.2);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.21);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(out);
    src.start(now, Math.random(), 0.22);
  }

  /** Deep rumbling warning when a miniboss telegraphs a special attack */
  public playBossTelegraph(): void {
    const ready = this.getReadyNodes();
    if (!ready || !this.pinkNoiseBuffer) return;
    const { ctx, out } = ready;
    const now = ctx.currentTime;

    // 1. Sub-bass ominous drop
    const sub = ctx.createOscillator();
    sub.type = 'sawtooth';
    sub.frequency.setValueAtTime(98, now);
    sub.frequency.exponentialRampToValueAtTime(38, now + 0.55);

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(260, now);
    lp.frequency.exponentialRampToValueAtTime(90, now + 0.55);

    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.0001, now);
    subGain.gain.linearRampToValueAtTime(0.26, now + 0.05);
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.58);

    sub.connect(lp);
    lp.connect(subGain);
    subGain.connect(out);
    sub.start(now);
    sub.stop(now + 0.6);

    // 2. Low rumble noise swell
    const noise = ctx.createBufferSource();
    noise.buffer = this.pinkNoiseBuffer;
    const nFilter = ctx.createBiquadFilter();
    nFilter.type = 'lowpass';
    nFilter.frequency.value = 180;

    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.0001, now);
    nGain.gain.linearRampToValueAtTime(0.18, now + 0.08);
    nGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

    noise.connect(nFilter);
    nFilter.connect(nGain);
    nGain.connect(out);
    noise.start(now, Math.random(), 0.58);
  }

  /** Metallic/dull weapon impact + skeleton bone rattle or ghoul screech */
  public playHit(enemyKind: EnemyKind, killed: boolean): void {
    const ready = this.getReadyNodes();
    if (!ready || !this.whiteNoiseBuffer) return;
    const { ctx, out } = ready;
    const now = ctx.currentTime;

    const thump = ctx.createOscillator();
    thump.type = 'triangle';
    thump.frequency.setValueAtTime(165, now);
    thump.frequency.exponentialRampToValueAtTime(48, now + 0.095);

    const thumpGain = ctx.createGain();
    thumpGain.gain.setValueAtTime(0.24, now);
    thumpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);

    thump.connect(thumpGain);
    thumpGain.connect(out);
    thump.start(now);
    thump.stop(now + 0.11);

    const clang = ctx.createOscillator();
    clang.type = 'square';
    clang.frequency.setValueAtTime(980 + Math.random() * 180, now);
    clang.frequency.exponentialRampToValueAtTime(420, now + 0.06);

    const clangFilter = ctx.createBiquadFilter();
    clangFilter.type = 'bandpass';
    clangFilter.frequency.value = 1350;
    clangFilter.Q.value = 4.0;

    const clangGain = ctx.createGain();
    clangGain.gain.setValueAtTime(0.08, now);
    clangGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);

    clang.connect(clangFilter);
    clangFilter.connect(clangGain);
    clangGain.connect(out);
    clang.start(now);
    clang.stop(now + 0.075);

    if (enemyKind === 'skeleton') {
      const clacks = killed ? 5 : 3;
      for (let i = 0; i < clacks; i++) {
        const t = now + 0.02 + i * (0.032 + Math.random() * 0.018);
        const boneSrc = ctx.createBufferSource();
        boneSrc.buffer = this.whiteNoiseBuffer;

        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 1700 + Math.random() * 1100;
        bp.Q.value = 6.5;

        const g = ctx.createGain();
        g.gain.setValueAtTime(0.14 * (1 - i * 0.14), t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.032);

        boneSrc.connect(bp);
        bp.connect(g);
        g.connect(out);
        boneSrc.start(t, Math.random(), 0.036);
      }
    } else {
      const screech = ctx.createOscillator();
      screech.type = 'sawtooth';
      const startFreq = killed ? 420 : 330;
      const endFreq = killed ? 125 : 200;
      const dur = killed ? 0.26 : 0.14;
      screech.frequency.setValueAtTime(startFreq, now + 0.01);
      screech.frequency.exponentialRampToValueAtTime(endFreq, now + dur);

      const raspLfo = ctx.createOscillator();
      const raspGain = ctx.createGain();
      raspLfo.frequency.value = 44;
      raspGain.gain.value = 48;
      raspLfo.connect(raspGain);
      raspGain.connect(screech.frequency);

      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 880;
      bp.Q.value = 2.4;

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, now + 0.01);
      g.gain.linearRampToValueAtTime(0.12, now + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, now + dur);

      screech.connect(bp);
      bp.connect(g);
      g.connect(out);
      screech.start(now + 0.01);
      raspLfo.start(now + 0.01);
      screech.stop(now + dur + 0.02);
      raspLfo.stop(now + dur + 0.02);
    }
  }

  /** Enemy attack snarl (Ghoul) or dry bone cleave (Skeleton) */
  public playEnemyAttack(enemyKind: EnemyKind): void {
    const ready = this.getReadyNodes();
    if (!ready || !this.pinkNoiseBuffer) return;
    const { ctx, out } = ready;
    const now = ctx.currentTime;

    if (enemyKind === 'ghoul') {
      const growl = ctx.createOscillator();
      growl.type = 'sawtooth';
      growl.frequency.setValueAtTime(240, now);
      growl.frequency.exponentialRampToValueAtTime(115, now + 0.18);

      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 620;
      bp.Q.value = 2.5;

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(0.11, now + 0.025);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.19);

      growl.connect(bp);
      bp.connect(g);
      g.connect(out);
      growl.start(now);
      growl.stop(now + 0.2);
    } else {
      const src = ctx.createBufferSource();
      src.buffer = this.pinkNoiseBuffer;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(1400, now);
      bp.frequency.exponentialRampToValueAtTime(340, now + 0.16);
      bp.Q.value = 2.0;

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(0.14, now + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.17);

      src.connect(bp);
      bp.connect(g);
      g.connect(out);
      src.start(now, Math.random(), 0.18);
    }
  }

  /** Low heavy thud when the player takes damage */
  public playPlayerHurt(): void {
    const ready = this.getReadyNodes();
    if (!ready) return;
    const { ctx, out } = ready;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(36, now + 0.18);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.28, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);

    osc.connect(g);
    g.connect(out);
    osc.start(now);
    osc.stop(now + 0.21);
  }

  /** Subtle dark-fantasy metallic chime when collecting dropped loot */
  public playLootPickup(): void {
    const ready = this.getReadyNodes();
    if (!ready) return;
    const { ctx, out } = ready;
    const now = ctx.currentTime;

    const notes = [523.25, 659.25];
    notes.forEach((freq, idx) => {
      const t = now + idx * 0.065;
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.085, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);

      osc.connect(g);
      g.connect(out);
      osc.start(t);
      osc.stop(t + 0.17);
    });
  }

  /** Crisp parchment rustle when opening a scroll, journal, quest board, or traveler dialog */
  public playParchmentRustle(): void {
    const ready = this.getReadyNodes();
    if (!ready || !this.pinkNoiseBuffer) return;
    const { ctx, out } = ready;
    const now = ctx.currentTime;

    const bursts = [
      { delay: 0, freq: 2100, dur: 0.09, peak: 0.095 },
      { delay: 0.065, freq: 2700, dur: 0.11, peak: 0.075 },
    ];
    for (const b of bursts) {
      const t = now + b.delay;
      const src = ctx.createBufferSource();
      src.buffer = this.pinkNoiseBuffer;
      src.playbackRate.value = 1.15 + Math.random() * 0.2;

      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(b.freq, t);
      bp.frequency.exponentialRampToValueAtTime(b.freq * 0.72, t + b.dur);
      bp.Q.value = 2.1;

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(b.peak, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + b.dur);

      src.connect(bp);
      bp.connect(g);
      g.connect(out);
      src.start(t, Math.random(), b.dur + 0.02);
    }
  }

  /** Retro minimalist UI sounds for Map (M), Inventory (I), selection, potions & gear */
  public playUiClick(kind: UiSoundKind = 'open'): void {
    const ready = this.getReadyNodes();
    if (!ready) return;
    const { ctx, out } = ready;
    const now = ctx.currentTime;

    if (kind === 'potion') {
      const freqs = [
        [270, 460],
        [330, 560],
      ];
      freqs.forEach(([f0, f1], idx) => {
        const t = now + idx * 0.08;
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f0, t);
        osc.frequency.exponentialRampToValueAtTime(f1, t + 0.07);

        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.11, t + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.085);

        osc.connect(g);
        g.connect(out);
        osc.start(t);
        osc.stop(t + 0.09);
      });
      return;
    }

    const osc = ctx.createOscillator();
    osc.type = kind === 'equip' ? 'square' : 'triangle';

    if (kind === 'open') {
      osc.frequency.setValueAtTime(360, now);
      osc.frequency.exponentialRampToValueAtTime(520, now + 0.045);
    } else if (kind === 'close') {
      osc.frequency.setValueAtTime(460, now);
      osc.frequency.exponentialRampToValueAtTime(280, now + 0.045);
    } else if (kind === 'equip') {
      osc.frequency.setValueAtTime(760, now);
      osc.frequency.exponentialRampToValueAtTime(340, now + 0.055);
    } else {
      osc.frequency.setValueAtTime(580, now);
      osc.frequency.exponentialRampToValueAtTime(480, now + 0.025);
    }

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1800;

    const g = ctx.createGain();
    const dur = kind === 'select' ? 0.03 : 0.06;
    g.gain.setValueAtTime(kind === 'select' ? 0.045 : 0.075, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    osc.connect(filter);
    filter.connect(g);
    g.connect(out);
    osc.start(now);
    osc.stop(now + dur + 0.01);
  }

  /** Solemn two-note parchment / horn tone when accepting a quest or collecting a relic */
  public playQuestAccept(): void {
    const ready = this.getReadyNodes();
    if (!ready) return;
    const { ctx, out } = ready;
    const now = ctx.currentTime;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    filter.connect(out);

    const notes = [110, 164.81];
    notes.forEach((freq, idx) => {
      const t = now + idx * 0.14;
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.14, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);

      osc.connect(g);
      g.connect(filter);
      osc.start(t);
      osc.stop(t + 0.36);
    });
  }

  /** Deep dark-fantasy D-minor chord + resonant cathedral bell toll on quest completion */
  public playQuestComplete(): void {
    const ready = this.getReadyNodes();
    if (!ready) return;
    const { ctx, out } = ready;
    const now = ctx.currentTime;

    const chordFilter = ctx.createBiquadFilter();
    chordFilter.type = 'lowpass';
    chordFilter.frequency.value = 1100;
    chordFilter.connect(out);

    const chordFreqs = [73.42, 110.0, 174.61, 293.66];
    chordFreqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      osc.type = idx < 2 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, now);

      const g = ctx.createGain();
      const peak = idx === 0 ? 0.14 : idx === 1 ? 0.11 : 0.085;
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(peak, now + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);

      osc.connect(g);
      g.connect(chordFilter);
      osc.start(now);
      osc.stop(now + 2.25);
    });

    const bellPartials = [
      { freq: 587.3, peak: 0.075, dur: 1.6 },
      { freq: 809.0, peak: 0.045, dur: 1.25 },
    ];
    bellPartials.forEach((partial) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(partial.freq, now + 0.02);

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, now + 0.02);
      g.gain.linearRampToValueAtTime(partial.peak, now + 0.035);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.02 + partial.dur);

      osc.connect(g);
      g.connect(out);
      osc.start(now + 0.02);
      osc.stop(now + 0.05 + partial.dur);
    });
  }

  public dispose(): void {
    if (this.activeVoice) {
      this.disposeVoice(this.activeVoice);
      this.activeVoice = null;
    }
    for (const v of this.fadingVoices) {
      this.disposeVoice(v);
    }
    this.fadingVoices = [];

    if (this.ctx) {
      void this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}
