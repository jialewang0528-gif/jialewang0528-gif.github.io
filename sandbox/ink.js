/* Sandbox ink spill. Self-contained: injects its own DOM and CSS, exposes only window.SandboxInk.
 *   SandboxInk.flood(x, y, cb, opts)  ink spreads from (x, y) until the screen is covered, then cb().
 *                                      opts.title: "brush" (default) | "fade" | false
 *   SandboxInk.drain(x, y, cb, opts)  ink pulls back into (x, y) and the overlay is removed, then cb().
 *                                      opts.duration: ms (default 620)
 *   SandboxInk.cover(opts)            paints the full ink sheet instantly. opts.title: true (default) | false
 * x, y are viewport px; omitted = screen centre. Reduced motion: a plain cross-fade. */
(function () {
  "use strict";
  if (window.SandboxInk) return;

  var INK = "#ebe8e1", BLACK = "#0f0f0e";
  var FONT = '"Instrument Serif", "Iowan Old Style", Georgia, serif';
  var d = document, w = window;
  var reduce = false;
  try { reduce = w.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  var root = null, cv, cx, tv, tx, W = 0, H = 0, DPR = 1, raf = 0;
  var mode = "idle"; // idle | covered | flood | drain
  var anim = null;   // current blob animation
  var title = null;  // { text canvas, mask canvas, box }

  /* ---------- easing: exact curves from the site tokens ---------- */
  function bez(x1, y1, x2, y2) {
    function a(p, q) { return 1 - 3 * q + 3 * p; }
    function b(p, q) { return 3 * q - 6 * p; }
    function c(p) { return 3 * p; }
    function at(t, p, q) { return ((a(p, q) * t + b(p, q)) * t + c(p)) * t; }
    function slope(t, p, q) { return 3 * a(p, q) * t * t + 2 * b(p, q) * t + c(p); }
    return function (x) {
      if (x <= 0) return 0; if (x >= 1) return 1;
      var t = x;
      for (var i = 0; i < 8; i++) {
        var s = slope(t, x1, x2); if (Math.abs(s) < 1e-6) break;
        t -= (at(t, x1, x2) - x) / s;
      }
      t = Math.min(1, Math.max(0, t));
      return at(t, y1, y2);
    };
  }
  var easeOut = bez(0.23, 1, 0.32, 1);
  var easeInOut = bez(0.77, 0, 0.175, 1);

  /* ---------- seeded random so the brush looks the same every time ---------- */
  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  /* ---------- DOM ---------- */
  function ensure() {
    if (root) return;
    if (!d.getElementById("sbx-ink-css")) {
      var st = d.createElement("style");
      st.id = "sbx-ink-css";
      st.textContent =
        "#sbx-ink{position:fixed;top:0;right:0;bottom:0;left:0;z-index:2147483000;pointer-events:none;contain:strict;-webkit-tap-highlight-color:transparent}" +
        "#sbx-ink.block{pointer-events:auto;cursor:progress}" +
        "#sbx-ink canvas{position:absolute;top:0;left:0;width:100%;height:100%;display:block}" +
        "#sbx-ink .sbx-t{opacity:0;transition:opacity 220ms cubic-bezier(0.23,1,0.32,1)}" +
        "#sbx-ink .sbx-t.on{opacity:1}" +
        "#sbx-ink.sbx-fade{transition:opacity 300ms ease}";
      (d.head || d.documentElement).appendChild(st);
    }
    root = d.createElement("div");
    root.id = "sbx-ink";
    root.setAttribute("aria-hidden", "true");
    cv = d.createElement("canvas");
    tv = d.createElement("canvas");
    tv.className = "sbx-t";
    root.appendChild(cv); root.appendChild(tv);
    (d.body || d.documentElement).appendChild(root);
    cx = cv.getContext("2d");
    tx = tv.getContext("2d");
    size();
  }

  function size() {
    W = Math.max(1, w.innerWidth || d.documentElement.clientWidth);
    H = Math.max(1, w.innerHeight || d.documentElement.clientHeight);
    DPR = Math.min(w.devicePixelRatio || 1, 2);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    tv.width = cv.width; tv.height = cv.height;
    title = null;
  }

  function teardown() {
    cancelAnimationFrame(raf); raf = 0;
    if (root && root.parentNode) root.parentNode.removeChild(root);
    root = null; anim = null; title = null; mode = "idle";
  }

  /* ---------- blob ---------- */
  function makeBlob(ox, oy, seed) {
    var r = rng(seed), s = Math.min(W, H) / 900, harm = [], fing = [], i;
    for (i = 3; i <= 9; i++) harm.push({ k: i, a: (0.35 + r() * 0.65) / Math.pow(i, 0.55), p: r() * 6.283, v: (r() < 0.5 ? -1 : 1) * (0.5 + r() * 1.3) });
    var hs = 0; for (i = 0; i < harm.length; i++) hs += harm[i].a;
    var fine = [];
    for (i = 0; i < 5; i++) fine.push({ k: 13 + i * 4 + Math.floor(r() * 3), p: r() * 6.283, v: (r() < 0.5 ? -1 : 1) * (1 + r() * 2), a: 0.5 + r() * 0.5 });
    for (i = 0; i < 7; i++) fing.push({ th: r() * 6.283, wd: 0.07 + r() * 0.16, f: 0.35 + r() * 0.65 });
    var far = 0, cs = [[0, 0], [W, 0], [0, H], [W, H]];
    for (i = 0; i < 4; i++) far = Math.max(far, Math.hypot(cs[i][0] - ox, cs[i][1] - oy));
    return { ox: ox, oy: oy, s: s, harm: harm, hs: hs * 0.62, fine: fine, fing: fing, rEnd: far + 60 * s, r: r, drops: [] };
  }

  function edge(b, R, th, t) {
    var n = 0, i;
    for (i = 0; i < b.harm.length; i++) { var h = b.harm[i]; n += h.a * Math.sin(h.k * th + h.p + h.v * t); }
    n = Math.max(-1, Math.min(1, n / b.hs));
    var f = 0;
    for (i = 0; i < b.fing.length; i++) {
      var g = b.fing[i], dt = th - g.th;
      dt = Math.atan2(Math.sin(dt), Math.cos(dt));
      f += g.f * Math.exp(-(dt * dt) / (g.wd * g.wd));
    }
    var q = 0;
    for (i = 0; i < b.fine.length; i++) { var fh = b.fine[i]; q += fh.a * Math.sin(fh.k * th + fh.p + fh.v * t); }
    return R + Math.min(R * 0.12, 34 * b.s) * n + Math.min(R * 0.28, 120 * b.s) * f + Math.min(R * 0.025, 4 * b.s) * q / 2;
  }

  function blobPath(b, R, t) {
    var N = 160, pts = [], i;
    for (i = 0; i < N; i++) {
      var th = (i / N) * 6.2832, rr = Math.max(0, edge(b, R, th, t));
      pts.push([b.ox + Math.cos(th) * rr, b.oy + Math.sin(th) * rr]);
    }
    cx.beginPath();
    var l = pts[N - 1], f = pts[0];
    cx.moveTo((l[0] + f[0]) / 2, (l[1] + f[1]) / 2);
    for (i = 0; i < N; i++) {
      var p = pts[i], q = pts[(i + 1) % N];
      cx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
    }
    cx.closePath();
  }

  function paintBlob(b, R, t) {
    cx.setTransform(DPR, 0, 0, DPR, 0, 0);
    cx.clearRect(0, 0, W, H);
    cx.fillStyle = INK;
    if (R > 0.5) {
      blobPath(b, R, t);
      cx.fill();
      // a faint wet edge so the sheet reads as ink, not a vector shape
      cx.lineWidth = 5; cx.strokeStyle = "rgba(15,15,14,0.05)"; cx.stroke();
    }
    var drops = b.drops, any = false;
    cx.beginPath();
    for (var i = 0; i < drops.length; i++) {
      var p = drops[i];
      if (p.k <= 0.01) continue;
      any = true;
      var rr = p.rad * p.k;
      cx.moveTo(p.x + rr * p.st * Math.cos(p.a), p.y + rr * p.st * Math.sin(p.a));
      cx.ellipse(p.x, p.y, rr * p.st, rr, p.a, 0, 6.2832);
    }
    if (any) cx.fill();
  }

  function fullSheet() {
    cx.setTransform(DPR, 0, 0, DPR, 0, 0);
    cx.clearRect(0, 0, W, H);
    cx.fillStyle = INK;
    cx.fillRect(0, 0, W, H);
  }

  /* ---------- brushed title ---------- */
  function fontReady(cb) {
    var done = false;
    function go() { if (!done) { done = true; cb(); } }
    try {
      if (d.fonts && d.fonts.check && d.fonts.check("italic 120px " + FONT.split(",")[0])) return go();
      if (d.fonts && d.fonts.load) { d.fonts.load("italic 120px " + FONT.split(",")[0]).then(go, go); setTimeout(go, 700); return; }
    } catch (e) {}
    go();
  }

  function buildTitle() {
    var fs = Math.round(Math.min(W * 0.19, H * 0.3, 240));
    var font = "italic 400 " + fs + "px " + FONT;
    tx.setTransform(1, 0, 0, 1, 0, 0);
    tx.font = font;
    var tw = tx.measureText("Sandbox").width;
    var bw = Math.ceil(tw + fs * 0.5), bh = Math.ceil(fs * 1.3);
    var bx = Math.round((W - bw) / 2), by = Math.round((H - bh) / 2 - fs * 0.04);

    var text = d.createElement("canvas");
    text.width = Math.round(bw * DPR); text.height = Math.round(bh * DPR);
    var c = text.getContext("2d"), r = rng(7);
    c.scale(DPR, DPR);
    c.font = font; c.fillStyle = BLACK; c.textBaseline = "middle"; c.textAlign = "center";
    c.fillText("Sandbox", bw / 2, bh / 2 + fs * 0.06);
    // dry-brush streaks: thin horizontal gaps where the bristles ran out of ink
    c.globalCompositeOperation = "destination-out";
    // a few dry-brush streaks, mostly where each stroke trails off (the right half)
    for (var i = 0; i < 26; i++) {
      c.globalAlpha = 0.35 + r() * 0.55;
      var sy = bh * 0.22 + r() * bh * 0.6, sx = bw * (0.35 + r() * 0.6), len = fs * (0.1 + r() * 0.35);
      c.fillRect(sx, sy, len, 0.8 + r() * 1.6);
    }
    c.globalAlpha = 1; c.globalCompositeOperation = "source-over";

    // one bristle dab, slanted like a held brush
    var dh = bh * 0.92, dw = Math.max(8, fs * 0.08);
    var dab = d.createElement("canvas");
    dab.width = Math.round((dw + dh * 0.2) * DPR); dab.height = Math.round(dh * DPR);
    var dc = dab.getContext("2d"), rb = rng(11);
    dc.scale(DPR, DPR); dc.fillStyle = "#000";
    for (var y = 0; y < dh; y += 1.3) {
      var edgeFade = Math.min(1, Math.min(y, dh - y) / (dh * 0.12));
      if (rb() > 0.97 * edgeFade + 0.02) continue;
      dc.globalAlpha = 0.85 + rb() * 0.15;
      var sl = (dh - y) * 0.2;
      dc.beginPath(); dc.arc(sl + dw / 2 + (rb() - 0.5) * dw * 0.5, y, 0.9 + rb() * 1.6, 0, 6.2832); dc.fill();
    }
    var mask = d.createElement("canvas");
    mask.width = text.width; mask.height = text.height;
    var mc = mask.getContext("2d");
    mc.scale(DPR, DPR);
    title = { text: text, mask: mask, mc: mc, dab: dab, dw: dw + dh * 0.2, dh: dh, bx: bx, by: by, bw: bw, bh: bh, fs: fs, lastX: -1 };
  }

  function sweepTo(p) {
    // stamp dabs from the last position to the new brush tip
    var T = title, tipX = -T.dw + (T.bw + T.dw) * p, step = 2;
    var x = T.lastX < 0 ? -T.dw : T.lastX;
    for (; x <= tipX; x += step) {
      var wob = Math.sin(x / T.bw * 9.4) * T.fs * 0.025 + Math.sin(x / T.bw * 3.1) * T.fs * 0.03;
      T.mc.drawImage(T.dab, x, (T.bh - T.dh) / 2 + wob, T.dw, T.dh);
    }
    T.lastX = x;
  }

  function paintTitle() {
    var T = title;
    tx.setTransform(1, 0, 0, 1, 0, 0);
    tx.clearRect(0, 0, tv.width, tv.height);
    var X = Math.round(T.bx * DPR), Y = Math.round(T.by * DPR);
    tx.globalCompositeOperation = "source-over";
    tx.drawImage(T.mask, X, Y);
    tx.globalCompositeOperation = "source-in";
    tx.drawImage(T.text, X, Y);
    tx.globalCompositeOperation = "source-over";
  }

  function titleFull(show) {
    fontReady(function () {
      if (!root || mode !== "covered") return; // a drain may have started while the font loaded
      if (!title) buildTitle();
      sweepTo(1); paintTitle();
      if (show) tv.classList.add("on");
    });
  }

  /* ---------- public ---------- */
  function cover(opts) {
    opts = opts || {};
    cancelAnimationFrame(raf); raf = 0;
    ensure();
    root.classList.remove("sbx-fade"); root.style.opacity = "1";
    root.classList.add("block");
    fullSheet();
    mode = "covered";
    if (opts.title !== false) titleFull(true); else tv.classList.remove("on");
  }

  function flood(x, y, cb, opts) {
    opts = opts || {};
    var tmode = opts.title === undefined ? "brush" : opts.title;
    ensure();
    cancelAnimationFrame(raf);
    root.classList.add("block");
    if (x == null) x = W / 2; if (y == null) y = H / 2;
    mode = "flood";
    var called = false;
    function finish() { if (called) return; called = true; mode = "covered"; if (cb) try { cb(); } catch (e) { setTimeout(function () { throw e; }); } }

    if (reduce) {
      fullSheet();
      root.style.opacity = "0"; root.classList.add("sbx-fade");
      void root.offsetWidth;
      root.style.opacity = "1";
      if (tmode) titleFull(true);
      setTimeout(finish, 320);
      return;
    }

    var b = makeBlob(x, y, (Math.random() * 1e9) | 0), r = b.r, i;
    // spatter thrown ahead of the front; each is swallowed a moment later
    var throws = [];
    for (i = 0; i < 34; i++) {
      var big = r() < 0.22;
      throws.push({ at: 0.02 + Math.pow(r(), 1.3) * 0.5, lead: 90 + r() * 170, ahead: (8 + r() * 40) * Math.max(0.7, b.s), rad: (big ? 6 + r() * 7 : 1.6 + r() * 4) * Math.max(0.7, b.s), st: 1 + r() * 1.1, sat: big && r() < 0.7 });
    }
    anim = b;
    var t0 = 0, GROW = 560, BRUSH_AT = 260, BRUSH = 460, END = 800, brushing = false;
    if (tmode === "brush" || tmode === "fade") fontReady(function () { if (root && anim === b) buildTitle(); });

    function frame(now) {
      if (!t0) t0 = now;
      var el = now - t0, p = Math.min(1, el / GROW), R = b.rEnd * easeOut(p);
      for (var j = 0; j < throws.length; j++) {
        var th = throws[j];
        if (!th.done && p >= th.at) {
          th.done = true;
          // land where the front will be in th.lead ms, so each drop stays visible that long
          var Rl = b.rEnd * easeOut(Math.min(1, (el + th.lead) / GROW)), got = false, rr = 0, px = 0, py = 0;
          for (var tr = 0; tr < 10 && !got; tr++) {
            th.a = r() * 6.2832;
            rr = edge(b, Rl, th.a, el / 1000) + th.ahead; px = x + Math.cos(th.a) * rr; py = y + Math.sin(th.a) * rr;
            got = px > 8 && px < W - 8 && py > 8 && py < H - 8;
          }
          if (got) {
            b.drops.push({ a: th.a, x: px, y: py, rad: th.rad, st: th.st, k: 0, born: el });
            if (th.sat) for (var q = 0; q < 3; q++) { var sa = th.a + (r() - 0.5) * 0.5, sd = rr + th.rad * (2 + r() * 3); b.drops.push({ a: sa, x: x + Math.cos(sa) * sd, y: y + Math.sin(sa) * sd, rad: th.rad * (0.2 + r() * 0.25), st: 1, k: 0, born: el + 20 }); }
          }
        }
      }
      for (j = 0; j < b.drops.length; j++) { var dp = b.drops[j]; dp.k = el < dp.born ? 0 : easeOut(Math.min(1, (el - dp.born) / 70)); }
      if (p < 1) paintBlob(b, R, el / 1000); else fullSheet();

      if (title && anim === b) {
        if (tmode === "brush" && el >= BRUSH_AT) {
          if (!brushing) { brushing = true; tv.classList.add("on"); tv.style.transition = "none"; }
          sweepTo(easeInOut(Math.min(1, (el - BRUSH_AT) / BRUSH))); paintTitle();
        } else if (tmode === "fade" && el >= BRUSH_AT && !brushing) {
          brushing = true; sweepTo(1); paintTitle(); tv.classList.add("on");
        }
      }
      var endAt = tmode ? END : GROW + 40;
      if (el >= endAt && (title || !tmode || el > END + 500)) {
        if (tmode && title) { sweepTo(1); paintTitle(); }
        tv.style.transition = "";
        raf = 0; finish(); return;
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
  }

  function drain(x, y, cb, opts) {
    opts = opts || {};
    if (!root || mode === "idle") cover({ title: false });
    cancelAnimationFrame(raf);
    root.classList.add("block");
    if (x == null) x = W / 2; if (y == null) y = H / 2;
    mode = "drain";
    var called = false;
    function finish() { if (called) return; called = true; teardown(); if (cb) try { cb(); } catch (e) { setTimeout(function () { throw e; }); } }

    tv.classList.remove("on");
    if (reduce) {
      root.classList.add("sbx-fade");
      void root.offsetWidth;
      root.style.opacity = "0";
      root.classList.remove("block");
      setTimeout(finish, 320);
      return;
    }

    var D = opts.duration || 620, LEAD = 90;
    var b = makeBlob(x, y, (Math.random() * 1e9) | 0), r = b.r, i;
    // droplets left behind on the page as the sheet pulls back
    var spawns = [];
    for (i = 0; i < 26; i++) spawns.push({ at: 0.1 + r() * 0.75, a: r() * 6.2832, rad: (r() < 0.2 ? 5 + r() * 5 : 1.6 + r() * 3.6) * Math.max(0.7, b.s), st: 1 + r() * 0.9, done: false });
    anim = b;
    var t0 = 0;

    function frame(now) {
      if (!t0) t0 = now;
      var el = now - t0, p = Math.max(0, Math.min(1, (el - LEAD) / (D - LEAD)));
      var e = easeInOut(p), R = b.rEnd * (1 - e);
      for (var j = 0; j < spawns.length; j++) {
        var sp = spawns[j];
        if (!sp.done && e >= sp.at) {
          sp.done = true;
          for (var tr = 0; tr < 10; tr++) {
            sp.a = r() * 6.2832;
            var rr = edge(b, R, sp.a, el / 1000) + (4 + r() * 26) * b.s;
            var px = x + Math.cos(sp.a) * rr, py = y + Math.sin(sp.a) * rr;
            if (px > 8 && px < W - 8 && py > 8 && py < H - 8) { b.drops.push({ a: sp.a, x: px, y: py, rad: sp.rad, st: sp.st, k: 1, born: el }); break; }
          }
        }
      }
      for (j = 0; j < b.drops.length; j++) { var dp = b.drops[j]; dp.k = 1 - easeOut(Math.min(1, (el - dp.born) / 320)); }
      paintBlob(b, R, el / 1000);
      if (p >= 1 && el > D + 330) { raf = 0; finish(); return; }
      if (p >= 1) root.classList.remove("block");
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
  }

  w.addEventListener("resize", function () {
    if (!root) return;
    var had = tv.classList.contains("on");
    size();
    if (mode === "covered") { fullSheet(); if (had) titleFull(true); }
  });
  // Restored from the back/forward cache while still covered: clear the sheet.
  w.addEventListener("pageshow", function (e) {
    if (e.persisted && root) drain(W / 2, H / 2, null, { duration: 360 });
  });

  w.SandboxInk = { flood: flood, drain: drain, cover: cover };
})();
