export interface SandShield {
  pointerTo(x: number, y: number): void;
  pointerGone(): void;
  spark(): void;
  pulse(): void;
  setChurn(on: boolean): void;
  destroy(): void;
}

const COAL = ["#141316", "#1b191d", "#212024", "#292628"];
const FLECK = "#4a4237";
const REACH = 96;
const TRAIL_LIFE = 260;
const SPARK_LIFE = 650;
const PULSE_LIFE = 700;

const inert: SandShield = {
  pointerTo() {},
  pointerGone() {},
  spark() {},
  pulse() {},
  setChurn() {},
  destroy() {},
};

export function createSandShield(canvas: HTMLCanvasElement): SandShield {
  const ctx = canvas.getContext("2d");
  if (!ctx) return inert;

  const still =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let width = 0;
  let height = 0;
  let dpr = 1;
  let pattern: CanvasPattern | null = null;

  let grainCount = 0;
  let grains = new Float32Array(0);
  let shades = new Uint8Array(0);

  let pointer: { x: number; y: number } | null = null;
  let pointerSince = 0;
  const trail: { x: number; y: number; at: number }[] = [];
  const sparks: { x: number; y: number; at: number }[] = [];
  let pulseAt = -Infinity;
  let churn = false;
  let frame = 0;
  let last = performance.now();
  let lastActive = performance.now();
  let calm = false;

  function measure() {
    const rect = canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    pattern = makePattern();
    seedGrains();
    calm = false;
    lastActive = performance.now();
  }

  function makePattern(): CanvasPattern | null {
    const tile = document.createElement("canvas");
    const side = Math.round(384 * dpr);
    tile.width = side;
    tile.height = side;
    const tctx = tile.getContext("2d");
    if (!tctx) return null;
    tctx.fillStyle = "#141318";
    tctx.fillRect(0, 0, side, side);
    const cell = Math.max(2, Math.round(1.1 * dpr));
    const cols = Math.ceil(side / cell);
    for (let pass = 0; pass < COAL.length; pass += 1) {
      tctx.fillStyle = COAL[pass]!;
      for (let c = pass; c < cols * cols; c += COAL.length) {
        const cx = (c % cols) * cell + rand() * cell;
        const cy = Math.floor(c / cols) * cell + rand() * cell;
        const size = (0.8 + rand() * 0.9) * dpr;
        tctx.globalAlpha = 0.35 + rand() * 0.65;
        tctx.fillRect(cx, cy, size, size);
      }
    }
    tctx.fillStyle = FLECK;
    for (let f = 0; f < (cols * cols) / 240; f += 1) {
      tctx.globalAlpha = 0.25 + rand() * 0.35;
      tctx.fillRect(rand() * side, rand() * side, dpr, dpr);
    }
    tctx.globalCompositeOperation = "destination-out";
    for (let p = 0; p < (cols * cols) / 500; p += 1) {
      tctx.globalAlpha = 0.3 + rand() * 0.45;
      tctx.fillRect(rand() * side, rand() * side, dpr * 0.9, dpr * 0.9);
    }
    return ctx!.createPattern(tile, "repeat");
  }

  function seedGrains() {
    grainCount = still ? 0 : Math.min(4200, Math.floor((width * height) / 260));
    grains = new Float32Array(grainCount * 6);
    shades = new Uint8Array(grainCount);
    for (let i = 0; i < grainCount; i += 1) {
      const o = i * 6;
      const hx = rand() * width;
      const hy = rand() * height;
      grains[o] = hx;
      grains[o + 1] = hy;
      grains[o + 2] = hx;
      grains[o + 3] = hy;
      shades[i] = Math.floor(rand() * COAL.length);
    }
  }

  function rand() {
    return Math.random();
  }

  function easeOut(v: number) {
    return 1 - (1 - v) * (1 - v);
  }

  function sparkEnvelope(age: number) {
    if (age >= SPARK_LIFE) return 0;
    const attack = 90;
    if (age < attack) return easeOut(age / attack);
    return 1 - (age - attack) / (SPARK_LIFE - attack);
  }

  function eraseHoles(t: number) {
    ctx!.globalCompositeOperation = "destination-out";
    if (pointer) {
      const grown = still ? 1 : easeOut(Math.min(1, (t - pointerSince) / 150));
      punch(pointer.x, pointer.y, REACH * grown, 0.95);
    }
    if (!still) {
      for (let i = trail.length - 1; i >= 0; i -= 1) {
        const point = trail[i]!;
        const fade = 1 - (t - point.at) / TRAIL_LIFE;
        if (fade <= 0) {
          trail.splice(i, 1);
        } else {
          punch(point.x, point.y, REACH * 0.85 * fade, 0.8 * fade);
        }
      }
    }
    for (const s of sparks) {
      const env = sparkEnvelope(t - s.at);
      if (env > 0) punch(s.x, s.y, 8 + 17 * env, 0.85 * env);
    }
    ctx!.globalCompositeOperation = "source-over";
  }

  function punch(x: number, y: number, radius: number, strength: number) {
    if (radius <= 0) return;
    const hole = ctx!.createRadialGradient(x, y, 0, x, y, radius);
    hole.addColorStop(0, `rgba(0,0,0,${strength})`);
    hole.addColorStop(0.55, `rgba(0,0,0,${strength * 0.75})`);
    hole.addColorStop(1, "rgba(0,0,0,0)");
    ctx!.fillStyle = hole;
    ctx!.beginPath();
    ctx!.arc(x, y, radius, 0, Math.PI * 2);
    ctx!.fill();
  }

  function moveGrains(t: number, dt: number) {
    const ds = Math.min(2.5, dt / 16.7);
    const reach = REACH + 34;
    for (let i = 0; i < grainCount; i += 1) {
      const o = i * 6;
      const hx = grains[o]!;
      const hy = grains[o + 1]!;
      let x = grains[o + 2]!;
      let y = grains[o + 3]!;
      let vx = grains[o + 4]!;
      let vy = grains[o + 5]!;
      vx += (hx - x) * 0.055 * ds;
      vy += (hy - y) * 0.055 * ds;
      if (pointer) {
        const dx = x - pointer.x;
        const dy = y - pointer.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        if (d < reach) {
          const push = (1 - d / reach) ** 2 * 3.4 * ds;
          vx += (dx / d) * push;
          vy += (dy / d) * push;
        }
      }
      for (const s of sparks) {
        const age = t - s.at;
        if (age < 130) {
          const dx = x - s.x;
          const dy = y - s.y;
          const d = Math.sqrt(dx * dx + dy * dy) || 1;
          if (d < 46) {
            const push = (1 - d / 46) * 1.4 * ds;
            vx += (dx / d) * push;
            vy += (dy / d) * push;
          }
        }
      }
      vx *= 0.86;
      vy *= 0.86;
      x += vx * ds;
      y += vy * ds;
      grains[o + 2] = x;
      grains[o + 3] = y;
      grains[o + 4] = vx;
      grains[o + 5] = vy;
    }
  }

  function drawGrains() {
    for (let shade = 0; shade < COAL.length; shade += 1) {
      ctx!.fillStyle = COAL[shade]!;
      for (let i = 0; i < grainCount; i += 1) {
        if (shades[i] !== shade) continue;
        const o = i * 6;
        const size = 1.2 + (i % 4) * 0.35;
        ctx!.fillRect(grains[o + 2]!, grains[o + 3]!, size, size);
      }
    }
  }

  function drawLight(t: number) {
    ctx!.globalCompositeOperation = "lighter";
    for (let i = sparks.length - 1; i >= 0; i -= 1) {
      const s = sparks[i]!;
      const env = sparkEnvelope(t - s.at);
      if (env <= 0) {
        sparks.splice(i, 1);
        continue;
      }
      const radius = 22 + 42 * env;
      const halo = ctx!.createRadialGradient(s.x, s.y, 0, s.x, s.y, radius);
      halo.addColorStop(0, `rgba(255,208,138,${0.5 * env})`);
      halo.addColorStop(0.4, `rgba(255,186,110,${0.22 * env})`);
      halo.addColorStop(1, "rgba(255,186,110,0)");
      ctx!.fillStyle = halo;
      ctx!.beginPath();
      ctx!.arc(s.x, s.y, radius, 0, Math.PI * 2);
      ctx!.fill();
    }
    const pulseAge = t - pulseAt;
    if (pulseAge < PULSE_LIFE) {
      const fade = 1 - pulseAge / PULSE_LIFE;
      const radius = Math.max(width, height) * 0.7;
      const wash = ctx!.createRadialGradient(
        width / 2,
        height * 0.45,
        0,
        width / 2,
        height * 0.45,
        radius,
      );
      wash.addColorStop(0, `rgba(247,118,142,${0.26 * fade})`);
      wash.addColorStop(1, "rgba(247,118,142,0)");
      ctx!.fillStyle = wash;
      ctx!.fillRect(0, 0, width, height);
    }
    ctx!.globalCompositeOperation = "source-over";
  }

  function render(t: number) {
    frame = requestAnimationFrame(render);
    const dt = Math.max(1, t - last);
    last = t;
    if (width === 0 || height === 0) return;

    const active =
      churn ||
      pointer !== null ||
      trail.length > 0 ||
      sparks.length > 0 ||
      t - pulseAt < PULSE_LIFE;
    if (active) {
      lastActive = t;
      calm = false;
    } else if (t - lastActive > 1200) {
      if (calm) return;
      calm = true;
    }

    ctx!.setTransform(1, 0, 0, 1, 0, 0);
    ctx!.clearRect(0, 0, canvas.width, canvas.height);
    if (pattern) {
      ctx!.save();
      if (churn && !still) ctx!.translate((rand() - 0.5) * 1.6 * dpr, (rand() - 0.5) * 1.6 * dpr);
      ctx!.fillStyle = pattern;
      ctx!.fillRect(-4, -4, canvas.width + 8, canvas.height + 8);
      ctx!.restore();
    }

    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    eraseHoles(t);
    if (!still) {
      moveGrains(t, dt);
      drawGrains();
    }
    drawLight(t);
  }

  measure();
  window.addEventListener("resize", measure);
  frame = requestAnimationFrame(render);

  return {
    pointerTo(x, y) {
      const t = performance.now();
      if (!pointer) {
        pointerSince = t;
      } else if (!still) {
        const dx = pointer.x - x;
        const dy = pointer.y - y;
        if (dx * dx + dy * dy > 16) trail.push({ x: pointer.x, y: pointer.y, at: t });
        if (trail.length > 28) trail.shift();
      }
      pointer = { x, y };
    },
    pointerGone() {
      if (pointer && !still) trail.push({ ...pointer, at: performance.now() });
      pointer = null;
    },
    spark() {
      sparks.push({
        x: width * (0.12 + rand() * 0.76),
        y: height * (0.12 + rand() * 0.76),
        at: performance.now(),
      });
      if (sparks.length > 24) sparks.shift();
    },
    pulse() {
      pulseAt = performance.now();
    },
    setChurn(on) {
      churn = on;
    },
    destroy() {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", measure);
    },
  };
}
