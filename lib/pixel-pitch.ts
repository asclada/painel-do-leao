// Campinho pixel art do topo: jogadores genéricos com o uniforme tricolor tocando bola, em Canvas 2D próprio (sem
// biblioteca, sem imagem de terceiros: os sprites são desenhados aqui, pixel a pixel). Carregado sob demanda pelo
// componente PixelPitch; roda a 30 quadros por segundo e para sozinho fora da tela e com a aba escondida.

// Camisa com listras horizontais azul, branca e vermelha (como o uniforme do Leão), calção azul, meião branco e
// chuteira preta. Sprites de 7 x 12; "." é transparente, "s" pele e "h" cabelo (variam por jogador).
const COLORS: Record<string, string> = { B: "#1d4ed8", W: "#ffffff", R: "#e11d2e", n: "#1e3a8a", k: "#f8fafc", b: "#111827" };
const SKINS = ["#f1c27d", "#c68642", "#8d5524", "#e0ac69", "#a86b3c", "#f5d0a9"];
const HAIRS = ["#1b1b1b", "#3b2412", "#6b4423", "#1b1b1b", "#2b1a0e", "#c9a15a"];
const TOP = ["..hhh..", "..sss..", "..sss..", ".BBBBB.", "sWWWWWs", ".RRRRR.", ".nnnnn.", ".nn.nn."];
const TOP_ARMS_UP = ["..hhh..", "s.sss.s", "s.sss.s", ".BBBBB.", ".WWWWW.", ".RRRRR.", ".nnnnn.", ".nn.nn."];
const LEGS = {
  stand: ["..s.s..", "..k.k..", "..k.k..", ".bb.bb."],
  run1: [".s...s.", ".k...k.", "k.....k", "b.....b"],
  run2: ["..s.s..", "..k.k..", "...kk..", "...bb.."],
  kick: ["..s.s..", "..k..kk", "..k...b", ".bb...."],
};
type Frame = keyof typeof LEGS | "jump";
type Sprites = Record<Frame, [HTMLCanvasElement, HTMLCanvasElement]>;

const SPRITE_H = 12;
const FPS = 30;

function makeSprite(rows: string[], skin: string, hair: string, flip: boolean) {
  const c = document.createElement("canvas");
  c.width = 7;
  c.height = rows.length;
  const g = c.getContext("2d")!;
  rows.forEach((row, y) => {
    const r = flip ? [...row].reverse() : [...row];
    r.forEach((ch, x) => {
      if (ch === ".") return;
      g.fillStyle = ch === "s" ? skin : ch === "h" ? hair : COLORS[ch];
      g.fillRect(x, y, 1, 1);
    });
  });
  return c;
}

function spritesFor(i: number): Sprites {
  const skin = SKINS[i % SKINS.length];
  const hair = HAIRS[i % HAIRS.length];
  const pair = (rows: string[]): [HTMLCanvasElement, HTMLCanvasElement] => [
    makeSprite(rows, skin, hair, false),
    makeSprite(rows, skin, hair, true),
  ];
  return {
    stand: pair([...TOP, ...LEGS.stand]),
    run1: pair([...TOP, ...LEGS.run1]),
    run2: pair([...TOP, ...LEGS.run2]),
    kick: pair([...TOP, ...LEGS.kick]),
    jump: pair([...TOP_ARMS_UP, ...LEGS.stand]),
  };
}

function drawPitch(W: number, H: number) {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  g.fillStyle = "#2e8b3e";
  g.fillRect(0, 0, W, H);
  g.fillStyle = "#28803a";
  for (let x = 0; x < W; x += 20) g.fillRect(x, 0, 10, H);
  g.fillStyle = "rgba(255,255,255,0.78)";
  const line = (x: number, y: number, w: number, h: number) => g.fillRect(x, y, w, h);
  line(1, 1, W - 2, 1);
  line(1, H - 2, W - 2, 1);
  line(1, 1, 1, H - 2);
  line(W - 2, 1, 1, H - 2);
  const cx = Math.floor(W / 2);
  const cy = Math.floor(H / 2);
  line(cx, 1, 1, H - 2);
  const r = Math.max(4, Math.min(9, cy - 4));
  for (let a = 0; a < 360; a += 3) {
    const t = (a * Math.PI) / 180;
    line(Math.round(cx + Math.cos(t) * r), Math.round(cy + Math.sin(t) * r), 1, 1);
  }
  const bh = Math.max(6, Math.floor(H * 0.3));
  const bw = Math.max(7, Math.floor(H * 0.3));
  line(1, cy - bh, bw, 1);
  line(1, cy + bh, bw, 1);
  line(bw, cy - bh, 1, 2 * bh + 1);
  line(W - 1 - bw, cy - bh, bw, 1);
  line(W - 1 - bw, cy + bh, bw, 1);
  line(W - 1 - bw, cy - bh, 1, 2 * bh + 1);
  // gols com rede
  const gh = Math.max(4, Math.floor(H * 0.16));
  for (const right of [false, true]) {
    const x0 = right ? W - 3 : 0;
    for (let y = cy - gh; y <= cy + gh; y++) {
      for (let x = 0; x < 3; x++) {
        g.fillStyle = (x + y) % 2 ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.12)";
        g.fillRect(x0 + x, y, 1, 1);
      }
    }
    g.fillStyle = "#ffffff";
    g.fillRect(right ? W - 3 : 2, cy - gh, 1, 2 * gh + 1);
  }
  return c;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

type Player = {
  x: number;
  y: number;
  z: number;
  tx: number;
  ty: number;
  speed: number;
  facing: 1 | -1;
  anim: number;
  kick: number;
  retarget: number;
  moving: boolean;
  sprites: Sprites;
};
type Flight = { to: Player | null; goal: boolean; x0: number; y0: number; tx: number; ty: number; t: number; dur: number; lob: number };

export class PixelPitchEngine {
  private canvas = document.createElement("canvas");
  private ctx = this.canvas.getContext("2d")!;
  private W = 0;
  private H = 0;
  private minY = 12;
  private maxY = 20;
  private pitch: HTMLCanvasElement | null = null;
  private players: Player[] = [];
  private ball = { x: 0, y: 0, z: 0, holder: null as Player | null, flight: null as Flight | null };
  private holdLeft = 1;
  private passes = 0;
  private celebrate = 0;
  private confetti: { x: number; y: number; v: number; c: string }[] = [];
  private running = false;
  private paused = false;
  private onScreen = true;
  private raf = 0;
  private last = 0;
  private acc = 0;
  private resizeObs: ResizeObserver;
  private viewObs: IntersectionObserver;
  private onVisibility = () => this.sync();

  constructor(
    private host: HTMLElement,
    private opts: { scale: number; paused: boolean; celebrate: boolean },
  ) {
    this.paused = opts.paused;
    this.canvas.setAttribute("aria-hidden", "true");
    this.canvas.style.imageRendering = "pixelated";
    this.canvas.style.display = "block";
    host.prepend(this.canvas);
    this.resize();
    if (opts.celebrate) this.party();
    this.draw();
    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(host);
    this.viewObs = new IntersectionObserver(([e]) => {
      this.onScreen = e.isIntersecting;
      this.sync();
    });
    this.viewObs.observe(host);
    document.addEventListener("visibilitychange", this.onVisibility);
    this.sync();
  }

  setPaused(paused: boolean) {
    this.paused = paused;
    this.sync();
  }

  destroy() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.resizeObs.disconnect();
    this.viewObs.disconnect();
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.canvas.remove();
  }

  private resize() {
    const { scale } = this.opts;
    const W = Math.max(40, Math.floor(this.host.clientWidth / scale));
    const H = Math.max(20, Math.floor(this.host.clientHeight / scale));
    if (W === this.W && H === this.H) return;
    this.W = W;
    this.H = H;
    this.canvas.width = W;
    this.canvas.height = H;
    this.canvas.style.width = `${W * scale}px`;
    this.canvas.style.height = `${H * scale}px`;
    this.ctx.imageSmoothingEnabled = false;
    this.pitch = drawPitch(W, H);
    this.minY = SPRITE_H;
    this.maxY = H - 3;
    this.reset();
    this.draw();
  }

  private reset() {
    // mais jogadores quando o campo é largo (computador), de 4 a 6
    const n = Math.max(4, Math.min(6, Math.round(this.W / 60)));
    const offset = Math.floor(rand(0, SKINS.length));
    this.players = Array.from({ length: n }, (_, i) => ({
      x: ((i + 0.5) / n) * this.W,
      y: rand(this.minY, this.maxY),
      z: 0,
      tx: 0,
      ty: 0,
      speed: rand(12, 18),
      facing: i % 2 ? -1 : 1,
      anim: rand(0, 1),
      kick: 0,
      retarget: 0,
      moving: false,
      sprites: spritesFor(i + offset),
    }));
    this.players.forEach((p) => this.wander(p));
    const h = this.players[Math.floor(n / 2)];
    this.ball = { x: h.x, y: h.y, z: 0, holder: h, flight: null };
    this.holdLeft = rand(0.5, 1.1);
    this.passes = 0;
  }

  private clampX(x: number) {
    return Math.max(6, Math.min(this.W - 7, x));
  }

  private clampY(y: number) {
    return Math.max(this.minY, Math.min(this.maxY, y));
  }

  private wander(p: Player) {
    p.tx = this.clampX(p.x + rand(-40, 40));
    p.ty = this.clampY(p.y + rand(-8, 8));
    p.retarget = rand(1.5, 3.5);
  }

  /** Comemoração (depois de vitória do Leão): a turma pula e cai papel picado tricolor. */
  private party() {
    this.celebrate = 3.5;
    const cols = ["#e11d2e", "#ffffff", "#1d4ed8"];
    this.confetti = Array.from({ length: Math.floor(this.W / 3) }, () => ({
      x: rand(0, this.W),
      y: rand(-this.H, 0),
      v: rand(8, 18),
      c: cols[Math.floor(rand(0, 3))],
    }));
  }

  private step(dt: number) {
    const b = this.ball;
    if (this.celebrate > 0) {
      this.celebrate -= dt;
      for (const p of this.players) {
        p.anim += dt;
        p.z = Math.abs(Math.sin(p.anim * 7)) * 4;
      }
      if (this.celebrate <= 0) this.kickOff();
    } else {
      for (const p of this.players) this.move(p, dt);
      if (b.holder) {
        const h = b.holder;
        b.x = h.x + h.facing * 3;
        b.y = h.y;
        b.z = 0;
        this.holdLeft -= dt;
        if (this.holdLeft <= 0) this.kick(h);
      } else if (b.flight) {
        const f = b.flight;
        f.t += dt;
        const k = Math.min(1, f.t / f.dur);
        b.x = f.x0 + (f.tx - f.x0) * k;
        b.y = f.y0 + (f.ty - f.y0) * k;
        b.z = Math.sin(Math.PI * k) * f.lob;
        if (k >= 1) {
          b.flight = null;
          if (f.goal || !f.to) {
            this.celebrate = 1.6; // gol: comemoração curta e saída de bola no meio
            this.passes = 0;
          } else {
            b.holder = f.to;
            f.to.facing = f.tx > f.x0 ? 1 : -1;
            this.holdLeft = rand(0.4, 1.2);
            this.passes++;
          }
        }
      }
    }
    if (this.confetti.length) {
      for (const c of this.confetti) {
        c.y += c.v * dt;
        c.x += Math.sin(c.y / 4) * 0.2;
      }
      this.confetti = this.confetti.filter((c) => c.y < this.H);
    }
  }

  private move(p: Player, dt: number) {
    const b = this.ball;
    const chasing = b.flight?.to === p;
    const tx = chasing ? b.flight!.tx : p.tx;
    const ty = chasing ? b.flight!.ty : p.ty;
    const dx = tx - p.x;
    const dy = ty - p.y;
    const d = Math.hypot(dx, dy);
    const sp = (chasing ? 26 : b.holder === p ? 9 : p.speed) * dt;
    if (d > 0.5) {
      p.x += (dx / d) * Math.min(sp, d);
      p.y += (dy / d) * Math.min(sp, d);
      if (Math.abs(dx) > 0.3) p.facing = dx > 0 ? 1 : -1;
      p.moving = true;
    } else {
      p.moving = false;
    }
    p.anim += dt;
    p.kick = Math.max(0, p.kick - dt);
    p.retarget -= dt;
    if (p.retarget <= 0 && !chasing) this.wander(p);
  }

  private kickOff() {
    const b = this.ball;
    this.players.forEach((p) => (p.z = 0));
    const h = this.players[Math.floor(rand(0, this.players.length))];
    h.x = this.W / 2;
    h.y = (this.minY + this.maxY) / 2;
    b.holder = h;
    b.flight = null;
    this.holdLeft = 0.8;
  }

  private kick(h: Player) {
    const b = this.ball;
    h.kick = 0.25;
    let target: { tx: number; ty: number; goal: boolean; to: Player | null };
    if (this.passes >= 4 && Math.random() < 0.4) {
      const right = h.x > this.W / 2;
      h.facing = right ? 1 : -1;
      target = { tx: right ? this.W - 2 : 1, ty: this.H / 2 + rand(-2, 2), goal: true, to: null };
    } else {
      const others = this.players.filter((p) => p !== h);
      const to = others[Math.floor(rand(0, others.length))];
      const tx = this.clampX(to.x + rand(-10, 10));
      h.facing = tx > h.x ? 1 : -1;
      target = { tx, ty: this.clampY(to.y + rand(-4, 4)), goal: false, to };
    }
    const d = Math.hypot(target.tx - b.x, target.ty - b.y);
    b.flight = {
      ...target,
      x0: b.x,
      y0: b.y,
      t: 0,
      dur: Math.max(0.35, d / (target.goal ? 90 : 55)),
      lob: Math.min(6, d * 0.06),
    };
    b.holder = null;
    this.wander(h);
  }

  private draw() {
    const g = this.ctx;
    if (!this.pitch) return;
    g.drawImage(this.pitch, 0, 0);
    const b = this.ball;
    g.fillStyle = "rgba(0,0,0,0.28)";
    for (const p of this.players) g.fillRect(Math.round(p.x) - 2, Math.round(p.y), 5, 1);
    g.fillRect(Math.round(b.x) - 1, Math.round(b.y), 2, 1);
    // de trás para a frente, para quem está mais embaixo aparecer na frente
    const items: ({ y: number; p: Player } | { y: number; p: null })[] = [
      ...this.players.map((p) => ({ y: p.y, p })),
      { y: b.y + 0.1, p: null },
    ].sort((a, c) => a.y - c.y);
    for (const it of items) {
      if (!it.p) {
        g.fillStyle = "#ffffff";
        g.fillRect(Math.round(b.x) - 1, Math.round(b.y - 2 - b.z), 2, 2);
        g.fillStyle = "#111827";
        g.fillRect(Math.round(b.x), Math.round(b.y - 2 - b.z), 1, 1);
        continue;
      }
      const p = it.p;
      let frame: Frame = "stand";
      if (this.celebrate > 0) frame = "jump";
      else if (p.kick > 0) frame = "kick";
      else if (p.moving) frame = Math.floor(p.anim * 8) % 2 ? "run1" : "run2";
      g.drawImage(p.sprites[frame][p.facing > 0 ? 0 : 1], Math.round(p.x) - 3, Math.round(p.y - SPRITE_H - p.z));
    }
    for (const c of this.confetti) {
      g.fillStyle = c.c;
      g.fillRect(Math.round(c.x), Math.round(c.y), 1, 1);
    }
  }

  private sync() {
    const go = !this.paused && this.onScreen && !document.hidden;
    if (go && !this.running) {
      this.running = true;
      this.last = performance.now();
      this.acc = 0;
      const loop = (t: number) => {
        if (!this.running) return;
        const dt = Math.min(0.1, (t - this.last) / 1000);
        this.last = t;
        this.acc += dt;
        if (this.acc >= 1 / FPS) {
          this.step(this.acc);
          this.draw();
          this.acc = 0;
        }
        this.raf = requestAnimationFrame(loop);
      };
      this.raf = requestAnimationFrame(loop);
    } else if (!go && this.running) {
      this.running = false;
      cancelAnimationFrame(this.raf);
    }
  }
}
