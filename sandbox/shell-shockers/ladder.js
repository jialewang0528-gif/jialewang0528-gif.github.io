/* Shell Shockers ladder: a pinned, scroll-driven re-sort of every ranked player.
   Data: ladder.json (anonymous ids only; window.SBX_LADDER from ladder.data.js on file://).
   Steps 0 and 3 are real (kills, final index). Steps 1-2 are a straight blend between them,
   so the captions there stay generic. The top 5 of the final order are always covered by
   the ??? band before anything in them can be read. Transform/opacity only. */
(function () {
  "use strict";
  var d = document, w = window;
  var mount = d.getElementById("ladder");
  if (!mount) return;

  var CAPS = [
    "Here's every ranked player, by kills.",
    "Snipers and point players get judged differently.",
    "Players with only a few games get pulled toward average.",
    "Bigger games count more.",
    "see where I landed"
  ];
  var AXIS = ["bar = total kills", "bar = kills, slowly turning into the index score", "bar = kills, slowly turning into the index score", "bar = index score", "bar = index score"];
  var TAGS = ["Step 1 / 4", "Step 2 / 4", "Step 3 / 4", "Step 4 / 4", "Final"];
  var GHOST = ["01", "02", "03", "04", "??"];
  var INDEX_URL = "https://coop-kings.vercel.app";
  var SUMMARY = "A bar chart of every ranked Shell League King of the Coop player, no names. " +
    "It starts ranked by total kills, where my bar is on top. Then the bars re-sort as snipers and point players get judged differently, " +
    "as players with only a few games get pulled toward average, and as bigger games count more. " +
    "At the end the top five spots are hidden behind a question-mark band, and I'm somewhere in there. The full ranking is in the Shell Shockers Index.";

  var reduce = w.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var mqPhone = w.matchMedia("(max-width: 760px)");

  /* ---------- styles (scoped) ---------- */
  var css = [
    "#ladder{--lad-v:#7A3CFA;--lad-vd:#4B1FA8;--lad-vt:#9B6BFF;--lad-ink:#ebe8e1;--lad-bar:#3a3843;--lad-row:18px;--lad-seg:50svh;position:relative;margin-top:clamp(48px,7vw,96px);--lad-top:72px}",
    "#ladder *{box-sizing:border-box}",
    "#ladder .lad-track{position:relative;height:calc(100svh + var(--lad-seg) * 5)}",
    "#ladder .lad-stage{position:sticky;top:var(--lad-top);z-index:1;height:calc(100svh - 92px);min-height:520px;display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:clamp(24px,4vw,64px);align-items:center;contain:layout}",
    /* side: ticks, ghost numeral, lower third, cta */
    "#ladder .lad-side{position:relative;display:grid;gap:22px;align-content:center;min-height:0}",
    "#ladder .pin-js{position:absolute;left:0;right:0;top:0}",
    "#ladder .pin-js.pin-on{position:fixed;top:var(--lad-top)}",
    "#ladder .pin-js.pin-after{top:auto;bottom:0}",
    "#ladder .lad-ticks{display:flex;gap:6px;max-width:260px}",
    "#ladder .lad-ticks i{position:relative;flex:1;height:4px;border-radius:2px;background:rgba(235,232,225,.14);overflow:hidden}",
    "#ladder .lad-ticks b{position:absolute;inset:0;background:var(--lad-v);transform-origin:0 50%;transform:scaleX(0)}",
    "#ladder .lad-done .lad-ticks b{box-shadow:0 0 12px rgba(122,60,250,.9)}",
    "#ladder .lad-ghost{position:relative;height:.74em;margin:0 0 -4px -.04em;font:italic 400 clamp(140px,14vw,210px)/.8 var(--serif,Georgia,serif);letter-spacing:-.04em;color:transparent;-webkit-text-stroke:1.2px rgba(155,107,255,.55);pointer-events:none;user-select:none}",
    "#ladder .lad-ghost span{display:block;white-space:nowrap}",
    "#ladder .lad-l3{position:relative;z-index:1;overflow:hidden;padding:14px 18px 18px;background:rgba(13,12,16,.94);box-shadow:inset 0 0 0 1px rgba(235,232,225,.08);max-width:420px}",
    "#ladder .lad-l3::before{content:'';position:absolute;left:0;right:0;top:0;height:2px;background:var(--lad-v)}",
    "#ladder .lad-wipe{position:absolute;inset:0;background:var(--lad-v);transform:scaleX(0);transform-origin:0 50%;z-index:2;pointer-events:none}",
    "#ladder .lad-tag{display:block;color:var(--lad-vt);font:800 11px/14px var(--sans);letter-spacing:.16em;text-transform:uppercase;margin-bottom:8px}",
    "#ladder .lad-cap{margin:0;font:800 clamp(24px,2.5vw,36px)/1.08 var(--sans);letter-spacing:-.025em;color:#fff;text-wrap:balance}",
    "#ladder .lad-l3.end .lad-cap{font-size:clamp(30px,3.4vw,48px)}",
    "#ladder .lad-cta-wrap{position:relative;z-index:1;opacity:0;transform:translateY(14px);transition:opacity 300ms var(--ease-out),transform 500ms var(--ease-out);pointer-events:none}",
    "#ladder .lad-done .lad-cta-wrap{opacity:1;transform:none;pointer-events:auto;transition-delay:250ms}",
    "#ladder .lad-cta-wrap .cta{box-shadow:inset 0 0 0 1px var(--lad-v),0 0 40px -10px rgba(122,60,250,.7)}",
    /* chart */
    "#ladder .lad-chart{position:relative;min-height:0;align-self:center}",
    "#ladder .lad-axis{display:flex;justify-content:space-between;gap:12px;margin:0 0 12px 34px;color:#9d9a93;font:700 11px/14px var(--sans);letter-spacing:.14em;text-transform:uppercase}",
    "#ladder .lad-axis span{transition:opacity 200ms ease}",
    "#ladder .lad-plot{position:relative;height:calc(var(--lad-n) * var(--lad-row))}",
    "#ladder .lad-nums{position:absolute;left:0;top:0;width:26px}",
    "#ladder .lad-nums span{position:absolute;right:0;top:calc(var(--lad-row) * var(--i));height:var(--lad-row);display:flex;align-items:center;font:700 11px/1 var(--sans);color:#6f6d68;font-variant-numeric:tabular-nums;transition:opacity 200ms ease}",
    "#ladder .lad-rows{position:absolute;left:34px;right:64px;top:0;bottom:0}",
    "#ladder .lad-rows::before{content:'';position:absolute;left:-1px;top:-4px;bottom:-4px;width:1px;background:rgba(235,232,225,.18)}",
    "#ladder .lad-row{position:absolute;left:0;right:0;top:0;height:var(--lad-row);display:flex;align-items:center;will-change:transform;transition:transform 820ms var(--ease-out),opacity 220ms ease}",
    "#ladder .lad-bar{position:relative;display:block;width:100%;height:calc(var(--lad-row) * .56);min-height:6px;border-radius:2px;background:var(--lad-bar);transform-origin:0 50%;transition:transform 820ms var(--ease-out);overflow:hidden}",
    "#ladder .lad-bar b{position:absolute;inset:0;background:linear-gradient(90deg,rgba(235,232,225,0),rgba(235,232,225,.75));opacity:0}",
    "#ladder .lad-row.me{z-index:3}",
    "#ladder .lad-row.me .lad-bar{background:linear-gradient(90deg,var(--lad-vd),var(--lad-v) 55%,var(--lad-vt));box-shadow:0 0 18px rgba(122,60,250,.55)}",
    "#ladder .lad-me{position:absolute;left:0;top:50%;margin-top:-10px;height:20px;padding:0 8px;border-radius:999px;background:var(--lad-v);color:#fff;font:800 11px/20px var(--sans);letter-spacing:.14em;text-transform:uppercase;white-space:nowrap;transition:transform 820ms var(--ease-out);box-shadow:0 0 16px rgba(122,60,250,.6)}",
    /* ??? band */
    "#ladder .lad-band{position:absolute;left:-4px;right:0;top:calc(var(--lad-row) * -.25);height:calc(var(--lad-row) * 5.25);z-index:5;border-radius:6px;overflow:hidden;display:flex;align-items:center;justify-content:space-between;padding:0 18px 0 22px;",
    "background:linear-gradient(90deg,#2a1170 0%,#5326c9 48%,#3a179a 100%);box-shadow:inset 0 0 0 1px rgba(155,107,255,.75),0 0 46px -8px rgba(122,60,250,.75);transform:scaleY(0);transform-origin:50% 0;transition:transform 300ms cubic-bezier(.2,1.25,.4,1)}",
    "#ladder .lad-band::before{content:'';position:absolute;inset:0;background:repeating-linear-gradient(to bottom,rgba(235,232,225,.10) 0 1px,transparent 1px 3px);pointer-events:none}",
    "#ladder .lad-band::after{content:'';position:absolute;top:-20%;bottom:-20%;left:0;width:34%;background:linear-gradient(90deg,transparent,rgba(217,201,255,.42),transparent);transform:translateX(-120%) skewX(-18deg);pointer-events:none}",
    "#ladder .lad-flashl{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none}",
    "#ladder .is-band .lad-band{transform:scaleY(1)}",
    "#ladder.live .is-band .lad-band::after{animation:ladSheen 3.4s cubic-bezier(.45,0,.55,1) 400ms infinite}",
    "@keyframes ladSheen{0%{transform:translateX(-120%) skewX(-18deg)}34%,100%{transform:translateX(420%) skewX(-18deg)}}",
    "#ladder .lad-q{position:relative;display:grid;font:900 clamp(40px,4.6vw,64px)/.9 var(--sans);letter-spacing:-.02em}",
    "#ladder .lad-q span{grid-area:1/1}",
    "#ladder .lad-q .bk{color:#160a3d;transform:translate(.06em,.06em)}",
    "#ladder .lad-q .fr{color:#fff}",
    "#ladder .lad-in{position:relative;display:flex;align-items:center;gap:8px;color:#fff;font:800 11px/14px var(--sans);letter-spacing:.14em;text-transform:uppercase}",
    "#ladder .lad-in i{display:block;width:8px;height:8px;border-radius:50%;background:#fff;box-shadow:0 0 10px #fff}",
    /* no transitions while laying out */
    "#ladder .lad-still .lad-row,#ladder .lad-still .lad-bar,#ladder .lad-still .lad-me,#ladder .lad-still .lad-band{transition:none!important}",
    /* phone */
    "@media (max-width:760px){",
    "#ladder{--lad-seg:40svh;--lad-top:68px}",
    "#ladder .lad-stage{height:calc(100svh - 80px);min-height:480px;grid-template-columns:minmax(0,1fr);grid-template-rows:auto minmax(0,1fr);align-items:start;gap:16px;padding-top:6px}",
    "#ladder .lad-side{gap:12px;position:static}",
    "#ladder .lad-ghost{position:absolute;right:0;top:-2px;height:auto;margin:0;font-size:64px;line-height:1;-webkit-text-stroke:1px rgba(155,107,255,.6)}",
    "#ladder .lad-chart{align-self:start}",
    "#ladder .lad-axis span+span{display:none}",
    "#ladder .lad-ticks{max-width:58%;margin-top:6px}",
    "#ladder .lad-l3{padding:10px 14px 14px;max-width:none;margin-right:0;margin-top:30px}",
    "#ladder .lad-cap{font-size:22px}",
    "#ladder .lad-l3.end .lad-cap{font-size:28px}",
    "#ladder .lad-cta-wrap{position:absolute;left:0;right:0;bottom:6px;z-index:6;display:flex;justify-content:center}",
    "#ladder .lad-cta-wrap .cta{height:52px;padding:0 22px 0 24px;font-size:13px}",
    "#ladder .lad-rows{right:44px}",
    "#ladder .lad-axis{margin-bottom:8px}",
    "#ladder .lad-band{padding:0 12px 0 16px}",
    "}",
    /* reduced motion: three static frames */
    "#ladder .lad-frames{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(20px,3vw,40px)}",
    "#ladder .lad-frame .lad-l3{max-width:none;margin-bottom:16px;min-height:150px}",
    "#ladder .lad-frame .lad-axis span+span{display:none}",
    "#ladder .lad-frame .cta{height:52px;padding:0 22px 0 24px;font-size:13px;white-space:nowrap}",
    "#ladder .lad-frame .lad-cap{font-size:clamp(18px,1.6vw,22px)}",
    "#ladder .lad-frame .lad-rows{right:46px}",
    "#ladder .lad-frame .lad-q{font-size:34px}",
    "#ladder .lad-frame .lad-band{transform:none}",
    "#ladder .lad-frame .lad-cta-wrap{opacity:1;transform:none;pointer-events:auto;margin-top:22px}",
    "@media (max-width:760px){#ladder .lad-frames{grid-template-columns:minmax(0,1fr);gap:44px}#ladder .lad-frame .lad-l3{min-height:0}#ladder .lad-frame .lad-cta-wrap{position:static}}"
  ].join("\n");
  var st = d.createElement("style"); st.id = "ladder-css"; st.textContent = css; d.head.appendChild(st);

  function h(tag, cls, parent, text) {
    var n = d.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; if (parent) parent.appendChild(n); return n;
  }

  /* ---------- data ---------- */
  function load(cb) {
    if (w.SBX_LADDER) return cb(w.SBX_LADDER);
    function viaScript() {
      var sc = d.createElement("script"); sc.src = "ladder.data.js";
      sc.onload = function () { if (w.SBX_LADDER) cb(w.SBX_LADDER); };
      sc.onerror = function () { sc.remove(); };
      d.head.appendChild(sc);
    }
    if (location.protocol === "file:" || !w.fetch) return viaScript();
    fetch("ladder.json", { cache: "no-cache" }).then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(cb, viaScript);
  }

  // rows for this viewport; positions re-derived inside the subset (phone keeps the final top 20, his row included)
  function prep(data, phone) {
    var rows = data.rows.slice();
    if (phone) rows = rows.filter(function (r) { return r.pos[3] <= 20 || r.me; });
    rows = rows.map(function (r) { return { id: r.id, me: !!r.me, k: r.k, s: r.s.slice(), pos: [0, 0, 0, 0], src: r.pos }; });
    for (var si = 0; si < 4; si++) {
      var sorted = rows.slice().sort(function (a, b) { return a.src[si] - b.src[si]; });
      sorted.forEach(function (r, i) { r.pos[si] = i + 1; });
    }
    return rows;
  }

  /* ---------- shared chart builder ---------- */
  function buildChart(parent, n) {
    var chart = h("div", "lad-chart", parent);
    var axis = h("div", "lad-axis", chart); var axL = h("span", "", axis); h("span", "", axis, "longer = higher");
    var plot = h("div", "lad-plot", chart); plot.style.setProperty("--lad-n", n);
    var nums = h("div", "lad-nums", plot), numEls = [];
    for (var i = 0; i < n; i++) { var s = h("span", "", nums, String(i + 1)); s.style.setProperty("--i", i); numEls.push(s); }
    var rowsEl = h("div", "lad-rows", plot);
    var band = h("div", "lad-band", plot);
    var q = h("div", "lad-q", band); h("span", "bk", q, "???"); h("span", "fr", q, "???");
    var inn = h("div", "lad-in", band); h("i", "", inn); h("span", "", inn, "me, somewhere in here");
    var flash = h("div", "lad-flashl", band);
    return { chart: chart, axis: axL, plot: plot, nums: numEls, rowsEl: rowsEl, band: band, flash: flash };
  }
  function buildRows(c, rows) {
    rows.forEach(function (r) {
      var el = h("div", "lad-row" + (r.me ? " me" : ""), c.rowsEl);
      var bar = h("i", "lad-bar", el); r.flash = h("b", "", bar);
      r.el = el; r.bar = bar;
      if (r.me) r.tag = h("span", "lad-me", el, "me");
    });
  }
  function ctaWrap(parent, focusable) {
    var wrap = h("div", "lad-cta-wrap", parent);
    var a = h("a", "cta", wrap); a.href = INDEX_URL; a.target = "_blank"; a.rel = "noopener";
    a.appendChild(d.createTextNode("Open the Shell Shockers Index "));
    var arr = h("span", "arr", a, "↗"); arr.setAttribute("aria-hidden", "true");
    if (!focusable) { a.tabIndex = -1; wrap.setAttribute("aria-hidden", "true"); }
    return { wrap: wrap, a: a };
  }
  function l3(parent, tag, cap) {
    var box = h("div", "lad-l3", parent);
    var inner = h("div", "lad-l3-in", box);
    var t = h("span", "lad-tag", inner, tag); var c = h("p", "lad-cap", inner, cap);
    var wipe = h("span", "lad-wipe", box);
    return { box: box, inner: inner, tag: t, cap: c, wipe: wipe };
  }

  /* ---------- reduced motion: three static frames ---------- */
  function staticFrames(data) {
    var phone = mqPhone.matches, rows0 = prep(data, phone), n = rows0.length;
    var fig = h("figure", "lad-frames", mount); fig.style.margin = "0";
    fig.setAttribute("aria-label", SUMMARY);
    var frames = [
      { step: 0, tag: "Step 1 / 4", cap: CAPS[0] },
      { step: 2, tag: "Steps 2 and 3", cap: "Snipers and point players get judged differently. Players with only a few games get pulled toward average." },
      { step: 3, tag: "Step 4 / 4", cap: CAPS[3] + " See where I landed.", band: true }
    ];
    frames.forEach(function (f) {
      var col = h("div", "lad-frame", fig); col.setAttribute("aria-hidden", "true");
      l3(col, f.tag, f.cap);
      var c = buildChart(col, n), rows = prep(data, phone);
      c.chart.setAttribute("aria-hidden", "true");
      c.axis.textContent = AXIS[f.step];
      buildRows(c, rows);
      var rh = phone ? 22 : 13; c.plot.style.setProperty("--lad-row", rh + "px");
      var tw = c.rowsEl.getBoundingClientRect().width || 300;
      rows.forEach(function (r) {
        var p = r.pos[f.step], hidden = f.band && p <= 5;
        r.el.style.transform = "translate3d(0," + ((p - 1) * rh) + "px,0)";
        r.bar.style.transform = "scaleX(" + r.s[f.step] + ")";
        if (r.tag) r.tag.style.transform = "translateX(" + Math.round(r.s[f.step] * tw + 8) + "px)";
        if (hidden) r.el.style.opacity = "0";
      });
      if (f.band) { c.band.style.transform = "none"; c.nums.slice(0, 5).forEach(function (s) { s.style.opacity = "0"; }); }
      else c.band.remove();
      if (f.band) { col.removeAttribute("aria-hidden"); ctaWrap(col, true); }
    });
    // screen readers: the figure label carries the story; the visual frames are hidden from AT
  }

  /* ---------- scroll-driven ---------- */
  function scrolly(data) {
    var phone = mqPhone.matches, rows = prep(data, phone), n = rows.length;
    var track = h("div", "lad-track", mount);
    var stage = h("div", "lad-stage lad-still", track);
    stage.setAttribute("role", "group"); stage.setAttribute("aria-roledescription", "chart");
    stage.setAttribute("aria-label", "Shell League ranking chart");
    var sr = h("p", "sr", stage, SUMMARY);
    var side = h("div", "lad-side", stage);
    var ghost = h("div", "lad-ghost", side); ghost.setAttribute("aria-hidden", "true");
    var ghostSpan = h("span", "", ghost, GHOST[0]);
    var ticks = h("div", "lad-ticks", side), tickFills = [];
    for (var i = 0; i < 4; i++) { var t = h("i", "", ticks); tickFills.push(h("b", "", t)); }
    ticks.setAttribute("aria-hidden", "true");
    var cap = l3(side, TAGS[0], CAPS[0]); cap.box.setAttribute("aria-hidden", "true");
    var cta = ctaWrap(side, false);
    var c = buildChart(stage, n); c.chart.setAttribute("aria-hidden", "true");
    buildRows(c, rows);

    // sticky dies under any scrolling/hidden ancestor (this page's body has overflow-x:hidden),
    // so fall back to fixed pinning toggled from the same scroll frame
    var jsPin = (function () {
      for (var e = mount.parentElement; e && e !== d.documentElement; e = e.parentElement) {
        var cs = getComputedStyle(e);
        if (!/^(visible|clip)$/.test(cs.overflowX) || !/^(visible|clip)$/.test(cs.overflowY)) return true;
      }
      return false;
    })();
    if (jsPin) stage.classList.add("pin-js");
    var pinMode = "";
    function pin(p) {
      if (!jsPin) return;
      var m = p <= 0 ? "" : p >= 1 ? "after" : "on";
      if (m === pinMode) return;
      pinMode = m;
      stage.classList.toggle("pin-on", m === "on");
      stage.classList.toggle("pin-after", m === "after");
      if (m === "on") { var r = track.getBoundingClientRect(); stage.style.left = r.left + "px"; stage.style.width = r.width + "px"; }
      else { stage.style.left = ""; stage.style.width = ""; }
    }

    var rowH = 18, trackW = 300, cur = -1, live = false, raf = 0, lastP = -1, timers = [];
    var canAnim = typeof Element.prototype.animate === "function";

    function measure() {
      var plotTop = c.plot.getBoundingClientRect().top - stage.getBoundingClientRect().top;
      var avail = stage.clientHeight - plotTop - 8;
      if (phone) avail -= 72; // room for the end-state button under the chart
      rowH = Math.max(phone ? 16 : 12, Math.min(phone ? 26 : 24, Math.floor(avail / n)));
      mount.style.setProperty("--lad-row", rowH + "px");
      trackW = c.rowsEl.getBoundingClientRect().width;
    }
    function clearTimers() { timers.forEach(clearTimeout); timers = []; }
    function later(fn, ms) { timers.push(setTimeout(fn, ms)); }

    // one place writes each row's transform + opacity (and both delays)
    function setRows(step, opts) {
      var si = Math.min(step, 3), band = step >= 3, prevBand = opts.prevBand;
      var instant = opts.instant, hideOn = opts.hide, opDelay = instant ? 0 : opts.opDelay || 0;
      // stagger by new position; when the band is coming down, give it a head start
      var base = band && !prevBand && !instant ? 160 : 0;
      rows.forEach(function (r) {
        var p = r.pos[si], y = (p - 1) * rowH;
        var oldP = r.cur || p, moved = Math.abs(oldP - p);
        var delay = instant ? 0 : base + Math.min((p - 1) * 14, 380);
        r.el.style.transitionDelay = delay + "ms, " + opDelay + "ms";
        r.bar.style.transitionDelay = delay + "ms";
        if (r.tag) r.tag.style.transitionDelay = delay + "ms";
        r.el.style.transform = "translate3d(0," + y + "px,0)";
        r.el.style.opacity = hideOn && r.pos[3] <= 5 ? "0" : "1";
        r.bar.style.transform = "scaleX(" + r.s[si] + ")";
        if (r.tag) r.tag.style.transform = "translateX(" + Math.round(r.s[si] * trackW + 8) + "px)";
        if (!instant && canAnim && moved >= 3 && !(band && (p <= 5 || oldP <= 5))) {
          r.flash.animate([{ opacity: 0 }, { opacity: .85, offset: .25 }, { opacity: 0 }], { duration: 760, delay: delay, easing: "ease-out" });
        }
        r.cur = p;
      });
      c.nums.forEach(function (s, i) { s.style.transitionDelay = opDelay + "ms"; s.style.opacity = hideOn && i < 5 ? "0" : "1"; });
    }

    function slamCaption(step, instant) {
      var text = CAPS[step], tag = TAGS[step];
      function swap() {
        cap.cap.textContent = text; cap.tag.textContent = tag;
        cap.box.classList.toggle("end", step === 4);
        c.axis.textContent = AXIS[step];
        ghostSpan.textContent = GHOST[step];
      }
      if (instant || !canAnim) return swap();
      cap.wipe.style.transformOrigin = "0 50%";
      var a = cap.wipe.animate([{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], { duration: 170, easing: "cubic-bezier(.7,0,.84,0)", fill: "forwards" });
      a.onfinish = function () {
        swap();
        cap.wipe.style.transformOrigin = "100% 50%";
        cap.wipe.animate([{ transform: "scaleX(1)" }, { transform: "scaleX(0)" }], { duration: 300, easing: "cubic-bezier(.23,1,.32,1)", fill: "forwards" });
        cap.inner.animate([{ transform: "translateX(-28px)", opacity: 0 }, { transform: "translateX(4px)", opacity: 1, offset: .6 }, { transform: "none", opacity: 1 }], { duration: 420, easing: "cubic-bezier(.23,1,.32,1)" });
        ghost.animate([{ transform: "translateY(24px)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 520, easing: "cubic-bezier(.23,1,.32,1)" });
      };
    }

    function go(step, instant) {
      if (step === cur) return;
      var prev = cur; cur = step;
      var band = step >= 3, prevBand = prev >= 3;
      clearTimers();
      if (instant) stage.classList.add("lad-still");
      if (band && !prevBand) {
        // band first, then the rows slide under it
        c.band.style.transitionDelay = "0ms";
        stage.classList.add("is-band");
        if (!instant && canAnim) {
          c.flash.animate([{ opacity: .55 }, { opacity: 0 }], { duration: 380, delay: 120, easing: "ease-out" });
          c.plot.animate([{ transform: "translateX(0)" }, { transform: "translateX(-5px)" }, { transform: "translateX(3px)" }, { transform: "none" }], { duration: 240, delay: 140 });
        }
        setRows(step, { instant: instant, prevBand: prevBand, hide: true, opDelay: 300 });
      } else if (!band && prevBand) {
        // rows settle back first, the band lifts after, then the hidden rows return
        c.band.style.transitionDelay = instant ? "0ms" : "520ms";
        stage.classList.remove("is-band");
        setRows(step, { instant: instant, prevBand: prevBand, hide: false, opDelay: 760 });
      } else {
        setRows(step, { instant: instant, prevBand: prevBand, hide: band, opDelay: 0 });
      }
      stage.classList.toggle("lad-done", step === 4);
      cta.a.tabIndex = step === 4 ? 0 : -1;
      if (step === 4) cta.wrap.removeAttribute("aria-hidden"); else cta.wrap.setAttribute("aria-hidden", "true");
      if (prev !== -1 && (prev === 4) !== (step === 4) && step < 4 && d.activeElement === cta.a) cta.a.blur();
      slamCaption(step, instant);
      if (instant) { void stage.offsetWidth; stage.classList.remove("lad-still"); }
    }

    function progress() {
      var r = track.getBoundingClientRect();
      var span = track.offsetHeight - stage.offsetHeight;
      var top = parseFloat(getComputedStyle(mount).getPropertyValue("--lad-top")) || 72;
      return Math.max(0, Math.min(1, (top - r.top) / span));
    }
    function frame() {
      raf = 0;
      var p = progress();
      pin(p);
      if (p === lastP) return;
      lastP = p;
      var f = p * 5;
      for (var i = 0; i < 4; i++) tickFills[i].style.transform = "scaleX(" + Math.max(0, Math.min(1, f - i)) + ")";
      go(Math.min(4, Math.floor(f)), false);
    }
    function onScroll() { if (live && !raf) raf = w.requestAnimationFrame(frame); }

    function layout() {
      phone = mqPhone.matches;
      if (pinMode === "on") { pinMode = "x"; }
      measure();
      // re-place everything at the current step without animating
      var step = cur < 0 ? Math.min(4, Math.floor(progress() * 5)) : cur;
      cur = -1;
      rows.forEach(function (r) { r.cur = 0; });
      go(step, true);
      lastP = -1; frame();
    }

    var io = new IntersectionObserver(function (es) {
      live = es[0].isIntersecting;
      mount.classList.toggle("live", live);
      frame(); // also settles the pin when a jump skips past the track
    }, { rootMargin: "100px 0px" });
    io.observe(track);
    w.addEventListener("scroll", onScroll, { passive: true });
    if (d.fonts && d.fonts.ready) d.fonts.ready.then(function () { layout(); });
    layout();
    return {
      phone: function () { return phone; },
      layout: layout,
      destroy: function () { io.disconnect(); w.removeEventListener("scroll", onScroll); clearTimers(); }
    };
  }

  var dataRef = null, inst = null, rz = 0;
  load(function (data) {
    dataRef = data;
    if (reduce) return staticFrames(data);
    inst = scrolly(data);
    w.addEventListener("resize", function () {
      clearTimeout(rz);
      rz = setTimeout(function () {
        if (mqPhone.matches !== inst.phone()) { inst.destroy(); mount.textContent = ""; inst = scrolly(dataRef); return; }
        inst.layout();
      }, 120);
    });
  });
})();
