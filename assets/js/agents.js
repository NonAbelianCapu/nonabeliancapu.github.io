// Live agent grid for the site header: a 3-phase cyclic cellular automaton on a torus.
// Each agent moves to the next phase when at least THRESHOLD of its 8 neighbors are
// already there; from random noise this settles into rotating spirals, which is why it
// stands in for local cycles on the home page.
(function () {
  const PHASES = 3;
  const THRESHOLD = 3;
  const WARMUP_STEPS = 160; // so the first frame already shows spirals, not noise
  const STEP_MS = 110;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function readColors() {
    const style = getComputedStyle(document.documentElement);
    const read = (name) => style.getPropertyValue(name).trim();
    return { surface: read('--surface'), line: read('--line'), accent: read('--accent') };
  }

  function createRandom(seed) {
    let state = seed;
    return function () {
      state = (state * 1103515245 + 12345) & 0x7fffffff;
      return state / 0x7fffffff;
    };
  }

  function Simulation(canvas) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d');
    this.fixedCols = Number(canvas.dataset.cols) || 0;
    this.fixedRows = Number(canvas.dataset.rows) || 0;
    this.cellPx = Number(canvas.dataset.cell) || 10;
    this.colors = readColors();
    this.running = false;
    this.visible = true;
    this.paused = false;
    this.setup();
  }

  Simulation.prototype.setup = function () {
    const box = this.canvas.getBoundingClientRect();
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.max(1, Math.round(box.width * pixelRatio));
    this.canvas.height = Math.max(1, Math.round(box.height * pixelRatio));
    this.cols = this.fixedCols || Math.max(8, Math.round(box.width / this.cellPx));
    this.rows = this.fixedRows || Math.max(4, Math.round(box.height / this.cellPx));
    this.cellWidth = this.canvas.width / this.cols;
    this.cellHeight = this.canvas.height / this.rows;
    // A thin strip wraps its waves around vertically and shows stripes, so the
    // torus is kept at least half as tall as it is wide and only the top rows are drawn.
    this.simRows = Math.max(this.rows, Math.round(this.cols / 2));

    const random = createRandom(20241124);
    this.grid = new Uint8Array(this.cols * this.simRows);
    this.next = new Uint8Array(this.cols * this.simRows);
    for (let i = 0; i < this.grid.length; i++) {
      this.grid[i] = Math.floor(random() * PHASES);
    }
    for (let k = 0; k < WARMUP_STEPS; k++) {
      this.step();
    }
    this.draw();
  };

  Simulation.prototype.step = function () {
    const cols = this.cols;
    const rows = this.simRows;
    const grid = this.grid;
    const next = this.next;
    for (let y = 0; y < rows; y++) {
      const up = ((y - 1 + rows) % rows) * cols;
      const here = y * cols;
      const down = ((y + 1) % rows) * cols;
      for (let x = 0; x < cols; x++) {
        const left = (x - 1 + cols) % cols;
        const right = (x + 1) % cols;
        const phase = grid[here + x];
        const target = (phase + 1) % PHASES;
        const count =
          (grid[up + left] === target) + (grid[up + x] === target) + (grid[up + right] === target) +
          (grid[here + left] === target) + (grid[here + right] === target) +
          (grid[down + left] === target) + (grid[down + x] === target) + (grid[down + right] === target);
        next[here + x] = count >= THRESHOLD ? target : phase;
      }
    }
    this.grid = next;
    this.next = grid;
  };

  Simulation.prototype.draw = function () {
    const ctx = this.context;
    const colors = this.colors;
    ctx.globalAlpha = 1;
    ctx.fillStyle = colors.surface;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Phase 0 is a faint dot, phases 1 and 2 grow and darken toward the accent.
    const radiusFactor = [0.16, 0.3, 0.4];
    const alpha = [1, 0.3, 0.72];
    const fill = [colors.line, colors.accent, colors.accent];
    const size = Math.min(this.cellWidth, this.cellHeight);

    for (let phase = 0; phase < PHASES; phase++) {
      ctx.globalAlpha = alpha[phase];
      ctx.fillStyle = fill[phase];
      const radius = size * radiusFactor[phase];
      ctx.beginPath();
      for (let y = 0; y < this.rows; y++) {
        const cy = (y + 0.5) * this.cellHeight;
        for (let x = 0; x < this.cols; x++) {
          if (this.grid[y * this.cols + x] !== phase) continue;
          const cx = (x + 0.5) * this.cellWidth;
          ctx.moveTo(cx + radius, cy);
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        }
      }
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  Simulation.prototype.shouldRun = function () {
    return this.visible && !this.paused && !reducedMotion.matches && !document.hidden;
  };

  Simulation.prototype.update = function () {
    if (this.shouldRun() && !this.running) {
      this.running = true;
      let last = 0;
      const tick = (time) => {
        if (!this.shouldRun()) {
          this.running = false;
          return;
        }
        if (time - last >= STEP_MS) {
          last = time;
          this.step();
          this.draw();
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  };

  function start() {
    const simulations = [];
    document.querySelectorAll('canvas[data-sim]').forEach(function (canvas) {
      const sim = new Simulation(canvas);
      simulations.push(sim);

      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
          sim.visible = entries[0].isIntersecting;
          sim.update();
        }).observe(canvas);
      }

      if ('ResizeObserver' in window) {
        let lastWidth = canvas.getBoundingClientRect().width;
        new ResizeObserver(function () {
          const width = canvas.getBoundingClientRect().width;
          if (Math.abs(width - lastWidth) < 2) return;
          lastWidth = width;
          sim.setup();
        }).observe(canvas);
      }

      const button = document.querySelector('[data-sim-toggle="' + canvas.id + '"]');
      if (button) {
        if (reducedMotion.matches) button.hidden = true;
        button.addEventListener('click', function () {
          sim.paused = !sim.paused;
          button.textContent = sim.paused ? 'Play' : 'Pause';
          button.setAttribute('aria-pressed', String(sim.paused));
          sim.update();
        });
      }

      sim.update();
    });

    function refreshColors() {
      simulations.forEach(function (sim) {
        sim.colors = readColors();
        sim.draw();
      });
    }
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', refreshColors);
    new MutationObserver(refreshColors).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    document.addEventListener('visibilitychange', function () {
      simulations.forEach(function (sim) { sim.update(); });
    });
    reducedMotion.addEventListener('change', function () {
      simulations.forEach(function (sim) { sim.update(); });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
