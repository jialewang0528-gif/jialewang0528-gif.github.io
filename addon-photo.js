/* addon-photo: hover (mouse) or tap (touch, keyboard) the hero portrait and the frame widens
   to show the whole photo it was cropped from. He stays exactly where he is: the wide photo
   is laid out at the same scale and offset as the crop, and only its clip-path animates.
   Nothing else on the page moves: beside the name the photo only grows into the free space.
   The wide file is fetched after the page is idle, never on the first paint. */
(function () {
  var fig = document.querySelector(".portrait.big"), frame = fig && fig.querySelector(".frame"), img = frame && frame.querySelector("img");
  if (!img || !window.CSS || !CSS.supports("clip-path", "inset(0px)")) return;

  // the full photo, and where michael-portrait.jpg sits inside it (original pixels)
  var FULL = { w: 5712, h: 4284 }, CROP = { x: 1642, y: 357, w: 3142 };
  var FILES = [[800, "addon-photo-800.webp"], [1600, "addon-photo-1600.webp"]];
  var base = (document.currentScript && document.currentScript.src || "").replace(/[^\/]*$/, "");

  var hover = matchMedia("(hover: hover) and (pointer: fine)");
  var side = fig.parentNode.querySelector(".hero-side");
  var wide, pic, btn, state = 0 /* 0 idle, 1 loading, 2 ready */, open = false, want = false, timer = 0, lastPointer = "";

  btn = document.createElement("button");
  btn.type = "button"; btn.className = "ph-btn";
  btn.setAttribute("aria-label", "Show the whole photo"); btn.setAttribute("aria-expanded", "false");
  frame.appendChild(btn);

  function place() {
    var w = img.offsetWidth, h = img.offsetHeight, il = img.offsetLeft, it = img.offsetTop;
    btn.style.cssText = "left:" + il + "px;top:" + it + "px;width:" + w + "px;height:" + h + "px";
    if (!wide || !w) return 0;
    // reproduce the portrait's own object-fit: cover crop, so the two line up to the pixel
    var nw = img.naturalWidth || 720, nh = img.naturalHeight || 900, k = Math.max(w / nw, h / nh);
    var op = getComputedStyle(img).objectPosition.split(" "), fx = parseFloat(op[0]) / 100, fy = parseFloat(op[1]) / 100;
    if (isNaN(fx)) fx = .5; if (isNaN(fy)) fy = .5;
    var s = k * nw / CROP.w;                                   // CSS px per original px
    var W = FULL.w * s, H = FULL.h * s;
    var L = il + (w - nw * k) * fx - CROP.x * s, T = it + (h - nh * k) * fy - CROP.y * s;   // photo box, in frame coordinates
    // keep the box inside the screen so it never adds sideways scroll: past the edge it simply bleeds off
    var fr = fig.getBoundingClientRect(), fx0 = fr.left + frame.offsetLeft + frame.clientLeft, vw = document.documentElement.clientWidth;
    var bl = Math.max(L, -fx0), br = Math.min(L + W, vw - fx0);
    // side-by-side layout: the photo stops 16px short of the name column, so nothing else on the page has to move
    if (side) { var sr = side.getBoundingClientRect(); if (sr.left > fr.left + fr.width / 2 && sr.top < fr.bottom) br = Math.max(il + w, Math.min(br, sr.left - 16 - fx0)); }
    wide.style.left = bl + "px"; wide.style.top = T + "px"; wide.style.width = (br - bl) + "px"; wide.style.height = H + "px";
    pic.style.left = (L - bl) + "px"; pic.style.top = "0px"; pic.style.width = W + "px"; pic.style.height = H + "px";
    wide.style.setProperty("--ph-l", (il - bl) + "px"); wide.style.setProperty("--ph-r", (br - il - w) + "px");
    wide.style.setProperty("--ph-t", (it - T) + "px"); wide.style.setProperty("--ph-b", (T + H - it - h) + "px");
    return W;
  }

  function load() {
    if (state) return; state = 1;
    wide = document.createElement("div"); wide.className = "ph-wide"; wide.setAttribute("aria-hidden", "true");
    pic = new Image(); pic.alt = ""; pic.decoding = "async"; pic.draggable = false;
    wide.appendChild(pic);
    var need = (place() || img.offsetWidth * FULL.w / CROP.w) * (window.devicePixelRatio || 1);
    var f = need > FILES[0][0] * 1.1 ? FILES[1] : FILES[0];
    pic.onload = function () {
      var done = function () { frame.insertBefore(wide, btn); place(); wide.getBoundingClientRect(); state = 2; if (want) set(true); };
      pic.decode ? pic.decode().then(done, done) : done();
    };
    pic.onerror = function () { state = 0; wide = pic = null; want = false; };
    pic.src = base + f[1];
  }

  function set(on) {
    want = on;
    if (on && state < 2) { load(); return; }
    if (on === open) return;
    if (on) place();
    open = on;
    fig.classList.toggle("ph-on", on);
    btn.setAttribute("aria-expanded", on ? "true" : "false");
    btn.setAttribute("aria-label", on ? "Close the whole photo" : "Show the whole photo");
  }

  // mouse: open on a short dwell so a cursor passing through never trips it
  fig.addEventListener("pointerenter", function (e) {
    if (e.pointerType !== "mouse" || !hover.matches) return;
    clearTimeout(timer); timer = setTimeout(function () { set(true); }, 120);
  });
  fig.addEventListener("pointerleave", function (e) {
    if (e.pointerType !== "mouse" || !hover.matches) return;
    clearTimeout(timer); set(false);
  });
  // touch, pen, keyboard: tap or Enter toggles
  fig.addEventListener("pointerdown", function (e) { lastPointer = e.pointerType; });
  fig.addEventListener("click", function (e) {
    var kb = e.detail === 0;
    if (!kb && lastPointer === "mouse" && hover.matches) { if (!want) { clearTimeout(timer); set(true); } return; }   // hover opens it; a click reopens it after Escape
    set(!want);
  });
  document.addEventListener("pointerdown", function (e) { if (want && !fig.contains(e.target)) { lastPointer = e.pointerType; if (e.pointerType !== "mouse" || !hover.matches) set(false); } });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && want) set(false); });
  btn.addEventListener("blur", function () { if (want && !fig.matches(":hover")) set(false); });

  var raf = 0;
  window.addEventListener("resize", function () { cancelAnimationFrame(raf); raf = requestAnimationFrame(place); });
  place();

  // fetch the wide file only once the page has loaded and gone idle
  function idle() { window.requestIdleCallback ? requestIdleCallback(load, { timeout: 4000 }) : setTimeout(load, 1500); }
  if (document.readyState === "complete") idle(); else window.addEventListener("load", idle);
})();
