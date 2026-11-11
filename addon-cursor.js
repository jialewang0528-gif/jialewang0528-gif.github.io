/* addon-cursor.js
   1. Interests: hovering a word in the About "Interests" line changes the physics of the existing ring cursor.
      Phones: tapping a word plays the same physics on the word, once, under 600ms.
   2. The Sandbox door remembers: after a trip through the Sandbox, "???" reads "Sandbox" and the ring label
      reads "Again?" instead of "Don't", for the rest of the visit (sessionStorage "cx-sbx-seen").
   Self-contained. Needs no markup changes: it finds the Interests <dd>, #ring and .nav-sbx on its own. */
(function () {
  "use strict";
  var mm = function (q) { return !!(window.matchMedia && matchMedia(q).matches); };
  var reduce = mm("(prefers-reduced-motion: reduce)");
  var fine = mm("(hover: hover) and (pointer: fine)");
  var ring = document.getElementById("ring");

  /* ================= 1. interests ================= */
  var MODES = { weightlifting: "weight", basketball: "ball", golf: "golf", "cold brews": "brew", anime: "anime" };

  function findInterests() {
    var dts = document.querySelectorAll(".about-facts dt");
    for (var i = 0; i < dts.length; i++) {
      if (dts[i].textContent.trim().toLowerCase() === "interests") return dts[i].parentNode.querySelector("dd");
    }
    return null;
  }

  // wrap each known word in a span; the commas and spaces stay as plain text, so the line reads the same
  function wrap(dd) {
    if (!dd || dd.querySelector(".cx-w") || dd.children.length) return [];
    var parts = dd.textContent.split(/(,\s*)/), out = [], frag = document.createDocumentFragment();
    parts.forEach(function (p) {
      var mode = MODES[p.trim().toLowerCase()];
      if (!mode) { frag.appendChild(document.createTextNode(p)); return; }
      var s = document.createElement("span");
      s.className = "cx-w"; s.setAttribute("data-cx", mode); s.textContent = p;
      frag.appendChild(s); out.push(s);
    });
    dd.textContent = ""; dd.appendChild(frag);
    return out;
  }

  var words = wrap(findInterests());

  /* ---- desktop: the ring ---- */
  if (words.length && ring && fine && !reduce) (function () {
    var mx = -100, my = -100;          // pointer
    var fx = 0, fy = 0;                // plain follower, same 0.2-per-frame ease as the page's loop
    var px = 0, py = 0, vx = 0, vy = 0; // what is shown, and its velocity (weight, golf)
    var h = 0, vh = 0, sq = 0, rest = true, moved = 0; // basketball: height over the floor, squash, re-dribble
    var hold = 0;                      // anime: time since the last held frame
    var mode = null, active = false, raf = 0, last = 0, t0 = 0;
    var CLS = ["cx-weight", "cx-ball", "cx-golf", "cx-brew", "cx-anime"];

    // where the page's own loop has the ring right now
    function pagePos() {
      var m = /(-?[\d.]+)px\s+(-?[\d.]+)px/.exec(ring.style.translate || "");
      return m ? [parseFloat(m[1]), parseFloat(m[2])] : [mx, my];
    }
    function show(x, y) { ring.style.setProperty("--cx-x", x.toFixed(2) + "px"); ring.style.setProperty("--cx-y", y.toFixed(2) + "px"); }

    function enter(m) {
      if (!active) { var p = pagePos(); fx = px = p[0]; fy = py = p[1]; vx = vy = 0; active = true; show(px, py); ring.classList.add("cx-on"); }
      CLS.forEach(function (c) { ring.classList.remove(c); });
      ring.classList.add("cx-" + m); ring.style.transform = "";
      mode = m; hold = 0;
      if (m === "ball") { h = 0; vh = 460; rest = false; sq = 0; moved = 0; }
      else { py -= h; h = 0; }
      if (m === "golf" || m === "weight") { vx = vy = 0; }
      if (!raf) { last = 0; raf = requestAnimationFrame(tick); }
    }
    function leave() {
      mode = null; py -= h; h = 0; vx = vy = 0;
      CLS.forEach(function (c) { ring.classList.remove(c); }); ring.style.transform = "";
    }
    function stop() { active = false; raf = 0; ring.classList.remove("cx-on"); ring.style.removeProperty("--cx-x"); ring.style.removeProperty("--cx-y"); }

    function tick(now) {
      raf = 0;
      if (!last) { last = now; t0 = now; }
      var dt = Math.min(0.05, (now - last) / 1000); last = now;
      var k = 1 - Math.pow(0.8, dt * 60);
      fx += (mx - fx) * k; fy += (my - fy) * k;

      if (mode === "weight") {
        // heavy: an overdamped follow, about 0.4s behind the hand
        var kw = 1 - Math.exp(-dt * 2.6);
        px += (mx - px) * kw; py += (my - py) * kw;
      } else if (mode === "ball") {
        // the follower is the floor; the ring falls onto it and bounces, losing a third each time
        px = fx;
        if (!rest) {
          vh -= 2600 * dt; h += vh * dt;
          if (h <= 0) {
            h = 0; sq = Math.min(0.22, Math.abs(vh) / 460 * 0.22); vh = -vh * 0.68;
            if (vh < 70) { vh = 0; rest = true; moved = 0; }
          }
        }
        sq *= Math.exp(-dt * 18);
        py = fy - h;
        ring.style.transform = sq > 0.004 ? "scale(" + (1 + sq * 0.6).toFixed(3) + "," + (1 - sq).toFixed(3) + ")" : "";
      } else if (mode === "golf") {
        // a ball on a green: soft pull, light friction, so it rolls up to the hand, a touch past, and stops
        var ax = 20 * (mx - px) - 6.4 * vx, ay = 20 * (my - py) - 6.4 * vy;
        vx += ax * dt; vy += ay * dt; px += vx * dt; py += vy * dt;
      } else if (mode === "brew") {
        // caffeine: follows as usual with about a pixel and a half of shake
        var t = (now - t0) / 1000;
        px = fx + Math.sin(t * 71) * 0.9 + Math.sin(t * 113 + 1) * 0.7;
        py = fy + Math.sin(t * 83 + 2) * 0.9 + Math.sin(t * 127) * 0.7;
      } else if (mode === "anime") {
        // on threes: 24fps film, a new drawing every third frame, 8 a second
        hold += dt;
        if (hold >= 0.125) { hold = hold % 0.125; px = fx; py = fy; }
      } else {
        // handing back: ease onto the page's own ring, then let go
        var p = pagePos();
        px += (p[0] - px) * k; py += (p[1] - py) * k;
        if (Math.abs(p[0] - px) + Math.abs(p[1] - py) < 0.4) { stop(); return; }
      }
      show(px, py);
      raf = requestAnimationFrame(tick);
    }

    window.addEventListener("mousemove", function (e) {
      if (mode === "ball" && rest) { moved += Math.abs(e.clientX - mx) + Math.abs(e.clientY - my); if (moved > 24) { rest = false; vh = 380; moved = 0; } }
      mx = e.clientX; my = e.clientY;
    }, { passive: true });
    words.forEach(function (w) {
      w.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") enter(w.getAttribute("data-cx")); });
      w.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse" && mode === w.getAttribute("data-cx")) leave(); });
    });
    // never leave the ring in a mode if the pointer or the page goes away
    document.addEventListener("mouseleave", function () { if (mode) leave(); });
    document.addEventListener("visibilitychange", function () { if (document.hidden && mode) leave(); });
  })();

  /* ---- phones (and reduced motion): the word itself, once ---- */
  // transform only; every one ends where it started and runs under 600ms
  var E_OUT = "cubic-bezier(0.23, 1, 0.32, 1)", E_INOUT = "cubic-bezier(0.77, 0, 0.175, 1)";
  function ballFrames() {
    // sampled from the same bounce the ring uses, so the timing is real: three bounces in 560ms
    var out = [], T = 0.56, n = 28, g = 2600, v = 0, hh = 0, dt = T / n / 4, launch = 250;
    v = launch;
    for (var i = 0; i <= n; i++) {
      out.push({ transform: "translateY(" + (-hh).toFixed(2) + "px)", offset: i / n });
      for (var s = 0; s < 4; s++) { v -= g * dt; hh += v * dt; if (hh <= 0) { hh = 0; v = -v * 0.62; if (v < 40) v = 0; } }
    }
    out[out.length - 1].transform = "translateY(0px)";
    return out;
  }
  var TAPS = {
    weight: function () { return [[{ transform: "translateY(0) scaleY(1)" }, { transform: "translateY(3px) scaleY(.92)", offset: 0.55 }, { transform: "translateY(0) scaleY(1)" }], { duration: 580, easing: E_INOUT }]; },
    ball: function () { return [ballFrames(), { duration: 560, easing: "linear" }]; },
    golf: function () { return [[{ transform: "translateX(0)", easing: E_OUT }, { transform: "translateX(14px)", offset: 0.62, easing: E_INOUT }, { transform: "translateX(0)" }], { duration: 580 }]; },
    brew: function () {
      var f = [], n = 12;
      for (var i = 0; i <= n; i++) { var a = 1.8 * (1 - i / n); f.push({ transform: "translate(" + (i % 2 ? a : -a).toFixed(2) + "px," + (i % 3 === 1 ? a * 0.5 : -a * 0.3).toFixed(2) + "px)" }); }
      f[0].transform = f[n].transform = "translate(0,0)";
      return [f, { duration: 480, easing: "linear" }];
    },
    anime: function () {
      // four held drawings, 125ms each (8 a second), then back on model
      var P = ["translate(1px,-6px) rotate(-3deg)", "translate(3px,-3px) rotate(2deg)", "translate(2px,-1px) rotate(-1deg)", "translate(1px,0) rotate(0deg)"];
      var f = P.map(function (t, i) { return { transform: t, offset: i / 4, easing: "steps(1, end)" }; });
      f.push({ transform: "translate(0,0) rotate(0deg)", offset: 1 });
      return [f, { duration: 500 }];
    }
  };
  function tap(w) {
    if (!w.animate) return;
    if (w._cx) w._cx.cancel();
    var spec = reduce ? [[{ opacity: 1 }, { opacity: 0.45 }, { opacity: 1 }], { duration: 200, easing: "ease" }] : TAPS[w.getAttribute("data-cx")]();
    w._cx = w.animate(spec[0], spec[1]);
  }
  words.forEach(function (w) {
    // touch and pen always; a mouse only when there is no ring to carry the effect (reduced motion)
    w.addEventListener("pointerup", function (e) { if (e.pointerType !== "mouse") tap(w); });
    if (reduce) w.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") tap(w); });
  });

  /* ================= 2. the door remembers ================= */
  var KEY = "cx-sbx-seen", doors = document.querySelectorAll(".nav-sbx");
  function seen() { try { return sessionStorage.getItem(KEY) === "1"; } catch (e) { return false; } }
  function mark() { try { sessionStorage.setItem(KEY, "1"); } catch (e) {} }
  function remember() {
    if (!seen() || document.documentElement.classList.contains("cx-seen")) return;
    document.documentElement.classList.add("cx-seen");
    doors.forEach(function (a) { var q = a.querySelector(".sbx-q"); if (q) q.textContent = "Sandbox"; a.style.setProperty("--sbx-dx", "0px"); });
    relabel();
  }
  // the page sets the ring label itself on hover; swap its word after the fact rather than patch its list
  var ringTxt = ring && ring.querySelector("span");
  function relabel() { if (ringTxt && ringTxt.textContent === "Don’t" || ringTxt && ringTxt.textContent === "Don't") ringTxt.textContent = "Again?"; }
  if (ringTxt && window.MutationObserver) new MutationObserver(function () { if (document.documentElement.classList.contains("cx-seen")) relabel(); }).observe(ringTxt, { childList: true, characterData: true, subtree: true });

  if (doors.length) {
    // going through the door counts; the word only changes on the way back, never while the ink is still flooding
    doors.forEach(function (a) { a.addEventListener("click", function (e) { if (e.metaKey || e.ctrlKey || e.shiftKey || e.button > 0) return; mark(); }); });
    // arriving from the Sandbox by any route (its back link, or a link typed/opened there) counts too
    if (/\/sandbox\//.test(document.referrer || "") || document.documentElement.classList.contains("from-sbx")) mark();
    remember();
    // browser Back out of the Sandbox restores this page from the back/forward cache
    window.addEventListener("pageshow", function (e) { if (e.persisted) remember(); });
  }
})();
