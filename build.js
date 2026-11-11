/* Stand-out build. Every part answers the visitor; nothing runs on its own. */
(function () {
  "use strict";
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var root = document.documentElement;
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  // each part runs on its own, so a break in one never takes the others down
  function safe(f) { try { f(); } catch (err) { if (window.console) console.error(err); } }

  /* ---------- 1. Flood: the page takes the focused project's color ----------
     1100px and up: the strip is horizontal, so the open card decides, and only while the mouse has really
     moved inside the strip or keyboard focus is in it (WHOOP is open on load and must not flood).
     A scroll that slides the strip under a still pointer does not count, and any scroll clears the color.
     Below 1100px the cards stack: the card crossing the middle of the screen decides, once it has stayed
     there 400ms without a flick, so a fast swipe shows no color at all.
     One fixed layer behind the page fades (opacity, colour); the text tokens switch in a single step.
     Reduced motion: no flood. Opening a project clears it. */
  safe(function flood() {
    var strip = document.querySelector(".pstrip"); if (!strip || reduce) return;
    var cards = [].slice.call(strip.querySelectorAll(".pcard"));
    var COLORS = { whoop: "#ffde00", veraitas: "#3dd186", cs2: "#2c5471", swap: "#e46d35" };
    var meta = document.querySelector('meta[name="theme-color"]'), base = meta ? meta.getAttribute("content") : "";
    var wide = matchMedia("(min-width: 1100px)");
    var layer = document.createElement("div"); layer.className = "flood-bg"; layer.setAttribute("aria-hidden", "true");
    document.body.insertBefore(layer, document.body.firstChild);
    var pointerIn = false, focusIn = false, mid = new Set(), stripMid = false, last = null, cur = null, t = 0, tok = 0;
    var lx = -1, ly = -1, scrolledAt = -1e4;
    function keyOf(c) { return c ? (c.getAttribute("href") || "").replace("#project/", "") : null; }
    function want() {
      if (root.classList.contains("pv-lock") || root.classList.contains("intro-on")) return null;
      if (wide.matches) return pointerIn || focusIn ? keyOf(strip.querySelector(".pcard.on")) : null;
      var c = cards.filter(function (k) { return mid.has(k); })[0];
      if (c) last = keyOf(c);
      return c ? last : stripMid ? last : null; // crossing the gap between two cards keeps the color
    }
    function tokens(k) { if (k) root.setAttribute("data-flood", k); else root.removeAttribute("data-flood"); }
    function apply() {
      var k = want(); if (!COLORS[k]) k = null;
      if (k === cur) return;
      var from = cur; cur = k; clearTimeout(tok);
      if (k) {
        if (!from) { layer.style.transition = "none"; layer.style.backgroundColor = COLORS[k]; void layer.offsetWidth; layer.style.transition = ""; }
        else layer.style.backgroundColor = COLORS[k];
        layer.classList.add("on");
      } else layer.classList.remove("on");
      // the text switches once, 60ms into the fade, so it is never dark on dark or light on light
      if (from && k) tokens(k); else tok = setTimeout(function () { tokens(cur); }, 60);
      if (meta) meta.setAttribute("content", k ? COLORS[k] : base);
    }
    // a color waits before it lands (80ms across the strip, 400ms on a stacked card); leaving is immediate
    function sync() { clearTimeout(t); t = 0; if (want()) t = setTimeout(function () { t = 0; apply(); }, wide.matches ? 80 : 400); else apply(); }

    // only a mouse that really moved counts: after a scroll the browser re-sends "move" from the same point
    window.addEventListener("pointermove", function (e) {
      if (e.pointerType !== "mouse") return;
      var moved = e.clientX !== lx || e.clientY !== ly; lx = e.clientX; ly = e.clientY;
      if (!moved || performance.now() - scrolledAt < 200) return;
      var inside = strip.contains(e.target);
      if (inside !== pointerIn) { pointerIn = inside; sync(); }
    }, { passive: true, capture: true });
    var sy = window.scrollY, st = 0;
    window.addEventListener("scroll", function () {
      var now = performance.now(), fast = now - st < 100 && Math.abs(window.scrollY - sy) / Math.max(1, now - st) > .8; sy = window.scrollY; st = now;
      scrolledAt = now; if (pointerIn) { pointerIn = false; sync(); }
      else if (fast && !wide.matches && t) sync();   // a flick (over 800px/s) is not dwelling: the wait starts again
    }, { passive: true });
    strip.addEventListener("pointerleave", function () { if (pointerIn) { pointerIn = false; sync(); } });
    root.addEventListener("pointerleave", function () { if (pointerIn) { pointerIn = false; sync(); } });
    // focus handed back by a closing project is not the visitor moving through the strip
    strip.addEventListener("focusin", function (e) { focusIn = !root.classList.contains("pv-lock") && !!(e.target.matches && e.target.matches(":focus-visible")); sync(); });
    strip.addEventListener("focusout", function (e) { if (!strip.contains(e.relatedTarget)) { focusIn = false; sync(); } });
    // the strip marks its open card with .on; follow that instead of guessing from the pointer
    var mo = new MutationObserver(sync);
    cards.forEach(function (c) { mo.observe(c, { attributes: true, attributeFilter: ["class"] }); });
    new MutationObserver(function () { if (root.classList.contains("pv-lock")) { pointerIn = false; focusIn = false; } sync(); }).observe(root, { attributes: true, attributeFilter: ["class"] });
    if (window.IntersectionObserver) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.target === strip) stripMid = e.isIntersecting; else if (e.isIntersecting) mid.add(e.target); else mid.delete(e.target); });
        if (!wide.matches) sync();
      }, { rootMargin: "-45% 0px -45% 0px" });
      cards.forEach(function (c) { io.observe(c); }); io.observe(strip);
    }
    var onMode = function () { last = null; sync(); };
    if (wide.addEventListener) wide.addEventListener("change", onMode); else if (wide.addListener) wide.addListener(onMode);
    // leaving the page (Sandbox, another tab) drops the color completely; coming back from the back/forward cache re-reads it
    window.addEventListener("pagehide", function () { clearTimeout(t); clearTimeout(tok); pointerIn = focusIn = false; cur = null; layer.classList.remove("on"); tokens(null); if (meta) meta.setAttribute("content", base); });
    window.addEventListener("pageshow", function (e) { if (e.persisted) sync(); });
  });

  /* ---------- 1b. Name: letters near the pointer swell and settle ----------
     Uses the page's own letter split (.ch). A letter grows to 1.10 at most, with no skew, and the letters
     beside it are pushed apart by exactly the width it gained, so nothing overlaps.
     Spring w=13, zeta=.8: settles in about 280ms, no visible bounce. After 500ms without movement the
     name settles back and the loop stops. The line mask is lifted only while letters are reacting (.swell).
     Mouse hover, or touch and drag on phones. Idle during the intro. Reduced motion: none. */
  safe(function name() {
    var h1 = document.getElementById("heroName"); if (!h1 || reduce) return;
    var els = h1.querySelectorAll(".ch"); if (!els.length) return;
    var K = 169, C = 20.8, MAX = .1, STILL = 500;
    var L = [].map.call(els, function (el) { return { el: el, ln: el.closest(".ln"), cx: 0, cy: 0, w: 0, s: 0, v: 0, c: 0 }; });
    var lines = []; L.forEach(function (l) { var g = lines.filter(function (q) { return q.ln === l.ln; })[0]; if (!g) lines.push(g = { ln: l.ln, ls: [] }); g.ls.push(l); });
    var fs = 100, px = 0, py = 0, active = false, raf = 0, last = 0, live = false, stillT = 0;
    function measure() {
      var b = h1.getBoundingClientRect(); fs = parseFloat(getComputedStyle(h1).fontSize) || 100;
      L.forEach(function (l) { var t = l.el.style.transform; l.el.style.transform = "none"; var r = l.el.getBoundingClientRect(); l.el.style.transform = t; l.w = r.width; l.cx = r.left + r.width / 2 - b.left; l.cy = r.top + r.height * .55 - b.top; });
    }
    function rest() { raf = 0; live = false; L.forEach(function (l) { l.s = l.v = 0; l.el.style.transform = ""; l.el.style.willChange = ""; }); h1.classList.remove("swell"); }
    function frame(now) {
      raf = 0;
      var dt = Math.min(.032, (now - last) / 1000 || .016); last = now;
      var b = h1.getBoundingClientRect(), R = fs * .44, moving = false;
      L.forEach(function (l) {
        var t = 0;
        if (active) { var dx = px - (b.left + l.cx), dy = py - (b.top + l.cy); t = MAX * Math.exp(-(dx * dx + dy * dy * .6) / (2 * R * R)); }
        l.v += (K * (t - l.s) - C * l.v) * dt; l.s += l.v * dt;
        if (Math.abs(l.v) > .004 || Math.abs(t - l.s) > .0008) moving = true;
      });
      lines.forEach(function (g) {
        // each letter is wider by w*s: its centre moves by what the letters before it gained plus half its own,
        // measured from the swollen spot, so the gaps between letters stay what they were
        var acc = 0, sw = 0, sc = 0;
        g.ls.forEach(function (l) { var e = l.w * Math.max(0, l.s); l.c = acc + e / 2; acc += e; sw += Math.max(0, l.s); sc += Math.max(0, l.s) * l.c; });
        var anchor = sw > 1e-5 ? sc / sw : 0;
        g.ls.forEach(function (l) { l.el.style.transform = "translate3d(" + (l.c - anchor).toFixed(2) + "px,0,0) scale(" + (1 + l.s).toFixed(4) + ")"; });
      });
      if (moving) raf = requestAnimationFrame(frame); else if (!active) rest();   // settled under a still pointer: stop, keep the pose
    }
    function kick() { if (!live) { live = true; measure(); h1.classList.add("swell"); L.forEach(function (l) { l.el.style.willChange = "transform"; }); } if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }
    function off() { clearTimeout(stillT); if (!active) return; active = false; if (live) kick(); }
    function at(e) { if (root.classList.contains("intro-on")) return; px = e.clientX; py = e.clientY; active = true; clearTimeout(stillT); stillT = setTimeout(off, STILL); kick(); }
    h1.addEventListener("pointermove", function (e) { if (e.pointerType === "mouse" || e.buttons || e.pointerType === "touch") at(e); }, { passive: true });
    h1.addEventListener("pointerdown", at, { passive: true });
    h1.addEventListener("pointerleave", off, { passive: true });
    h1.addEventListener("pointerup", function (e) { if (e.pointerType !== "mouse") off(); }, { passive: true });
    h1.addEventListener("pointercancel", off, { passive: true });
    // the intro replays over the hero: drop any swell at once so the letter entrance starts clean
    new MutationObserver(function () { if (root.classList.contains("intro-on") && live) { clearTimeout(stillT); active = false; if (raf) cancelAnimationFrame(raf); rest(); } }).observe(root, { attributes: true, attributeFilter: ["class"] });
  });

  /* ---------- 2. Driving the rotating word ---------- */
  safe(function word() {
    var focus = document.querySelector(".focus"), R = window.__rot;
    if (!focus || !R) return;
    function label() { focus.setAttribute("aria-valuenow", String(R.get() + 1)); focus.setAttribute("aria-valuetext", R.words[R.get()]); }
    focus.setAttribute("tabindex", "0"); focus.setAttribute("role", "slider"); focus.setAttribute("aria-label", "Focus area");
    focus.setAttribute("aria-valuemin", "1"); focus.setAttribute("aria-valuemax", String(R.n)); label();
    function pick(e) { var b = focus.getBoundingClientRect(); return clamp(Math.floor((e.clientX - b.left) / b.width * R.n), 0, R.n - 1); }
    function take(k) { focus.classList.add("driven"); R.drive(k); label(); }
    var relT = 0, sx = null, slid = false;
    function letGo(ms) { clearTimeout(relT); relT = setTimeout(function () { focus.classList.remove("driven"); R.release(); }, ms); }
    focus.addEventListener("pointermove", function (e) {
      if (e.pointerType === "mouse") { clearTimeout(relT); take(pick(e)); return; }
      if (sx !== null && (slid || Math.abs(e.clientX - sx) > 8)) { slid = true; take(pick(e)); }
    }, { passive: true });
    focus.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse") letGo(0); }, { passive: true });
    focus.addEventListener("pointerdown", function (e) { if (e.pointerType !== "mouse") { clearTimeout(relT); sx = e.clientX; slid = false; } }, { passive: true });
    focus.addEventListener("pointerup", function (e) { if (e.pointerType === "mouse" || sx === null) return; if (!slid) take((R.get() + 1) % R.n); sx = null; letGo(4000); }, { passive: true });
    focus.addEventListener("pointercancel", function () { if (sx === null) return; sx = null; letGo(4000); }, { passive: true });
    focus.addEventListener("keydown", function (e) { var d = e.key === "ArrowRight" || e.key === "ArrowUp" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -1 : 0; if (!d) return; e.preventDefault(); clearTimeout(relT); take((R.get() + d + R.n) % R.n); });
    // keyboard focus holds the word still, so a screen reader is not read a new value every few seconds
    focus.addEventListener("focus", function () { clearTimeout(relT); take(R.get()); });
    focus.addEventListener("keydown", function (e) { if (e.key !== "Home" && e.key !== "End") return; e.preventDefault(); clearTimeout(relT); take(e.key === "Home" ? 0 : R.n - 1); });
    focus.addEventListener("blur", function () { letGo(0); });
  });

  /* ---------- 3. Swap: drag a day, the rest of the week rebalances (app/core.js dailyPlan, sample numbers) ---------- */
  safe(function swap() {
    var art = document.querySelector(".pc-sw"); if (!art) return;
    var UNIT = .047, MAX = 80, SPENT = 22;
    var days = [].slice.call(art.querySelectorAll(".sw-day:not(.past)")).map(function (el) {
      var cap = el.querySelector(".sw-cap"), h = parseFloat(cap.style.getPropertyValue("--h")), plan = Math.round(h / UNIT), fill = cap.querySelector("i");
      cap.classList.add("sw-win"); var pill = document.createElement("span"); pill.className = "sw-pill"; cap.insertBefore(pill, cap.firstChild);
      if (fill) fill.style.height = (SPENT * UNIT) + "em";
      var pills = [pill];
      if (el.classList.contains("on")) { var ring = document.createElement("span"); ring.className = "sw-ring"; var rp = document.createElement("span"); rp.className = "sw-pill"; ring.appendChild(rp); el.querySelector(".sw-bar").appendChild(ring); pills.push(rp); }
      el.classList.add("can");
      return { el: el, cap: cap, pills: pills, plan: plan, floor: Math.ceil(plan * .5), amt: el.querySelector(".sw-amt"), today: el.classList.contains("on") };
    });
    if (!days.length) return;
    var POOL = days.reduce(function (a, d) { return a + d.plan; }, 0);
    var card = art.querySelector(".sw-td"), left = card.querySelector(".sw-big"), of = card.querySelector(".sw-td-top .sw-t2"), meter = card.querySelector(".sw-meter i");
    function render() {
      days.forEach(function (d) {
        var off = "translateY(" + (3.76 - d.plan * UNIT).toFixed(3) + "em)"; d.pills.forEach(function (p) { p.style.transform = off; }); if (!d.today) d.amt.textContent = "$" + d.plan;
        if (d.today) { left.textContent = "$" + (d.plan - SPENT); of.textContent = "Spent $" + SPENT + " of $" + d.plan; if (art.classList.contains("sw-live")) meter.style.transform = "scaleX(" + (SPENT / d.plan).toFixed(3) + ")"; }
      });
    }
    // what's left is shared by weight, never below half a day's first plan (dailyPlan), and sums back to the same total
    function rebalance(d, v, w) {
      var others = days.filter(function (o) { return o !== d; }), minV = Math.max(d.floor, POOL - others.length * MAX), maxV = Math.min(MAX, POOL - others.reduce(function (a, o) { return a + o.floor; }, 0));
      d.plan = Math.round(clamp(v, minV, maxV));
      var rest = POOL - d.plan, free = others.slice(), val = {}, guard = 0;
      while (free.length && guard++ < 6) {
        var wr = free.reduce(function (a, o) { return a + w.get(o); }, 0) || 1, hit = false;
        free.forEach(function (o) { val[days.indexOf(o)] = rest * w.get(o) / wr; });
        free = free.filter(function (o) { var x = val[days.indexOf(o)], c = clamp(x, o.floor, MAX); if (c !== x) { val[days.indexOf(o)] = c; rest -= c; hit = true; return false; } return true; });
        if (!hit) break;
      }
      var fl = others.map(function (o) { var x = val[days.indexOf(o)]; return { o: o, f: Math.floor(x), r: x - Math.floor(x) }; }), need = POOL - d.plan - fl.reduce(function (a, q) { return a + q.f; }, 0);
      fl.sort(function (a, b) { return b.r - a.r; }).forEach(function (q, i) { q.o.plan = q.f + (i < need ? 1 : 0); });
      render();
    }
    render();
    /* Mouse: press and drag (3px). Touch: the bars let the page scroll (pan-y); a 250ms hold picks the bar up,
       and a tap raises that day by $5 (back to its lowest after the top). Only the click that follows a drag
       or a tap on a bar is swallowed, for 400ms, so the next tap on the card still opens the project. */
    var HOLD = 250, SLOP = 8, STEP = 5, quiet = 0;
    function liveOn() { art.classList.add("sw-live"); meter.style.width = "100%"; }
    function weights() { return new Map(days.map(function (o) { return [o, o.plan]; })); }
    function step(d) { var was = d.plan, w = weights(); liveOn(); rebalance(d, was + STEP, w); if (d.plan === was) rebalance(d, 0, w); }
    days.forEach(function (d) {
      var y0 = 0, x0 = 0, ly = 0, v0 = 0, per = 1, w = null, on = false, armed = false, moved = false, touch = false, holdT = 0;
      function begin() { armed = true; y0 = ly; v0 = d.plan; w = weights(); d.el.classList.add("drag"); liveOn(); }
      function drop() { clearTimeout(holdT); on = armed = false; d.el.classList.remove("drag"); }
      d.el.addEventListener("pointerdown", function (e) {
        if (e.button) return; drop();
        on = true; moved = false; touch = e.pointerType !== "mouse"; x0 = e.clientX; y0 = ly = e.clientY; per = d.cap.getBoundingClientRect().height / (3.76 / UNIT);
        if (touch) holdT = setTimeout(function () { if (on) begin(); }, HOLD);
        else { try { d.el.setPointerCapture(e.pointerId); } catch (err) {} }
      });
      d.el.addEventListener("pointermove", function (e) {
        if (!on) return; ly = e.clientY;
        if (!armed) {
          if (touch) { if (Math.abs(e.clientY - y0) > SLOP || Math.abs(e.clientX - x0) > SLOP) drop(); return; }   // moved before the hold: it is a scroll
          if (Math.abs(y0 - e.clientY) < 3) return; begin();
        }
        moved = true; rebalance(d, v0 + (y0 - e.clientY) / per, w);
      });
      // once the bar is picked up the page must not scroll under the finger
      d.el.addEventListener("touchmove", function (e) { if (armed && e.cancelable) e.preventDefault(); }, { passive: false });
      d.el.addEventListener("contextmenu", function (e) { if (touch) e.preventDefault(); });
      d.el.addEventListener("pointerup", function () {
        if (!on) return;
        if (armed) { if (moved || touch) quiet = performance.now() + 400; }
        else if (touch) { step(d); quiet = performance.now() + 400; }
        drop();
      });
      d.el.addEventListener("pointercancel", drop);
    });
    // the card is a link: a drag or a tap on a bar must not open the project, and a native link drag would cancel the pointer
    art.addEventListener("click", function (e) { if (performance.now() < quiet) { e.preventDefault(); e.stopPropagation(); } quiet = 0; }, true);
    var link = art.closest("a"); if (link) { link.draggable = false; link.addEventListener("dragstart", function (e) { e.preventDefault(); }); }
  });

  /* ---------- 4. CS2: scrub the chart ----------
     Real series: the project's scoring API snapshot for map 2392777-1 (ex-Zero Tenacity v RUSTEC, de_overpass,
     20 rounds, model logit-v1): rounds[].market_p, rounds[].model_p, alerts[0].span = [17, 18].
     The readout shows the number the alert rule uses and the chart prints ("+15.7 pts over its own baseline"):
       over(r) = (market_p[r] - model_p[r]) - (market_p[1] - model_p[1])
     the market-minus-model gap at round r, less the same gap at the opening round (-12.14 pts here).
     Round 17: (9.5 - 5.99) + 12.14 = +15.7. Round 18: (45.0 - 14.94) + 12.14 = +42.2. The rule is 15 pts.
     The Wildcard v NOMERCY chart (match 9000004) has no per-round series in the snapshot, so it is not scrubbable. */
  safe(function cs2() {
    var SETS = {
      "cs2-alert-low.jpg": { x1: 81, dx: 69.28, span: [17, 18],
        m: [0.445, 0.445, 0.33, 0.545, 0.305, 0.27, 0.24, 0.21, 0.135, 0.15, 0.205, 0.28, 0.31, 0.25, 0.115, 0.12, 0.095, 0.45, 0.055, 0.08],
        o: [0.5664, 0.4329, 0.6091, 0.4619, 0.3539, 0.2492, 0.359, 0.2141, 0.2003, 0.3483, 0.4744, 0.4745, 0.359, 0.2492, 0.194, 0.1025, 0.0599, 0.1494, 0.2642, 0.1144] }
    }, W = 1440, H = 612, Y100 = 164, Y0 = 381;
    function pct(v) { return (v * 100).toFixed(1); }
    function over(S, i) { var t = Math.round(((S.m[i] - S.o[i]) - (S.m[0] - S.o[0])) * 1000 + 1e-6); return (t > 0 ? "+" : t < 0 ? "-" : "") + (Math.abs(t) / 10).toFixed(1); }
    Object.keys(SETS).forEach(function (f) {
      var img = document.querySelector('figure img[src="' + f + '"]'); if (!img) return;
      var S = SETS[f], n = S.m.length, wrap = document.createElement("span"); wrap.className = "scrub"; img.parentNode.insertBefore(wrap, img); wrap.appendChild(img);
      function mk(c, tag) { var e = document.createElement(tag || "i"); e.className = c; wrap.appendChild(e); return e; }
      var hit = mk("scrub-hit", "span"), line = mk("scrub-line"), dm = mk("scrub-dot m"), dov = mk("scrub-dot o"), chip = mk("scrub-chip", "span");
      hit.tabIndex = 0; hit.setAttribute("role", "slider"); hit.setAttribute("aria-label", "Round"); hit.setAttribute("aria-valuemin", "1"); hit.setAttribute("aria-valuemax", String(n)); hit.setAttribute("aria-valuenow", "1");
      var cap = img.closest("figure").querySelector("figcaption"), hint = document.createElement("span"); hint.className = "scrub-hint";
      hint.textContent = matchMedia("(hover: hover) and (pointer: fine)").matches ? "Hover the chart to read each round." : "Drag across the chart to read each round."; if (cap) cap.appendChild(hint);
      // phones: the same hint sits in the readout's empty slot under the chart until the chart is first touched
      var tip = mk("scrub-tip caps-s muted", "span"); tip.textContent = hint.textContent;
      function used() { wrap.classList.add("used"); }
      var r = 0, phone = matchMedia("(max-width: 760px)");
      function chipHTML(i) {
        var alert = i + 1 >= S.span[0] && i + 1 <= S.span[1];
        return "<b>Round " + (i + 1) + "</b><span>Market " + pct(S.m[i]) + "%</span><span>Model " + pct(S.o[i]) + "%</span><span>" + over(S, i) + " pts vs baseline</span>" + (alert ? '<span class="al">Alert span</span>' : "");
      }
      function place() {
        if (!r) return; var i = r - 1, k = wrap.clientWidth / W, ky = img.clientHeight / H, x = (S.x1 + i * S.dx) * k, ym = (Y0 - S.m[i] * (Y0 - Y100)) * ky, yo = (Y0 - S.o[i] * (Y0 - Y100)) * ky;
        line.style.height = (Y0 - 143) * ky + "px"; line.style.transform = "translate(" + x + "px," + 143 * ky + "px)";
        dm.style.transform = "translate(" + x + "px," + ym + "px)"; dov.style.transform = "translate(" + x + "px," + yo + "px)";
        chip.innerHTML = chipHTML(i);
        if (!phone.matches) { var cw = chip.offsetWidth, cx = clamp(x - cw / 2, 6, wrap.clientWidth - cw - 6); chip.style.transform = "translate(" + cx + "px," + Math.max(4, 143 * ky - chip.offsetHeight - 4) + "px)"; } else chip.style.transform = "";
        hit.setAttribute("aria-valuenow", String(r)); hit.setAttribute("aria-valuetext", "Round " + r + ", market " + pct(S.m[i]) + " percent, model " + pct(S.o[i]) + " percent, " + over(S, i).replace("-", "minus ").replace("+", "plus ") + " points against the opening gap");
      }
      function setR(v) { v = clamp(v, 1, n); if (v === r && wrap.classList.contains("on")) return; r = v; place(); wrap.classList.add("on"); }
      function fromX(e) { var b = wrap.getBoundingClientRect(), x = (e.clientX - b.left) / b.width * W; setR(Math.round((x - S.x1) / S.dx) + 1); }
      hit.addEventListener("pointermove", function (e) { if (e.pointerType === "mouse" || e.buttons || e.pointerType === "touch") fromX(e); }, { passive: true });
      hit.addEventListener("pointerdown", function (e) { used(); fromX(e); }, { passive: true });
      hit.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse") wrap.classList.remove("on"); }, { passive: true });
      hit.addEventListener("keydown", function (e) { var d = e.key === "ArrowRight" || e.key === "ArrowUp" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -1 : 0; if (!d) return; e.preventDefault(); used(); setR((r || 0) + d); });
      hit.addEventListener("blur", function () { wrap.classList.remove("on"); });
      if (window.ResizeObserver) new ResizeObserver(place).observe(wrap);
    });
  });
})();
