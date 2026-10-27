/* Shell Shockers "loading into the match" screen.
   Runs in <head> before first paint. Shows only when Player Select left a fresh
   sessionStorage flag ("sbx-load": {t}); direct visits, reloads and bfcache
   restores show nothing. Layout follows shellshock.io's loader (two-line
   wordmark with a fried egg for the O, pill progress bar, one line under it),
   recoloured to the Shell League palette. Everything animates with WAAPI on
   transform/opacity so it stays on the compositor while the page parses.
   Exposes window.ShellLoad { active, done } and fires "shell:loaded" on document. */
(function () {
  var d = document, w = window, KEY = "sbx-load", fresh = false;
  try {
    var raw = sessionStorage.getItem(KEY);
    if (raw) {
      sessionStorage.removeItem(KEY);
      var v = JSON.parse(raw), age = v && typeof v.t === "number" ? Date.now() - v.t : -1e9;
      fresh = age > -2000 && age < 10000;
    }
  } catch (e) {}
  try {
    var nav = performance.getEntriesByType && performance.getEntriesByType("navigation")[0];
    if (nav && nav.type === "back_forward") fresh = false;
  } catch (e) {}

  var api = { active: false, done: Promise.resolve() };
  w.ShellLoad = api;
  if (!fresh || !d.documentElement.animate) return;

  var reduce = false;
  try { reduce = w.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  var INK = "#ebe8e1", DARK = "#0d0c10", VIOLET = "#7A3CFA", DEEP = "#4B1FA8";
  // Same panel as the cover Player Select closes (keep the two in sync).
  var PANEL = "radial-gradient(90% 55% at 50% 100%, rgba(155,107,255,.45), rgba(155,107,255,0) 70%)," +
    "linear-gradient(180deg, #24106a 0%, #4B1FA8 38%, #6a34e8 72%, #8456ff 100%)";
  var TONE = "radial-gradient(circle, rgba(13,12,16,.22) 0.9px, transparent 1.5px) 0 0 / 6px 6px";
  var TIPS = ["tip: aim for the yolk", "tip: stand on the point", "tip: reload before you need to", "tip: the hill does not cap itself"];
  var tip = TIPS[Math.floor(Math.random() * TIPS.length)];

  // Fried-egg white: a lumpy closed blob (the O in SHOCKERS).
  function blob() {
    var p = [], n = 64;
    for (var i = 0; i < n; i++) {
      var a = (i / n) * Math.PI * 2, r = 70 + 6 * Math.sin(a * 5 + 0.6) + 3.5 * Math.sin(a * 3 - 1.1) + 2 * Math.sin(a * 9);
      p.push((i ? "L" : "M") + (100 + Math.cos(a) * r).toFixed(1) + " " + (100 + Math.sin(a) * r * 0.94).toFixed(1));
    }
    return p.join("") + "Z";
  }

  var css =
    "#sbx-load{position:fixed;inset:0;z-index:2147483000;pointer-events:auto;contain:strict;overflow:hidden;font-family:'Schibsted Grotesk','Helvetica Neue',Arial,sans-serif;color:" + INK + ";-webkit-font-smoothing:antialiased}" +
    "#sbx-load .sl-h{position:absolute;inset:0;background:" + PANEL + ";will-change:transform}" +
    "#sbx-load .sl-h::after{content:'';position:absolute;inset:0;background:" + TONE + ";-webkit-mask:radial-gradient(ellipse 75% 65% at 50% 46%,transparent 40%,#000 100%);mask:radial-gradient(ellipse 75% 65% at 50% 46%,transparent 40%,#000 100%);opacity:.9}" +
    "#sbx-load .sl-a{clip-path:inset(0 0 50% 0)}#sbx-load .sl-b{clip-path:inset(50% 0 0 0)}" +
    "#sbx-load .sl-seam{position:absolute;left:0;right:0;top:50%;height:2px;margin-top:-1px;background:" + INK + ";box-shadow:0 0 18px 2px rgba(155,107,255,.9);transform:scaleX(0);opacity:0}" +
    "#sbx-load .sl-stage{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0 16px 4vh;will-change:transform,opacity}" +
    "#sbx-load .sl-logo{position:relative;width:min(600px,calc(100vw - 32px));aspect-ratio:640/330}" +
    "#sbx-load .sl-logo>svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible;display:block}" +
    "#sbx-load .sl-egg{position:absolute;left:23.2%;top:45.4%;width:30.4%;aspect-ratio:1;will-change:transform}" +
    "#sbx-load .sl-egg svg{display:block;width:100%;height:100%;overflow:visible}" +
    "#sbx-load .sl-yolk{position:absolute;left:31%;top:30%;width:38%;aspect-ratio:1;will-change:transform}" +
    "#sbx-load .sl-bar{margin-top:min(5.5vw,34px);width:min(420px,calc(100vw - 72px));height:36px;padding:5px;border-radius:999px;background:" + DARK + ";box-shadow:0 6px 0 rgba(13,12,16,.45)}" +
    "#sbx-load .sl-track{height:100%;padding:4px;border-radius:999px;background:" + INK + "}" +
    "#sbx-load .sl-clip{position:relative;height:100%;border-radius:999px;overflow:hidden;transform:translateZ(0)}" +
    "#sbx-load .sl-fill{position:absolute;inset:0;border-radius:999px;background:linear-gradient(180deg,#9B6BFF 0 34%," + VIOLET + " 34% 100%);transform:translateX(-100%);will-change:transform}" +
    "#sbx-load .sl-shine{position:absolute;top:0;bottom:0;left:0;width:40%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.75),transparent);transform:translateX(-120%)}" +
    "#sbx-load .sl-tip{margin:26px 0 0;font-weight:500;font-size:16px;line-height:22px;letter-spacing:.01em;color:#fff;text-shadow:0 1px 2px rgba(13,12,16,.35);text-transform:lowercase;white-space:nowrap}" +
    "#sbx-load .sl-hud{position:absolute;left:0;right:0;bottom:0;display:flex;justify-content:space-between;padding:0 max(16px,3vw) calc(env(safe-area-inset-bottom,0px) + 20px);font-weight:700;font-size:11px;line-height:14px;letter-spacing:.14em;text-transform:uppercase;color:rgba(235,232,225,.72);font-variant-numeric:tabular-nums}" +
    "#sbx-load .sl-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}";

  var word =
    '<svg viewBox="0 0 640 330" aria-hidden="true"><defs><g id="sl-wm" font-family="\'Schibsted Grotesk\',\'Helvetica Neue\',Arial,sans-serif" font-weight="900" font-size="150" letter-spacing="-4">' +
    '<text x="320" y="146" text-anchor="middle" textLength="430" lengthAdjust="spacingAndGlyphs" rotate="-6 3 -3 5 -4">SHELL</text>' +
    '<text x="28" y="300" textLength="150" lengthAdjust="spacingAndGlyphs" rotate="4 -5">SH</text>' +
    '<text x="320" y="300" textLength="294" lengthAdjust="spacingAndGlyphs" rotate="-4 5 -3 4 -6">CKERS</text>' +
    '</g></defs>' +
    '<use href="#sl-wm" transform="translate(0 13)" fill="' + DARK + '" stroke="' + DARK + '" stroke-width="26" stroke-linejoin="round"/>' +
    '<use href="#sl-wm" fill="' + INK + '" stroke="' + DARK + '" stroke-width="15" stroke-linejoin="round" paint-order="stroke"/>' +
    "</svg>";

  var egg =
    '<div class="sl-egg"><svg viewBox="0 0 200 200" aria-hidden="true">' +
    '<path d="' + blob() + '" transform="translate(0 9)" fill="' + DARK + '" stroke="' + DARK + '" stroke-width="16" stroke-linejoin="round"/>' +
    '<path d="' + blob() + '" fill="#fbf8f1" stroke="' + DARK + '" stroke-width="10" stroke-linejoin="round" paint-order="stroke"/>' +
    '<path d="M44 92c6-26 26-42 50-46" fill="none" stroke="rgba(13,12,16,.08)" stroke-width="8" stroke-linecap="round"/>' +
    "</svg>" +
    '<div class="sl-yolk"><svg viewBox="0 0 100 100" aria-hidden="true">' +
    '<circle cx="50" cy="50" r="44" fill="' + DEEP + '" stroke="' + DARK + '" stroke-width="7"/>' +
    '<circle cx="50" cy="50" r="38" fill="' + VIOLET + '"/>' +
    '<circle cx="54" cy="55" r="30" fill="#8a52ff"/>' +
    '<ellipse cx="34" cy="31" rx="13" ry="8" transform="rotate(-38 34 31)" fill="rgba(255,255,255,.7)"/>' +
    "</svg></div></div>";

  var root = d.createElement("div");
  root.id = "sbx-load";
  root.setAttribute("role", "status");
  root.innerHTML =
    '<span class="sl-sr">Loading Shell Shockers</span>' +
    '<div class="sl-h sl-a"></div><div class="sl-h sl-b"></div><div class="sl-seam"></div>' +
    '<div class="sl-stage" aria-hidden="true"><div class="sl-logo">' + word + egg + "</div>" +
    '<div class="sl-bar"><div class="sl-track"><div class="sl-clip"><div class="sl-fill"></div><div class="sl-shine"></div></div></div></div>' +
    '<p class="sl-tip">' + tip + "</p></div>" +
    '<div class="sl-hud" aria-hidden="true"><span>Shell League · King of the Coop</span><span class="sl-pct">0%</span></div>';

  var style = d.createElement("style");
  style.id = "sbx-load-css";
  style.textContent = css;
  (d.head || d.documentElement).appendChild(style);
  d.documentElement.appendChild(root);
  d.documentElement.classList.add("sbx-loading");
  api.active = true;

  function q(s) { return root.querySelector(s); }
  var stage = q(".sl-stage"), logo = q(".sl-logo"), eggEl = q(".sl-egg"), yolk = q(".sl-yolk"),
      bar = q(".sl-bar"), fill = q(".sl-fill"), shine = q(".sl-shine"), tipEl = q(".sl-tip"),
      hud = q(".sl-hud"), pct = q(".sl-pct"), a = q(".sl-a"), b = q(".sl-b"), seam = q(".sl-seam");

  var resolveDone, removed = false, raf = 0, safety = 0;
  api.done = new Promise(function (r) { resolveDone = r; });

  function cleanup() {
    if (removed) return;
    removed = true;
    cancelAnimationFrame(raf); clearTimeout(safety);
    if (root.parentNode) root.parentNode.removeChild(root);
    if (style.parentNode) style.parentNode.removeChild(style);
    d.documentElement.classList.remove("sbx-loading");
    api.active = false;
    try { d.dispatchEvent(new CustomEvent("shell:loaded")); } catch (e) {}
    resolveDone();
  }
  w.addEventListener("pageshow", function (e) { if (e.persisted) cleanup(); });
  safety = setTimeout(cleanup, 4000);

  var OUT = "cubic-bezier(0.23, 1, 0.32, 1)";

  if (reduce) {
    // Static card (bar already full), then a plain 200ms fade. No spin, no split.
    fill.style.transform = "none";
    pct.textContent = "100%";
    var fade = root.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, delay: 320, easing: "linear", fill: "both" });
    setTimeout(function () { root.style.pointerEvents = "none"; }, 320);
    fade.finished.then(cleanup, cleanup);
    return;
  }

  // ---- timeline (ms from first frame) ----
  var FILL0 = 120, FILL = 760, EXIT = 960, SPLIT = 1110, SPLIT_D = 290;

  logo.animate([
    { opacity: 0, transform: "translateY(18px) scale(.82)" },
    { opacity: 1, transform: "translateY(-3px) scale(1.035)", offset: .62 },
    { opacity: 1, transform: "none" }
  ], { duration: 380, easing: OUT, fill: "both" });
  bar.animate([{ opacity: 0, transform: "translateY(10px) scaleX(.9)" }, { opacity: 1, transform: "none" }], { duration: 260, delay: 70, easing: OUT, fill: "both" });
  tipEl.animate([{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }], { duration: 240, delay: 150, easing: OUT, fill: "both" });
  hud.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, delay: 120, fill: "both" });

  // Uneven, believable progress: quick start, a stall, a burst, a crawl, done.
  var STEPS = [[0, 0], [.16, .17], [.30, .23], [.46, .52], [.62, .58], [.80, .86], [1, 1]];
  var fillAnim = fill.animate(STEPS.map(function (s) {
    return { offset: s[0], transform: "translateX(" + ((s[1] - 1) * 100).toFixed(1) + "%)", easing: "cubic-bezier(.3,.7,.4,1)" };
  }), { duration: FILL, delay: FILL0, fill: "both" });
  shine.animate([{ transform: "translateX(-120%)" }, { transform: "translateX(320%)" }], { duration: 320, delay: FILL0 + FILL - 40, easing: "cubic-bezier(.4,0,.2,1)", fill: "both" });
  bar.animate([{ transform: "none" }, { transform: "scale(1.04)", offset: .35 }, { transform: "none" }], { duration: 260, delay: FILL0 + FILL - 20, easing: OUT, composite: "add" });

  // The fried egg is the spinner: one and a half turns with a bob, then the yolk pops.
  eggEl.animate([
    { transform: "translateY(0) rotate(0deg)" },
    { transform: "translateY(-7%) rotate(200deg)", offset: .35 },
    { transform: "translateY(2%) rotate(420deg)", offset: .7 },
    { transform: "translateY(0) rotate(540deg)" }
  ], { duration: FILL0 + FILL, easing: "cubic-bezier(.45,.05,.3,1)", fill: "both" });
  yolk.animate([{ transform: "none" }, { transform: "scale(1.32)", offset: .3 }, { transform: "scale(.94)", offset: .65 }, { transform: "none" }],
    { duration: 300, delay: FILL0 + FILL - 30, easing: "ease-out" });

  // Exit: card punches toward camera, a seam flashes, the panel splits open.
  stage.animate([
    { opacity: 1, transform: "none", easing: "cubic-bezier(.3,0,.8,.15)" },
    { opacity: 1, transform: "scale(.97)", offset: .25, easing: "cubic-bezier(.5,0,.9,.4)" },
    { opacity: 0, transform: "scale(1.16)" }
  ], { duration: 160, delay: EXIT, fill: "both" });
  hud.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, delay: EXIT, fill: "forwards", composite: "replace" });
  seam.animate([
    { opacity: 0, transform: "scaleX(0)" },
    { opacity: 1, transform: "scaleX(1)", offset: .55 },
    { opacity: 0, transform: "scaleX(1) scaleY(3)" }
  ], { duration: 240, delay: SPLIT - 90, easing: "cubic-bezier(.2,.8,.2,1)", fill: "both" });
  var SPLIT_E = "cubic-bezier(.76,0,.24,1)";
  a.animate([{ transform: "none" }, { transform: "translateY(-52%)" }], { duration: SPLIT_D, delay: SPLIT, easing: SPLIT_E, fill: "both" });
  var split = b.animate([{ transform: "none" }, { transform: "translateY(52%)" }], { duration: SPLIT_D, delay: SPLIT, easing: SPLIT_E, fill: "both" });

  // One rAF loop: % readout, hand clicks back at the split, replay the hero build-in behind it.
  var lastP = -1, released = false;
  function tick() {
    var t = fillAnim.currentTime;
    if (t != null) {
      var e = Math.max(0, Math.min(1, (t - FILL0) / FILL)), p = 0;
      for (var i = 1; i < STEPS.length; i++) {
        if (e <= STEPS[i][0]) { var s0 = STEPS[i - 1], s1 = STEPS[i], k = (e - s0[0]) / (s1[0] - s0[0]); p = s0[1] + (s1[1] - s0[1]) * (1 - Math.pow(1 - k, 2)); break; }
      }
      p = Math.round(p * 100);
      if (p !== lastP) { pct.textContent = p + "%"; lastP = p; }
    }
    // the fill animation stops at its own end (~880ms), so the split's clock decides when to hand back
    if (!released && (split.currentTime || 0) >= SPLIT - 10) { released = true; root.style.pointerEvents = "none"; replayHero(); }
    if (!removed) raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);
  split.finished.then(cleanup, cleanup);

  // The page's own hero entrance ran hidden under the card; restart it so it builds in as the panel opens.
  function replayHero() {
    try {
      if (!d.getAnimations) return;
      d.getAnimations().forEach(function (an) {
        var name = an.animationName;
        if ((name === "rise" || name === "numIn") && an.effect && an.effect.getTiming().iterations === 1) an.currentTime = 0;
      });
    } catch (e) {}
  }
})();
