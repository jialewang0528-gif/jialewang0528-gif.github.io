/* addon-putt: a ball on the ground beside the footer name. Pull back and release to chip it
   over the letters; the word space is the cup. Self-contained. Needs #footMark and .foot-row.
   At rest the ball sits on the baseline next to the name, never on top of a letter.
   The ground is measured from the rendered glyphs (drawn to a canvas at the exact
   positions the browser laid them out), never guessed. */
(function () {
  "use strict";
  var mark = document.getElementById("footMark");
  if (!mark || !window.PointerEvent || !document.createRange) return;
  var footer = mark.closest("footer") || mark.parentElement;
  var row = footer.querySelector(".foot-row");
  var reduceMq = window.matchMedia ? matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
  var DEBUG = /[?&]puttdebug/.test(location.search);

  // physics constants, in em of the name's font size so every screen plays the same
  var K = {
    G: 14,          // gravity, em/s^2
    VMAX: 8,     // launch speed at a full pull, em/s
    MU: 1.2,      // rolling resistance, em/s^2
    E: 0.25,       // bounce off the ground
    EW: 0.12,      // bounce off a wall
    WALL: 2.4,     // slope steeper than this counts as a wall
    RMAX: 7,       // ball radius cap, px (it also has to fit the word space)
    TEE: 0.08,     // gap between the name and the ball on its tee, em (never under 3px)
    PULL: 0.8,    // pull distance for full power, em (never under 90px)
    DT: 1 / 240
  };
  var SS = 2;      // ground samples per CSS px

  footer.classList.add("putt-host");
  var layer = document.createElement("div"); layer.className = "putt-layer"; layer.setAttribute("aria-hidden", "true");
  var aim = document.createElement("div"); aim.className = "putt-aim";
  var ballEl = document.createElement("div"); ballEl.className = "putt-ball";
  layer.appendChild(aim); layer.appendChild(ballEl); footer.appendChild(layer);
  var score = null;
  if (row) {
    score = document.createElement("span"); score.className = "putt-score"; score.hidden = true;
    row.insertBefore(score, row.firstChild);
  }

  var T = null;                 // terrain: { S, n, fs, r, base, cupL, cupR, tee }
  var b = { x: 0, y: 0, vx: 0, vy: 0 };
  var last = { x: 0, y: 0 };    // where the current shot was taken from
  var state = "rest";           // rest | aim | fly | out | sunk
  var strokes = 0, raf = 0, acc = 0, prevT = 0, flyT = 0, still = 0;
  var drag = null;

  /* ---------- measure the letter tops from the rendered text ---------- */
  function measure() {
    var cs = getComputedStyle(mark), fs = parseFloat(cs.fontSize);
    var mr = mark.getBoundingClientRect();
    if (!fs || !mr.width) return null;
    // baseline: an empty inline-block sits with its bottom edge on the baseline
    var probe = document.createElement("span");
    probe.style.cssText = "display:inline-block;width:0;height:0;vertical-align:baseline";
    mark.appendChild(probe);
    var base = probe.getBoundingClientRect().bottom - mr.top;
    mark.removeChild(probe);

    // the ground runs on past both ends of the name at baseline height, as far as the screen edge
    var vw = document.documentElement.clientWidth;
    var OFF = Math.max(0, Math.floor(Math.min(mr.left, vw - mr.right, fs)));
    var upper = cs.textTransform === "uppercase";
    var chars = [], rng = document.createRange();
    var tw = document.createTreeWalker(mark, NodeFilter.SHOW_TEXT, null), node;
    while ((node = tw.nextNode())) {
      var txt = node.nodeValue;
      for (var i = 0; i < txt.length; i++) {
        rng.setStart(node, i); rng.setEnd(node, i + 1);
        var rc = rng.getBoundingClientRect();
        chars.push({ c: upper ? txt[i].toUpperCase() : txt[i], x: rc.left - mr.left + OFF, r: rc.right - mr.left + OFF });
      }
    }
    if (!chars.length) return null;

    var W = Math.ceil(mr.width) + 2 * OFF + 4, PAD = Math.ceil(fs * 0.4), H = Math.ceil(base) + PAD + 4;
    var cv = document.createElement("canvas"); cv.width = W * SS; cv.height = H * SS;
    var cx = cv.getContext("2d", { willReadFrequently: true });
    cx.scale(SS, SS);
    cx.font = cs.fontStyle + " " + cs.fontWeight + " " + fs + "px " + cs.fontFamily;
    cx.textBaseline = "alphabetic"; cx.fillStyle = "#000";
    if ("fontKerning" in cx) cx.fontKerning = "none";   // each glyph is placed at its laid-out x already
    chars.forEach(function (ch) { if (ch.c.trim()) cx.fillText(ch.c, ch.x, base + PAD); });

    var n = W * SS, hRows = H * SS, data = cx.getImageData(0, 0, n, hRows).data;
    var top = new Float32Array(n), first = -1, lastInk = -1;
    for (var x = 0; x < n; x++) {
      var t = Infinity;
      for (var y = 0; y < hRows; y++) { if (data[(y * n + x) * 4 + 3] > 110) { t = y / SS - PAD; break; } }
      top[x] = t;
      if (t !== Infinity) { if (first < 0) first = x; lastInk = x; }
    }
    if (first < 0) return null;
    // a column with no ink has the baseline as its floor, inside the name and beside it
    for (x = 0; x < n; x++) if (top[x] === Infinity) top[x] = base;

    // the cup: the run of empty columns at the word space
    var sp = -1;
    for (i = 0; i < chars.length; i++) if (!chars[i].c.trim() && i > 0 && i < chars.length - 1) { sp = i; break; }
    var cupL = 0, cupR = 0;
    if (sp >= 0) {
      var mid = Math.round((chars[sp].x + chars[sp].r) / 2 * SS);
      // walk outward from the middle of the space while the column is empty
      var a = mid, c = mid;
      if (top[mid] !== base) {          // letters overlap the space box: look for the nearest empty column
        var best = -1;
        for (var d = 0; d < fs * SS * 0.3; d++) { if (top[mid + d] === base) { best = mid + d; break; } if (top[mid - d] === base) { best = mid - d; break; } }
        if (best < 0) sp = -1; else a = c = best;
      }
      if (sp >= 0) {
        while (a > first && top[a - 1] === base) a--;
        while (c < lastInk && top[c + 1] === base) c++;
        cupL = a / SS; cupR = (c + 1) / SS;
      }
    }
    var gap = cupR - cupL;
    var r = Math.max(4, Math.min(K.RMAX, fs * 0.042));
    if (gap > 0) r = Math.max(3, Math.min(r, (gap - 2.5) / 2));

    // where a ball's centre can be: the ground pushed out by the ball's radius
    var S = new Float32Array(n), rs = Math.ceil(r * SS), prof = new Float32Array(2 * rs + 1);
    for (d = -rs; d <= rs; d++) { var dx = d / SS; prof[d + rs] = Math.sqrt(Math.max(0, r * r - dx * dx)); }
    for (x = 0; x < n; x++) {
      var m = Infinity;
      for (d = -rs; d <= rs; d++) {
        var j = x + d; if (j < 0 || j >= n) continue;
        var v = top[j] - prof[d + rs]; if (v < m) m = v;
      }
      S[x] = m;
    }

    // tee: on the ground just before the first letter, where it reads as a ball. On a letter top it read
    // as an accent, and after the last letter as a full stop. From here the hole plays in two or three
    // strokes: a chip up onto the letters, then along the tops to the cup. If the name starts at the
    // screen edge the other end is used.
    var gapT = Math.max(3, Math.min(fs * K.TEE, first / SS - 2 * r - 2)), tee = first / SS - gapT - r;
    if (tee - r < 1) tee = Math.min(W - r - 1, lastInk / SS + Math.max(3, fs * 0.03) + r);

    return { S: S, top: top, n: n, fs: fs, r: r, base: base, cupL: cupL, cupR: cupR, hasCup: sp >= 0, tee: tee, w: W, pad: PAD, h: H, off: OFF };
  }

  function groundAt(x) {
    var f = x * SS, i = Math.floor(f);
    if (i < 0 || i >= T.n - 1) return Infinity;
    var a = T.S[i], c = T.S[i + 1];
    if (a === Infinity || c === Infinity) return Infinity;
    return a + (c - a) * (f - i);
  }
  function slopeAt(x) {
    var a = groundAt(x - 0.5), c = groundAt(x + 0.5);
    if (a === Infinity || c === Infinity) return 0;
    return c - a;
  }
  function inCup(x, y) { return T.hasCup && x > T.cupL - 0.5 && x < T.cupR + 0.5 && y > T.base - T.r - T.fs * 0.1; }   // down in the word space, not on a letter's edge above it

  /* ---------- one fixed physics step. returns "", "rest" or "out" ---------- */
  function step(p, dt) {
    var fs = T.fs, G = K.G * fs, MU = K.MU * fs;
    p.vy += G * dt;
    var nx = p.x + p.vx * dt, ny = p.y + p.vy * dt;
    var s = groundAt(nx), contact = false;
    if (ny >= s) {
      var sl = slopeAt(nx);
      // one step down a slope no steeper than WALL can only sink in this far; deeper means a letter's side
      var allowed = Math.abs(p.vx * dt) * K.WALL + Math.max(0, p.vy * dt) + 0.5;
      if (ny - s > allowed) {
        nx = p.x; p.vx = -p.vx * K.EW;
        s = groundAt(nx); sl = slopeAt(nx);
      }
      if (sl > K.WALL) sl = K.WALL; else if (sl < -K.WALL) sl = -K.WALL;
      if (ny >= s) {
        contact = true;
        var len = Math.sqrt(1 + sl * sl), tx = 1 / len, ty = sl / len, nxn = sl / len, nyn = -1 / len;
        var vn = p.vx * nxn + p.vy * nyn, vt = p.vx * tx + p.vy * ty;
        var cup = inCup(nx, s);
        if (vn < 0) {
          var hard = -vn > 0.55 * fs && !cup;
          vn = hard ? -vn * K.E : 0;
          if (hard) vt *= 0.96;
        }
        if (cup) vt *= 0.9;                               // the cup holds on to it
        var f = MU * dt; vt = Math.abs(vt) <= f ? 0 : vt - (vt > 0 ? f : -f);
        p.vx = vt * tx + vn * nxn; p.vy = vt * ty + vn * nyn;
        ny = s;
      }
    }
    p.x = nx; p.y = ny;
    // touching the screen edge counts as off the end, so the ball never rests half cut off
    if (p.y > T.base + fs * 0.25 || p.x < Math.min(T.r, T.tee - 1) || p.x > T.w - 4 - T.r) return "out";
    if (contact && Math.abs(p.vx) + Math.abs(p.vy) < 0.035 * fs) { p.still = (p.still || 0) + dt; if (p.still > 0.12) return "rest"; }
    else p.still = 0;
    return "";
  }

  // run a whole shot with no drawing (reduced motion, and the debug search)
  function simulate(from, vx, vy) {
    var p = { x: from.x, y: from.y, vx: vx, vy: vy, still: 0 }, res = "";
    for (var i = 0; i < 12 / K.DT && !res; i++) res = step(p, K.DT);
    return { end: res || "rest", x: p.x, y: p.y, sunk: res !== "out" && inCup(p.x, p.y) };
  }

  /* ---------- drawing ---------- */
  function draw() { ballEl.style.transform = "translate(" + (b.x - T.r).toFixed(2) + "px," + (b.y - T.r).toFixed(2) + "px)"; }
  function place(x) { b.x = x; b.y = groundAt(x); b.vx = b.vy = 0; b.still = 0; draw(); }

  function layout() {
    var off = T ? T.off : 0;
    layer.style.left = (mark.offsetLeft - off) + "px"; layer.style.top = mark.offsetTop + "px";
    layer.style.width = (mark.offsetWidth + 2 * off) + "px"; layer.style.height = mark.offsetHeight + "px";
  }
  function rebuild() {
    cancelAnimationFrame(raf); raf = 0; endAim();
    var t = measure();
    if (!t) { layer.style.display = "none"; return; }
    T = t; layer.style.display = "";
    layout();
    ballEl.style.width = ballEl.style.height = (T.r * 2) + "px";
    if (state === "sunk" && T.hasCup) place((T.cupL + T.cupR) / 2);
    else { state = "rest"; place(T.tee); }
    ballEl.classList.remove("is-out");
    last.x = b.x; last.y = b.y;
    if (DEBUG) debugDraw();
  }

  /* ---------- the shot ---------- */
  function tick(now) {
    raf = 0;
    if (state !== "fly") return;
    var dt = Math.min(0.05, (now - prevT) / 1000); prevT = now; acc += dt; flyT += dt;
    var res = "";
    while (acc >= K.DT && !res) { res = step(b, K.DT); acc -= K.DT; }
    if (!res && flyT > 12) res = "rest";
    draw();
    if (res) finish(res); else raf = requestAnimationFrame(tick);
  }
  function finish(res) {
    if (res === "out") {
      // off the end: the ball goes back to where the shot was taken
      state = "out"; ballEl.classList.add("is-out");
      setTimeout(function () { if (state !== "out") return; b.x = last.x; b.y = last.y; b.vx = b.vy = 0; draw(); ballEl.classList.remove("is-out"); state = "rest"; }, 220);
      return;
    }
    b.vx = b.vy = 0;
    if (inCup(b.x, b.y)) { state = "sunk"; showScore(); }
    else state = "rest";
  }
  function showScore() {
    if (!score) return;
    score.textContent = strokes === 1 ? "1 stroke" : strokes + " strokes";
    score.hidden = false;
  }
  function launch(vx, vy) {
    strokes++; last.x = b.x; last.y = b.y;
    b.vx = vx; b.vy = vy; b.still = 0;
    if (reduceMq.matches) {
      var out = simulate(b, vx, vy);
      ballEl.classList.add("is-out"); state = "out";
      setTimeout(function () {
        if (out.end === "out") { b.x = last.x; b.y = last.y; } else { b.x = out.x; b.y = out.y; }
        b.vx = b.vy = 0; draw(); ballEl.classList.remove("is-out");
        state = "rest"; if (out.end !== "out" && inCup(b.x, b.y)) { state = "sunk"; showScore(); }
      }, 200);
      return;
    }
    state = "fly"; acc = 0; flyT = 0; prevT = performance.now();
    raf = requestAnimationFrame(tick);
  }

  /* ---------- pull back and release ---------- */
  function pull(e) {
    var lr = layer.getBoundingClientRect();
    var dx = b.x - (e.clientX - lr.left), dy = b.y - (e.clientY - lr.top);   // launch direction = away from the finger
    var d = Math.sqrt(dx * dx + dy * dy), max = Math.max(90, K.PULL * T.fs);
    var p = Math.min(d, max) / max;
    return { d: d, p: p, ux: d ? dx / d : 0, uy: d ? dy / d : 0, len: Math.min(d, max) };
  }
  function endAim() { drag = null; aim.classList.remove("on"); ballEl.classList.remove("is-aim"); if (state === "aim") state = "rest"; }

  ballEl.addEventListener("pointerdown", function (e) {
    if (!T || (e.pointerType === "mouse" && e.button !== 0)) return;
    e.preventDefault();
    if (state === "sunk") {                       // play it again
      strokes = 0; if (score) score.hidden = true;
      state = "rest"; place(T.tee); last.x = b.x; last.y = b.y; return;
    }
    if (state !== "rest") return;
    state = "aim"; drag = { id: e.pointerId };
    try { ballEl.setPointerCapture(e.pointerId); } catch (err) {}
    ballEl.classList.add("is-aim");
  });
  ballEl.addEventListener("pointermove", function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var q = pull(e);
    if (q.d < 6) { aim.classList.remove("on"); return; }
    aim.style.transform = "translate(" + b.x.toFixed(1) + "px," + b.y.toFixed(1) + "px) rotate(" + Math.atan2(q.uy, q.ux).toFixed(4) + "rad) scaleX(" + q.len.toFixed(1) + ")";
    aim.classList.add("on");
  });
  ballEl.addEventListener("pointerup", function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var q = pull(e); endAim();
    if (q.d < 6) return;                          // a tap is not a stroke
    var v = q.p * K.VMAX * T.fs;
    launch(q.ux * v, q.uy * v);
  });
  ballEl.addEventListener("pointercancel", endAim);
  ballEl.addEventListener("lostpointercapture", function () { if (drag) endAim(); });
  ballEl.addEventListener("dragstart", function (e) { e.preventDefault(); });

  /* ---------- keep the ground in step with the rendered name ---------- */
  var pending = 0, sig = "";
  function schedule() {
    if (pending) return;
    pending = requestAnimationFrame(function () {
      pending = 0;
      var r = mark.getBoundingClientRect(), s = [getComputedStyle(mark).fontSize, r.width.toFixed(1), mark.offsetLeft, mark.offsetTop].join("|");
      if (s === sig) return;
      var geo = s.split("|").slice(0, 2).join("|"), old = sig.split("|").slice(0, 2).join("|");
      sig = s;
      if (geo === old && T) layout(); else rebuild();   // only moved: just follow it
    });
  }
  if (window.ResizeObserver) { var ro = new ResizeObserver(schedule); ro.observe(mark); ro.observe(footer); }
  window.addEventListener("resize", schedule);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { sig = ""; schedule(); });
  // the site sized the name before this file's CSS (phone word spacing) applied: ask it to fit again
  window.dispatchEvent(new Event("resize"));
  schedule();

  /* ---------- ?puttdebug: show the measured ground and expose the simulator ---------- */
  function debugDraw() {
    var old = layer.querySelector(".putt-debug"); if (old) old.remove();
    var cv = document.createElement("canvas"); cv.className = "putt-debug";
    cv.width = T.w * 2; cv.height = (T.h + T.pad) * 2;
    cv.style.width = T.w + "px"; cv.style.height = (T.h + T.pad) + "px"; cv.style.top = -T.pad + "px";
    var c = cv.getContext("2d"); c.scale(2, 2); c.translate(0, T.pad);
    c.fillStyle = "#ff4d5e";
    for (var i = 0; i < T.n; i++) if (T.top[i] !== Infinity) c.fillRect(i / SS, T.top[i] - 0.5, 1 / SS, 1);
    c.fillStyle = "#3ddc84";
    for (i = 0; i < T.n; i++) if (T.S[i] !== Infinity) c.fillRect(i / SS, T.S[i] - 0.5, 1 / SS, 1);
    c.fillStyle = "#4f86ff"; c.fillRect(T.cupL, T.base, T.cupR - T.cupL, 2);
    layer.insertBefore(cv, layer.firstChild);
  }
  if (DEBUG) window.__putt = {
    K: K, get T() { return T; }, get ball() { return { x: b.x, y: b.y, state: state, strokes: strokes }; },
    sim: function (power, deg, from) { var v = power * K.VMAX * T.fs, a = (deg || 0) * Math.PI / 180; return simulate(from || { x: T.tee, y: groundAt(T.tee) }, Math.cos(a) * v, -Math.sin(a) * v); },
    trace: function (power, deg) { var v = power * K.VMAX * T.fs, a = (deg || 0) * Math.PI / 180, p = { x: T.tee, y: groundAt(T.tee), vx: Math.cos(a) * v, vy: -Math.sin(a) * v, still: 0 }, o = [], res = ""; for (var i = 0; i < 2400 && !res; i++) { res = step(p, K.DT); if (i % 6 === 0) o.push(Math.round(p.x) + "," + Math.round(p.y) + "," + Math.round(p.vx) + "," + Math.round(p.vy)); } return o.join(" "); },
    groundAt: groundAt, rebuild: rebuild
  };
})();
