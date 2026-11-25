import type { WeatherKind } from './types';

export interface RainDrop {
  x: number;
  y: number;
  speed: number;
  glyph: '/' | '|' | "'";
  shade: number;
}

export interface RainSplash {
  x: number;
  y: number;
  age: number;
  duration: number;
  glyph: ',' | '·';
}

export interface FogWisp {
  x: number;
  y: number;
  speedX: number;
  speedY: number;
  glyph: '~' | '░' | '·';
  size: number;
  phase: number;
}

export interface AmbientLightProfile {
  /** Ambient daylight fill inside LOS [0 = deep night, 0.42 = overcast, 1.0 = bright sunny day] */
  ambientStrength: number;
  /** Effective golden sunlight strength during daytime [0..1] */
  sunlight: number;
  /** 0 = full day, 1 = deep blue-black night */
  nightFactor: number;
  /** Smoothly interpolated environmental tint RGB */
  tintR: number;
  tintG: number;
  tintB: number;
  /** Canvas background color */
  bgColor: string;
  /** Explored out-of-LOS shadow/memory colors */
  memoryStructColor: string;
  memoryGroundColor: string;
  memoryCanopyColor: string;
  /** Fog/weather visibility multiplier [0.48..1.0] */
  sightMultiplier: number;
  /** Screen-edge dark vignette opacity [0.0 during bright sun .. 0.78 at deep night] */
  vignetteOpacity: number;
}

const WEATHER_LABELS: Record<WeatherKind, string> = {
  sunny: 'Jasno',
  overcast: 'Šero',
  fog: 'Mlha',
  rain: 'Déšť',
  storm: 'Déšť a mlha',
};

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** Normalizes legacy save weather values (e.g., 'clear' -> 'sunny') */
export function normalizeWeatherKind(raw: string | undefined): WeatherKind {
  if (raw === 'overcast' || raw === 'fog' || raw === 'rain' || raw === 'storm') {
    return raw;
  }
  return 'sunny';
}

export class EnvironmentSystem {
  /** Continuous normalized clock [0, 1): 0.0 = midnight, 0.25 = dawn, 0.5 = midday, 0.75 = dusk */
  public timeOfDay = 0.44;
  /** Full 24h cycle length in real-time seconds (slowed by 50% -> 6 min per 24h) */
  public readonly dayLengthSeconds = 360;

  /** Default daytime weather on New Game: bright sunny day ('sunny') */
  public targetWeather: WeatherKind = 'sunny';
  public sunIntensity = 1;
  public overcastIntensity = 0;
  public rainIntensity = 0;
  public fogIntensity = 0;

  public readonly rainDrops: RainDrop[] = [];
  public readonly rainSplashes: RainSplash[] = [];
  public readonly fogWisps: FogWisp[] = [];

  private weatherTimer = 28;
  private splashAccumulator = 0;

  constructor() {
    this.initParticles();
  }

  /** Immediately aligns intensities when restoring a saved game */
  public snapWeatherToTarget(): void {
    this.sunIntensity = this.targetWeather === 'sunny' ? 1 : 0;
    this.overcastIntensity = this.targetWeather === 'overcast' ? 1 : 0;
    this.rainIntensity = this.targetWeather === 'rain' || this.targetWeather === 'storm' ? 1 : 0;
    this.fogIntensity = this.targetWeather === 'fog' || this.targetWeather === 'storm' ? 1 : 0;
  }

  private initParticles(): void {
    for (let i = 0; i < 84; i++) {
      const r = Math.random();
      this.rainDrops.push({
        x: Math.random(),
        y: Math.random(),
        speed: 1.05 + Math.random() * 0.65,
        glyph: r < 0.56 ? '/' : r < 0.82 ? '|' : "'",
        shade: Math.random(),
      });
    }

    const fogGlyphs: readonly ('~' | '░' | '·')[] = ['~', '░', '·'];
    for (let i = 0; i < 72; i++) {
      this.fogWisps.push({
        x: Math.random(),
        y: Math.random(),
        speedX: 0.008 + Math.random() * 0.014,
        speedY: (Math.random() - 0.5) * 0.005,
        glyph: fogGlyphs[i % fogGlyphs.length],
        size: 1 + Math.floor(Math.random() * 2),
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  public update(dt: number, zoneName: string): void {
    // 1. Advance smooth Day/Night clock
    this.timeOfDay = (this.timeOfDay + dt / this.dayLengthSeconds) % 1;

    // 2. Random dynamic weather scheduler
    this.weatherTimer -= dt;
    if (this.weatherTimer <= 0) {
      this.rollRandomWeather(zoneName);
      this.weatherTimer = 26 + Math.random() * 24;
    }

    // 3. Smooth multi-second transitions (~3 seconds) between Sunny, Overcast, Fog & Rain
    const wantSun = this.targetWeather === 'sunny' ? 1 : 0;
    const wantOvercast = this.targetWeather === 'overcast' ? 1 : 0;
    const wantRain = this.targetWeather === 'rain' || this.targetWeather === 'storm' ? 1 : 0;
    const wantFog = this.targetWeather === 'fog' || this.targetWeather === 'storm' ? 1 : 0;

    // Only keep marsh/blood-forest ambient mist when NOT in bright sunny weather (sun clears the fog!)
    const marshMistBonus =
      (zoneName === 'Mrtvá bažina' || zoneName === 'Prokletý krvavý les') &&
      this.targetWeather !== 'sunny'
        ? 0.35
        : 0;
    const targetFog = Math.min(1, Math.max(wantFog, marshMistBonus));

    const fadeRate = 0.34 * dt; // ~2.9 seconds for a full smooth atmospheric crossfade
    this.sunIntensity += Math.max(-fadeRate, Math.min(fadeRate, wantSun - this.sunIntensity));
    this.overcastIntensity += Math.max(
      -fadeRate,
      Math.min(fadeRate, wantOvercast - this.overcastIntensity)
    );
    this.rainIntensity += Math.max(-fadeRate, Math.min(fadeRate, wantRain - this.rainIntensity));
    this.fogIntensity += Math.max(-fadeRate, Math.min(fadeRate, targetFog - this.fogIntensity));

    // 4. Update falling ASCII raindrops & tiny ground splashes
    if (this.rainIntensity > 0.02) {
      const activeCount = Math.floor(this.rainDrops.length * this.rainIntensity);
      for (let i = 0; i < activeCount; i++) {
        const drop = this.rainDrops[i];
        drop.x -= drop.speed * 0.34 * dt;
        drop.y += drop.speed * dt;

        if (drop.y > 1.02) {
          drop.y = -0.02 - Math.random() * 0.08;
          drop.x = Math.random() * 1.25;
        }
        if (drop.x < -0.05) {
          drop.x += 1.15;
        }
      }

      this.splashAccumulator += dt * (24 * this.rainIntensity);
      while (this.splashAccumulator >= 1) {
        this.splashAccumulator -= 1;
        if (this.rainSplashes.length < 24) {
          this.rainSplashes.push({
            x: Math.random(),
            y: Math.random(),
            age: 0,
            duration: 0.14 + Math.random() * 0.12,
            glyph: Math.random() < 0.55 ? ',' : '·',
          });
        }
      }
    }

    for (let i = this.rainSplashes.length - 1; i >= 0; i--) {
      this.rainSplashes[i].age += dt;
      if (this.rainSplashes[i].age >= this.rainSplashes[i].duration) {
        this.rainSplashes.splice(i, 1);
      }
    }

    // 5. Update creeping fog wisps (for both fog and overcast)
    if (this.fogIntensity > 0.02 || this.overcastIntensity > 0.02) {
      for (let i = 0; i < this.fogWisps.length; i++) {
        const wisp = this.fogWisps[i];
        wisp.x += wisp.speedX * dt;
        wisp.y += wisp.speedY * dt;
        if (wisp.x > 1.05) wisp.x = -0.05;
        if (wisp.y < -0.05) wisp.y = 1.05;
        if (wisp.y > 1.05) wisp.y = -0.05;
      }
    }
  }

  private rollRandomWeather(zoneName: string): void {
    const r = Math.random();
    const gloomyZone =
      zoneName === 'Mrtvá bažina' ||
      zoneName === 'Prokletý krvavý les' ||
      zoneName === 'Popelavá pustina';

    if (gloomyZone) {
      // Even gloomier regions still get occasional bright sunbreaks
      if (r < 0.26) this.targetWeather = 'sunny';
      else if (r < 0.5) this.targetWeather = 'overcast';
      else if (r < 0.74) this.targetWeather = 'fog';
      else if (r < 0.9) this.targetWeather = 'rain';
      else this.targetWeather = 'storm';
    } else {
      // Healthy 42% chance for bright sunny weather across the realm
      if (r < 0.42) this.targetWeather = 'sunny';
      else if (r < 0.66) this.targetWeather = 'overcast';
      else if (r < 0.82) this.targetWeather = 'rain';
      else if (r < 0.94) this.targetWeather = 'fog';
      else this.targetWeather = 'storm';
    }
  }

  /** Cycles time of day across 4 distinct moods (Day -> Dusk -> Deep Night -> Dawn) */
  public cycleTimeOfDay(): string {
    if (this.timeOfDay >= 0.32 && this.timeOfDay < 0.68) {
      this.timeOfDay = 0.76; // Soumrak
    } else if (this.timeOfDay >= 0.68 && this.timeOfDay < 0.88) {
      this.timeOfDay = 0.02; // Temná noc
    } else if (this.timeOfDay >= 0.88 || this.timeOfDay < 0.2) {
      this.timeOfDay = 0.26; // Úsvit
    } else {
      this.timeOfDay = 0.48; // Den
    }
    return `${this.getClockText()} (${this.getPhaseLabel()})`;
  }

  /** Smoothly transitions to the next weather state over ~3 seconds */
  public cycleWeather(): string {
    const order: WeatherKind[] = ['sunny', 'overcast', 'fog', 'rain', 'storm'];
    const idx = order.indexOf(this.targetWeather);
    this.targetWeather = order[(idx + 1) % order.length];
    this.weatherTimer = 36;
    return this.getWeatherLabel();
  }

  public getClockText(): string {
    const totalMinutes = Math.floor(this.timeOfDay * 24 * 60);
    const hours = Math.floor(totalMinutes / 60) % 24;
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  public getPhaseLabel(): string {
    const t = this.timeOfDay;
    if (t >= 0.22 && t < 0.34) return 'Úsvit';
    if (t >= 0.34 && t < 0.7) {
      return this.sunIntensity > 0.5 ? 'Slunečný den' : 'Den';
    }
    if (t >= 0.7 && t < 0.84) return 'Soumrak';
    return 'Temná noc';
  }

  public getWeatherLabel(): string {
    return WEATHER_LABELS[this.targetWeather];
  }

  /**
   * Computes current smooth ambient profile:
   * - Sunny Day: 100% full-screen brightness, warm golden/amber tint, 0 vignette, 0 fog.
   * - Overcast / Rain / Fog: noticeably gloomier cool grey/slate sky & tighter sight.
   * - Night: deep blue-black darkness pierced only by lantern & braziers.
   */
  public getAmbientProfile(): AmbientLightProfile {
    const sunWave = 0.5 - 0.5 * Math.cos(this.timeOfDay * Math.PI * 2); // 0 midnight, 1 noon
    const daylight = clamp01((sunWave - 0.14) / 0.74);
    const nightFactor = 1 - daylight;

    // Effective golden sunlight [0..1] only shines during daytime when clear/sunny
    const sunlight = daylight * this.sunIntensity;

    // Ambient daylight brightness:
    // - Bright sunny day -> full 1.00 (100% crisp colors across visible screen!)
    // - Overcast / Dawn day -> 0.56 so weather mood shifts clearly
    // - Rain / Fog day -> moodier 0.38..0.46
    // - Night -> 0.00
    const gloomyBase = 0.56 * (1 - this.rainIntensity * 0.25 - this.fogIntensity * 0.18);
    const ambientStrength = clamp01(daylight * lerp(gloomyBase, 1.0, this.sunIntensity));

    // Environmental RGB tint:
    // - Sunny Day: pale atmospheric ash-sunlight (236, 232, 224)
    // - Overcast/Storm Day: crisp cool slate (168, 180, 196)
    // - Deep Night: dark blue-black (44, 62, 114)
    const dayR = lerp(168, 236, this.sunIntensity);
    const dayG = lerp(180, 232, this.sunIntensity);
    const dayB = lerp(196, 224, this.sunIntensity);

    const tintR = Math.round(lerp(dayR, 44, nightFactor));
    const tintG = Math.round(lerp(dayG, 62, nightFactor));
    const tintB = Math.round(lerp(dayB, 114, nightFactor));

    // Canvas background: deep high-contrast obsidian in daytime so vivid ASCII glyphs pop,
    // shifting to deep blue-black at night.
    const bgR = Math.round(lerp(lerp(10, 11, this.sunIntensity), 6, nightFactor));
    const bgG = Math.round(lerp(lerp(11, 12, this.sunIntensity), 8, nightFactor));
    const bgB = Math.round(lerp(lerp(14, 12, this.sunIntensity), 16, nightFactor));

    // Explored out-of-LOS cast shadow / map memory colors
    const msR = Math.round(lerp(48, 34, nightFactor));
    const msG = Math.round(lerp(50, 39, nightFactor));
    const msB = Math.round(lerp(54, 54, nightFactor));

    const mgR = Math.round(lerp(28, 19, nightFactor));
    const mgG = Math.round(lerp(30, 22, nightFactor));
    const mgB = Math.round(lerp(33, 32, nightFactor));

    const mcR = Math.round(lerp(34, 24, nightFactor));
    const mcG = Math.round(lerp(37, 28, nightFactor));
    const mcB = Math.round(lerp(41, 38, nightFactor));

    // Visibility multiplier: 1.0 on clear/sunny, gently compressed by fog/rain
    const sightMultiplier = Math.max(0.5, 1 - this.fogIntensity * 0.42 - this.rainIntensity * 0.08);

    // Dark screen-edge vignette: completely OFF (0.0) during bright sunny day,
    // very light during overcast/dawn daytime (~0.18), deepening smoothly at dusk/night (~0.74)!
    const dayVignette = 0.16 + this.rainIntensity * 0.14 + this.fogIntensity * 0.12;
    const gloomyVignette = Math.min(0.76, lerp(dayVignette, 0.74, nightFactor));
    const vignetteOpacity = clamp01(gloomyVignette * (1 - sunlight));

    return {
      ambientStrength,
      sunlight,
      nightFactor,
      tintR,
      tintG,
      tintB,
      bgColor: `rgb(${bgR},${bgG},${bgB})`,
      memoryStructColor: `rgb(${msR},${msG},${msB})`,
      memoryGroundColor: `rgb(${mgR},${mgG},${mgB})`,
      memoryCanopyColor: `rgb(${mcR},${mcG},${mcB})`,
      sightMultiplier,
      vignetteOpacity,
    };
  }
}
