interface EmberParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  char: string;
  phase: number;
}

interface AshParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  char: string;
}

const EMBER_CHARS = ['·', '˙', "'", '*'] as const;
const ASH_CHARS = ['·', '.', ',', '-'] as const;
const FLAME_CHARS = ['▲', ')', '(', '^', '*', '~'] as const;

function hash2D(x: number, y: number): number {
  let n = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

/**
 * Full-screen dark-fantasy ASCII background for the Title Screen:
 * a dying campfire/hearth in a ruined wasteland with rising embers and wind-blown ash.
 */
export class TitleBackground {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private cols = 0;
  private rows = 0;
  private readonly cellW = 10;
  private readonly cellH = 18;

  private embers: EmberParticle[] = [];
  private ash: AshParticle[] = [];
  private emberSpawnAccum = 0;
  private ashSpawnAccum = 0;
  private initialized = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Could not acquire 2D context for title background canvas');
    }
    this.ctx = context;
  }

  private ensureSize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(320, Math.floor(rect.width || window.innerWidth));
    const h = Math.max(240, Math.floor(rect.height || window.innerHeight));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    if (w !== this.width || h !== this.height || this.canvas.width !== Math.floor(w * dpr)) {
      this.width = w;
      this.height = h;
      this.canvas.width = Math.floor(w * dpr);
      this.canvas.height = Math.floor(h * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.cols = Math.max(40, Math.floor(w / this.cellW));
      this.rows = Math.max(20, Math.floor(h / this.cellH));

      if (!this.initialized) {
        this.seedInitialParticles();
        this.initialized = true;
      }
    }
  }

  private seedInitialParticles(): void {
    const fireCol = this.cols * 0.5;
    const fireRow = this.rows * 0.84;

    for (let i = 0; i < 18; i++) {
      const maxLife = 2.6 + Math.random() * 2.8;
      const life = Math.random() * maxLife;
      this.embers.push({
        x: fireCol + (Math.random() - 0.5) * 4,
        y: fireRow - life * 4.2,
        vx: (Math.random() - 0.5) * 0.8,
        vy: -(2.6 + Math.random() * 2.4),
        life,
        maxLife,
        char: EMBER_CHARS[Math.floor(Math.random() * EMBER_CHARS.length)],
        phase: Math.random() * Math.PI * 2,
      });
    }

    for (let i = 0; i < 16; i++) {
      const maxLife = 6 + Math.random() * 6;
      this.ash.push({
        x: Math.random() * this.cols,
        y: Math.random() * this.rows * 0.9,
        vx: 1.6 + Math.random() * 2.2,
        vy: 0.15 + Math.random() * 0.45,
        life: Math.random() * maxLife,
        maxLife,
        char: ASH_CHARS[Math.floor(Math.random() * ASH_CHARS.length)],
      });
    }
  }

  public updateAndRender(dt: number, elapsed: number): void {
    this.ensureSize();
    const clampedDt = Math.min(dt, 0.05);

    this.updateParticles(clampedDt);
    this.renderScene(elapsed);
  }

  private updateParticles(dt: number): void {
    const fireCol = this.cols * 0.5;
    const fireRow = Math.floor(this.rows * 0.84);

    // Spawn rising embers from the campfire
    this.emberSpawnAccum += dt * 5.2;
    while (this.emberSpawnAccum >= 1) {
      this.emberSpawnAccum -= 1;
      if (this.embers.length < 44) {
        this.embers.push({
          x: fireCol + (Math.random() - 0.5) * 3.4,
          y: fireRow - 0.6,
          vx: (Math.random() - 0.5) * 0.9,
          vy: -(2.4 + Math.random() * 2.6),
          life: 0,
          maxLife: 2.8 + Math.random() * 3.0,
          char: EMBER_CHARS[Math.floor(Math.random() * EMBER_CHARS.length)],
          phase: Math.random() * Math.PI * 2,
        });
      }
    }

    // Spawn occasional wind-blown ash across the wasteland
    this.ashSpawnAccum += dt * 2.4;
    while (this.ashSpawnAccum >= 1) {
      this.ashSpawnAccum -= 1;
      if (this.ash.length < 32) {
        this.ash.push({
          x: -1,
          y: Math.random() * (this.rows * 0.88),
          vx: 1.8 + Math.random() * 2.6,
          vy: 0.1 + Math.random() * 0.45,
          life: 0,
          maxLife: 8 + Math.random() * 7,
          char: ASH_CHARS[Math.floor(Math.random() * ASH_CHARS.length)],
        });
      }
    }

    for (let i = this.embers.length - 1; i >= 0; i--) {
      const e = this.embers[i];
      e.life += dt;
      e.x += (e.vx + Math.sin(e.life * 2.4 + e.phase) * 0.7) * dt;
      e.y += e.vy * dt;
      if (e.life >= e.maxLife || e.y < 0) {
        this.embers.splice(i, 1);
      }
    }

    for (let i = this.ash.length - 1; i >= 0; i--) {
      const a = this.ash[i];
      a.life += dt;
      a.x += a.vx * dt;
      a.y += (a.vy + Math.sin(a.life * 1.4 + a.x * 0.15) * 0.25) * dt;
      if (a.life >= a.maxLife || a.x > this.cols + 2 || a.y > this.rows) {
        this.ash.splice(i, 1);
      }
    }
  }

  private renderScene(elapsed: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#070709';
    ctx.fillRect(0, 0, this.width, this.height);

    const fireCol = Math.floor(this.cols * 0.5);
    const fireRow = Math.floor(this.rows * 0.84);
    const horizonRow = Math.floor(this.rows * 0.78);

    // Subtle warm radial glow behind the campfire
    const firePxX = (fireCol + 0.5) * this.cellW;
    const firePxY = (fireRow - 0.5) * this.cellH;
    const pulse = 1 + Math.sin(elapsed * 4.2) * 0.06 + Math.sin(elapsed * 9.7) * 0.03;
    const glowRadius = Math.max(180, this.width * 0.22) * pulse;
    const grad = ctx.createRadialGradient(firePxX, firePxY, 6, firePxX, firePxY, glowRadius);
    grad.addColorStop(0, 'rgba(234, 88, 12, 0.18)');
    grad.addColorStop(0.35, 'rgba(180, 83, 9, 0.08)');
    grad.addColorStop(1, 'rgba(7, 7, 9, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.font = `14px 'JetBrains Mono', 'Cascadia Mono', 'Fira Code', 'Consolas', monospace`;
    ctx.textBaseline = 'top';

    // 1. Distant ruined silhouettes & ashen wasteland ground
    for (let r = horizonRow - 4; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const distToFire = Math.hypot((c - fireCol) * 0.7, r - fireRow);
        if (distToFire < 4.5 && r >= fireRow - 2 && r <= fireRow + 1) continue;

        const h = hash2D(c, r);

        // Distant dead trees / broken pillars on the horizon
        if (r < horizonRow) {
          const colHash = hash2D(c, 991);
          if (colHash > 0.945 && Math.abs(c - fireCol) > 14) {
            const pillarHeight = colHash > 0.975 ? 3 : 2;
            if (r >= horizonRow - pillarHeight) {
              ctx.fillStyle = '#17181e';
              const ch = r === horizonRow - pillarHeight ? (colHash > 0.965 ? 'Y' : '^') : '|';
              ctx.fillText(ch, c * this.cellW, r * this.cellH);
            }
          }
          continue;
        }

        // Horizon line
        if (r === horizonRow) {
          if (h > 0.35) {
            ctx.fillStyle = distToFire < 18 ? '#3b281c' : '#181920';
            ctx.fillText(h > 0.72 ? '~' : '_', c * this.cellW, r * this.cellH);
          }
          continue;
        }

        // Sparse ash & rubble on ground
        if (h > 0.78) {
          const ch = h > 0.95 ? ',' : h > 0.88 ? '.' : '_';
          if (distToFire < 14) {
            const warmth = Math.max(0, 1 - distToFire / 14);
            ctx.fillStyle = warmth > 0.55 ? '#6b3e22' : '#3a271b';
          } else {
            ctx.fillStyle = '#1c1d24';
          }
          ctx.fillText(ch, c * this.cellW, r * this.cellH);
        }
      }
    }

    // 2. Campfire / dying hearth at bottom-center
    this.renderCampfire(ctx, fireCol, fireRow, elapsed);

    // 3. Wind-blown ash specks
    for (const a of this.ash) {
      const t = a.life / a.maxLife;
      const alpha = Math.sin(Math.min(1, t) * Math.PI) * 0.45;
      if (alpha <= 0.02) continue;
      ctx.fillStyle = `rgba(118, 122, 134, ${alpha.toFixed(2)})`;
      ctx.fillText(a.char, Math.round(a.x) * this.cellW, Math.round(a.y) * this.cellH);
    }

    // 4. Rising glowing embers
    for (const e of this.embers) {
      const t = e.life / e.maxLife;
      const flicker = 0.75 + 0.25 * Math.sin(elapsed * 9 + e.phase);
      const alpha = Math.max(0, (1 - t) * flicker);
      if (alpha <= 0.03) continue;

      if (t < 0.28) {
        ctx.fillStyle = `rgba(251, 191, 36, ${alpha.toFixed(2)})`;
      } else if (t < 0.62) {
        ctx.fillStyle = `rgba(245, 158, 11, ${alpha.toFixed(2)})`;
      } else {
        ctx.fillStyle = `rgba(234, 88, 12, ${(alpha * 0.85).toFixed(2)})`;
      }
      ctx.fillText(e.char, Math.round(e.x) * this.cellW, Math.round(e.y) * this.cellH);
    }
  }

  private renderCampfire(
    ctx: CanvasRenderingContext2D,
    fireCol: number,
    fireRow: number,
    elapsed: number
  ): void {
    const f1 = Math.floor(elapsed * 6.5) % FLAME_CHARS.length;
    const f2 = Math.floor(elapsed * 8.2 + 2) % FLAME_CHARS.length;
    const f3 = Math.floor(elapsed * 5.3 + 4) % FLAME_CHARS.length;

    // Stone ring & charred logs
    const baseParts: { dx: number; dy: number; ch: string; color: string }[] = [
      { dx: -3, dy: 1, ch: '(', color: '#3b3532' },
      { dx: -2, dy: 1, ch: '=', color: '#574336' },
      { dx: -1, dy: 1, ch: '#', color: '#7c2d12' },
      { dx: 0, dy: 1, ch: '=', color: '#9a3412' },
      { dx: 1, dy: 1, ch: '#', color: '#7c2d12' },
      { dx: 2, dy: 1, ch: '=', color: '#574336' },
      { dx: 3, dy: 1, ch: ')', color: '#3b3532' },
      // Inner coals & lower flames
      { dx: -1, dy: 0, ch: '(', color: '#ea580c' },
      { dx: 0, dy: 0, ch: '▲', color: '#fbbf24' },
      { dx: 1, dy: 0, ch: ')', color: '#ea580c' },
      // Mid flame tongue
      { dx: -1, dy: -1, ch: f2 % 2 === 0 ? '(' : '·', color: '#f59e0b' },
      { dx: 0, dy: -1, ch: FLAME_CHARS[f1], color: '#f59e0b' },
      { dx: 1, dy: -1, ch: f3 % 2 === 0 ? ')' : '˙', color: '#ea580c' },
      // Tip of flame
      { dx: 0, dy: -2, ch: f1 % 2 === 0 ? '^' : "'", color: '#ea580c' },
    ];

    for (const p of baseParts) {
      ctx.fillStyle = p.color;
      ctx.fillText(p.ch, (fireCol + p.dx) * this.cellW, (fireRow + p.dy) * this.cellH);
    }
  }
}
