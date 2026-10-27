/*!
 * SandboxEgg v2: Michael's real Shell Shockers loadout, rendered with three.js r128.
 *   Egg colour #5e260f (colorIdx 6), hat_roundglasses, "LCC" stamp (stamp-2609),
 *   gun_m24_SnakeAlbino (Albino Crackshot). Models come from the game's own
 *   egg.glb / gun_m24.glb, pruned to egg-loadout.glb (~196 KB, ~74 KB gzipped).
 *
 *   const egg = SandboxEgg.mount(el, { pose: 'hero', interactive: true });
 *   egg.setPose('clips', { duration: 600 });   // Promise
 *   egg.pause(); egg.resume(); egg.destroy();
 *
 * Options: pose, interactive (cursor / finger look-at), backdrop (CSS colour; default transparent),
 *          pixelRatio (cap, default 2), glbUrl, fallbackSrc (dir or fn(pose)), glow, motion:false.
 * Needs window.THREE (r128). GLTFLoader is fetched from jsdelivr if missing.
 */
(function (global) {
  'use strict';

  var THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  var GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js';
  var POSE_NAMES = ['hero', 'build', 'clips', 'select'];
  var SCRIPT_DIR = (function () {
    var s = document.currentScript && document.currentScript.src;
    return s ? s.slice(0, s.lastIndexOf('/') + 1) : '';
  })();
  var SHELL_COLOR = '#5e260f';           // shellColors[6]
  var SHELL_RENDER = '#663009';          // same hue, pre-saturated to survive ACES
  var STAMP_SRC = 'data:image/webp;base64,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';
  var DEG = Math.PI / 180;

  /* ------------------------------------------------------------------ */
  /* Poses (thumbnail compositions). Angles in degrees.                   */
  /*  yaw/pitch: the game's paper-doll controls (mesh.rotation.y,         */
  /*  head.rotation.x). cam: orbit around target, az 0 = straight on.     */
  /*  Light dirs are in camera space (x right, y up, z toward viewer).    */
  /* ------------------------------------------------------------------ */
  var POSES = {
    hero: {
      yaw: 30, pitch: -4, fore: 1, gunPos: [0, -0.05, 0], glint: 0.3,
      cam: { target: [0.03, 0.31, 0], az: 0, el: 6, fov: 26, fitH: 0.48, fitW: 0.6 },
      key: { dir: [-1, 1.1, 0.9], int: 1.3, col: '#ffeedd' },
      rim: { dir: [0.9, 0.4, -0.8], int: 1.75, col: '#d6ecff' },
      rimFx: { col: '#e6f4ff', str: 1.1, pow: 3.4, wrap: 0.1 },
      hemi: { sky: '#e2d8cc', ground: '#3a2418', int: 0.55 },
      exposure: 1.0, glow: { col: '#e2f1ff', a: 0.74, size: 1.08 }, shadow: 0.5,
      idle: 1
    },
    build: {
      yaw: -24, pitch: -8, fore: 0, tilt: 10, gunPos: [0.02, -0.06, 0.02], gunRot: [35, -20, -10], glint: 1,
      cam: { target: [-0.06, 0.34, 0], az: -10, el: -12, fov: 26, fitH: 0.5, fitW: 0.64 },
      key: { dir: [-0.8, 1.2, 1], int: 1.55, col: '#fff4e8' },
      rim: { dir: [0.9, 0.7, -0.6], int: 1.7, col: '#d6ecff' },
      rimFx: { col: '#e6f4ff', str: 1.1, pow: 3.4, wrap: 0.12 },
      hemi: { sky: '#e6dcd0', ground: '#3a2418', int: 0.55 },
      exposure: 1.02, glow: { col: '#e2f1ff', a: 0.68, size: 1.08 }, shadow: 0.45,
      idle: 0.8
    },
    clips: {
      yaw: 55, pitch: 2, fore: 1, gunPos: [-0.18, 0.12, 0.04],
      cam: { target: [0.1, 0.4, 0], az: 0, el: 3, fov: 26, fitH: 0.42, fitW: 0.62 },
      key: { dir: [-0.7, 0.6, 0.9], int: 0.95, col: '#ffe9d6' },
      rim: { dir: [0.95, 0.3, -0.7], int: 3.0, col: '#ff9a5a' },
      rimFx: { col: '#ffb47e', str: 1.55, pow: 3.0, wrap: 0.06 },
      hemi: { sky: '#7f9cc8', ground: '#2a1810', int: 0.45 },
      exposure: 1.0, glow: { col: '#ffb07a', a: 0.62, size: 1.15 }, shadow: 0.4,
      idle: 0.5
    },
    select: {
      yaw: 12, pitch: 0, fore: 0, gunRot: [35, -20, -10], gunPos: [0.02, -0.06, 0.02],
      cam: { target: [0.02, 0.3, 0], az: 0, el: 8, fov: 26, fitH: 0.5, fitW: 0.5 },
      key: { dir: [-1, 1, 1], int: 1.3, col: '#ffeedd' },
      rim: { dir: [0.7, 0.5, -0.9], int: 1.65, col: '#d6ecff' },
      rimFx: { col: '#e6f4ff', str: 1.05, pow: 3.4, wrap: 0.12 },
      hemi: { sky: '#e2d8cc', ground: '#3a2418', int: 0.58 },
      exposure: 1.0, glow: { col: '#e2f1ff', a: 0.64, size: 1.08 }, shadow: 0.55,
      idle: 1
    }
  };

  /* ------------------------------------------------------------------ */
  var T;
  function lin(hex) { return new T.Color(hex).convertSRGBToLinear(); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function canvas(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = src; s.async = true; s.crossOrigin = 'anonymous';
      s.onload = res; s.onerror = function () { rej(new Error('load failed: ' + src)); };
      document.head.appendChild(s);
    });
  }
  var libPromise = null;
  function loadLibs() {
    if (!libPromise) libPromise = (global.THREE ? Promise.resolve() : loadScript(THREE_URL))
      .then(function () { return global.THREE.GLTFLoader ? null : loadScript(GLTF_URL); })
      .then(function () { if (!global.THREE || !global.THREE.GLTFLoader) throw new Error('three/GLTFLoader missing'); return global.THREE; });
    return libPromise;
  }
  function webglOK() {
    try { var c = document.createElement('canvas'); return !!(global.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); }
    catch (e) { return false; }
  }

  // Shared GLB / stamp cache per URL so several mounts load once.
  var assetCache = {};
  function loadAssets(url) {
    if (assetCache[url]) return assetCache[url];
    var glb = new Promise(function (res, rej) { new T.GLTFLoader().load(url, res, undefined, rej); });
    var img = new Promise(function (res) {
      var im = new Image(); im.onload = function () { res(im); }; im.onerror = function () { res(null); }; im.src = STAMP_SRC;
    });
    assetCache[url] = Promise.all([glb, img]);
    assetCache[url].catch(function () { delete assetCache[url]; });
    return assetCache[url];
  }

  /* ---------------------------- shaders ------------------------------ */
  // Rim (fresnel) term shared by every lit material.
  function rimChunk() {
    return [
      'vec3 rimV = normalize( vViewPosition );',
      'float rimF = pow( 1.0 - clamp( dot( normal, rimV ), 0.0, 1.0 ), uRimPow );',
      'float rimSide = smoothstep( -0.2, 0.9, dot( normalize( normal.xy + vec2( 1e-4 ) ), normalize( uRimDir.xy + vec2( 1e-4 ) ) ) );',
      'totalEmissiveRadiance += uRimColor * rimF * mix( rimSide, 1.0, uRimWrap ) * uRimStr;'
    ].join('\n');
  }
  var RIM_UNIFORMS = 'uniform vec3 uRimColor; uniform float uRimStr; uniform float uRimPow; uniform vec3 uRimDir; uniform float uRimWrap;\n';

  // The game's "shell" material: customColor * pow(clamp((vColor + .1647*hp) * 6), .5),
  // plus its planar stamp projection (eggStampNormal / eggStamp node blocks).
  function shellMaterial(U, opts) {
    var m = new T.MeshStandardMaterial({ color: lin(SHELL_RENDER), roughness: 0.62, metalness: 0, vertexColors: true, skinning: !!opts.skinning });
    m.onBeforeCompile = function (sh) {
      ['uRimColor', 'uRimStr', 'uRimPow', 'uRimDir', 'uRimWrap'].forEach(function (k) { sh.uniforms[k] = U[k]; });
      if (opts.stamp) { sh.uniforms.uStamp = U.uStamp; sh.uniforms.uStampOn = U.uStampOn; }
      if (opts.stamp) {
        sh.vertexShader = 'varying vec2 vStampUV; varying float vStampD;\n' + sh.vertexShader.replace('#include <begin_vertex>', [
          '#include <begin_vertex>',
          // stampPosition = (0,0) for this loadout, so the rotations collapse to identity
          'vec2 sUV = position.xy * 0.236 + vec2( 0.03125 );',
          'sUV.x = 0.0625 - sUV.x; sUV.y += 0.00125;',
          'vStampUV = sUV / 0.0625;',
          'vStampD = normal.z;'
        ].join('\n'));
      }
      sh.fragmentShader = RIM_UNIFORMS + (opts.stamp ? 'uniform sampler2D uStamp; uniform float uStampOn; varying vec2 vStampUV; varying float vStampD;\n' : '') +
        sh.fragmentShader
          .replace('#include <color_fragment>', [
            'diffuseColor.rgb *= pow( clamp( ( vColor.rgb + vec3( 0.16470588 ) ) * 6.0, 0.0, 1.0 ), vec3( 0.5 ) );',
            opts.stamp ? [
              'vec4 stampC = sRGBToLinear( texture2D( uStamp, clamp( vStampUV, 0.0, 1.0 ) ) );',
              'float stampA = stampC.a * step( vStampD, -0.1 ) * uStampOn;',
              'diffuseColor.rgb = mix( diffuseColor.rgb, stampC.rgb, stampA );'
            ].join('\n') : ''
          ].join('\n'))
          .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n' + rimChunk());
    };
    m.customProgramCacheKey = function () { return 'shell' + (opts.stamp ? 's' : '') + (opts.skinning ? 'k' : ''); };
    return m;
  }
  // The game's "standard" material: diffuse * vertex colour.
  function vcolMaterial(U, opts) {
    var m = new T.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: opts.rough || 0.55, metalness: opts.metal || 0, skinning: !!opts.skinning });
    m.onBeforeCompile = function (sh) {
      ['uRimColor', 'uRimStr', 'uRimPow', 'uRimDir', 'uRimWrap'].forEach(function (k) { sh.uniforms[k] = U[k]; });
      sh.uniforms.uRimScale = { value: opts.rim == null ? 1 : opts.rim };
      sh.fragmentShader = RIM_UNIFORMS + 'uniform float uRimScale;\n' + sh.fragmentShader
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n' + rimChunk().replace('* uRimStr;', '* uRimStr * uRimScale;'));
    };
    m.customProgramCacheKey = function () { return 'vcol' + (opts.skinning ? 'k' : '') + (opts.rim == null ? 1 : opts.rim); };
    return m;
  }
  // Inverted hull outline (screen-constant width).
  function outlineMat(thick, skinning) {
    var m = new T.MeshBasicMaterial({ color: 0x000000, side: T.BackSide, skinning: !!skinning });
    m.onBeforeCompile = function (sh) {
      sh.uniforms.uThick = { value: thick };
      sh.vertexShader = 'uniform float uThick;\n' + sh.vertexShader.replace('#include <project_vertex>', [
        '#include <project_vertex>',
        '#ifdef USE_SKINNING\n mat4 sM = boneMatX * skinWeight.x + boneMatY * skinWeight.y + boneMatZ * skinWeight.z + boneMatW * skinWeight.w;\n vec3 oN = normalize( normalMatrix * ( bindMatrixInverse * sM * bindMatrix * vec4( normal, 0.0 ) ).xyz );\n#else\n vec3 oN = normalize( normalMatrix * normal );\n#endif',
        'mvPosition.xyz += oN * uThick * ( -mvPosition.z );',
        'gl_Position = projectionMatrix * mvPosition;'
      ].join('\n'));
      sh.vertexShader = sh.vertexShader.replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>');
    };
    m.customProgramCacheKey = function () { return 'outline' + (skinning ? 'k' : ''); };
    m.color = lin('#0b0605');
    return m;
  }
  function glintTexture() {
    var S = 128, c = canvas(S, S), x = c.getContext('2d');
    var g = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.12, 'rgba(255,255,255,0.7)'); g.addColorStop(0.4, 'rgba(255,255,255,0.08)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, S, S);
    x.globalCompositeOperation = 'lighter';
    [[S, 3], [3, S * 0.8]].forEach(function (d) {
      var lg = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
      lg.addColorStop(0, 'rgba(255,255,255,0.95)'); lg.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = lg; x.fillRect((S - d[0]) / 2, (S - d[1]) / 2, d[0], d[1]);
    });
    return new T.CanvasTexture(c);
  }
  function radialTexture(stops, S) {
    S = S || 128;
    var c = canvas(S, S), x = c.getContext('2d');
    var g = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    stops.forEach(function (s) { g.addColorStop(s[0], s[1]); });
    x.fillStyle = g; x.fillRect(0, 0, S, S);
    return new T.CanvasTexture(c);
  }

  /* ------------------------------------------------------------------ */
  /* Build the player rig from the pruned game GLB                       */
  /* ------------------------------------------------------------------ */
  function buildRig(gltf, stampImg, U, opts) {
    var src = gltf.scene, byName = {};
    src.traverse(function (o) { if (o.name && !byName[o.name]) byName[o.name] = o; });
    function get(n) { var o = byName[n]; if (!o) throw new Error('missing node ' + n); return o; }
    var disposables = [];
    function keep(o) { disposables.push(o); return o; }

    // Game hierarchy (Dk): mesh > egg(y .32) > hat(y -.02); mesh > head(y .3) > gunHand(rot y .14, x .035) > hands, gun
    var flip = new T.Group(); flip.rotation.y = Math.PI;              // game eggs face -z
    var mesh = new T.Group(); flip.add(mesh);
    var egg = get('egg'), hat = get('hat_roundglasses');
    var eggG = new T.Group(); eggG.position.y = 0.32; mesh.add(eggG);
    egg.position.set(0, 0, 0); eggG.add(egg);
    hat.position.set(0, -0.02, 0); eggG.add(hat);
    var head = new T.Group(); head.position.y = 0.3; mesh.add(head);
    var gE = new T.Group(); gE.rotation.order = 'YXZ'; gE.rotation.set(0.035, 0.14, 0); head.add(gE);

    var hands = get('hands'), handsSkel = get('hands_skeleton');
    var gun = get('gun_m24_SnakeAlbino'), gunSkel = get('gun_m24_skeleton');
    gE.add(handsSkel); gE.add(hands); gE.add(gunSkel); gE.add(gun);

    // materials
    var stampTex = keep(new T.Texture(stampImg || undefined));
    stampTex.encoding = T.sRGBEncoding; stampTex.needsUpdate = !!stampImg;
    stampTex.wrapS = stampTex.wrapT = T.ClampToEdgeWrapping; stampTex.generateMipmaps = true; stampTex.anisotropy = 4;
    U.uStamp = { value: stampTex }; U.uStampOn = { value: stampImg ? 1 : 0 };
    var eggMat = keep(shellMaterial(U, { stamp: true }));
    var handMat = keep(shellMaterial(U, { skinning: true }));
    var hatMat = keep(vcolMaterial(U, { rough: 0.85, rim: 0.12 })); hatMat.color = lin('#a3acb6');
    var gunMat = keep(vcolMaterial(U, { rough: 0.6, skinning: true, rim: 0.6 }));
    egg.material = eggMat; hands.material = handMat; hat.material = hatMat; gun.material = gunMat;
    [egg, hands, hat, gun].forEach(function (m) { m.frustumCulled = false; keep(m.geometry); });

    // lens glint (sprite on the hat's left lens, i.e. the game's +x side)
    hat.geometry.computeBoundingBox();
    var hb = hat.geometry.boundingBox;
    var glintMat = keep(new T.SpriteMaterial({ map: keep(glintTexture()), blending: T.AdditiveBlending, depthWrite: false, depthTest: false, transparent: true, opacity: 0, toneMapped: false }));
    var glint = new T.Sprite(glintMat);
    glint.position.set(hb.min.x * 0.7, hb.max.y - (hb.max.y - hb.min.y) * 0.18, hb.min.z - 0.01);
    glint.scale.setScalar(0.11); glint.renderOrder = 5; hat.add(glint);

    // outlines (egg + hands), like a clean thumbnail render
    if (opts.outline !== false) {
      var oEgg = new T.Mesh(egg.geometry, keep(outlineMat(0.0036, false))); egg.add(oEgg);
      var oHand = new T.SkinnedMesh(hands.geometry, keep(outlineMat(0.003, true)));
      oHand.bind(hands.skeleton, hands.bindMatrix); oHand.frustumCulled = false;
      hands.parent.add(oHand);
    }

    // Gun rest pose = first frame of "fire" (PC(FE, "fire"))
    var mixer = new T.AnimationMixer(flip);
    var fire = gltf.animations.filter(function (a) { return a.name === 'fire'; })[0];
    if (fire) { var act = mixer.clipAction(fire); act.play(); mixer.setTime(0); act.paused = true; }
    function boneIn(root, name) { var r = null; root.traverse(function (o) { if (!r && o.isBone && o.name.replace(/_\d+$/, '') === name) r = o; }); return r; }
    var hGrip = boneIn(handsSkel, 'gripHand'), hFore = boneIn(handsSkel, 'foreHand');
    var wGrip = boneIn(gunSkel, 'gripHand'), wFore = boneIn(gunSkel, 'foreHand');
    // inventory "free" fore hand: position (-.34,-.12,-.1), rotation (.3,1.5,-1.7)
    var freeFore = { p: new T.Vector3(-0.34, -0.12, -0.1), q: new T.Quaternion().setFromEuler(new T.Euler(0.3, 1.5, -1.7, 'YXZ')) };

    return {
      root: flip, mesh: mesh, glintMat: glintMat, eggG: eggG, head: head, gE: gE, mixer: mixer,
      hGrip: hGrip, hFore: hFore, wGrip: wGrip, wFore: wFore, freeFore: freeFore,
      disposables: disposables
    };
  }

  /* ------------------------------------------------------------------ */
  /* Pose state helpers                                                   */
  /* ------------------------------------------------------------------ */
  function resolve(p) {
    var o = {};
    Object.keys(p).forEach(function (k) {
      var v = p[k];
      if (typeof v === 'string') o[k] = lin(v);
      else if (Array.isArray(v)) o[k] = new T.Vector3().fromArray(v);
      else if (typeof v === 'number') o[k] = v;
      else o[k] = resolve(v);
    });
    if (p.cam) {
      if (o.tilt == null) o.tilt = 0; if (!o.gunPos) o.gunPos = new T.Vector3(); if (!o.gunRot) o.gunRot = new T.Vector3();
      if (o.foreScale == null) o.foreScale = 1; if (o.glint == null) o.glint = 0;
      if (!o.foreP) o.foreP = new T.Vector3(-0.34, -0.12, -0.1); if (!o.foreR) o.foreR = new T.Vector3(0.3, 1.5, -1.7);
    }
    return o;
  }
  function cloneState(s) {
    var o = {};
    Object.keys(s).forEach(function (k) { var v = s[k]; o[k] = (typeof v === 'number') ? v : (v.clone ? v.clone() : cloneState(v)); });
    return o;
  }
  function lerpState(out, a, b, t) {
    Object.keys(b).forEach(function (k) {
      var A = a[k], B = b[k];
      if (typeof B === 'number') out[k] = A + (B - A) * t;
      else if (B.isVector3 || B.isColor) out[k].copy(A).lerp(B, t);
      else lerpState(out[k], A, B, t);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Public mount                                                         */
  /* ------------------------------------------------------------------ */
  function mount(container, options) {
    var opts = Object.assign({ pose: 'hero', interactive: true, pixelRatio: 2, glow: true, outline: true }, options || {});
    if (POSE_NAMES.indexOf(opts.pose) < 0) opts.pose = 'hero';
    var poseName = opts.pose;
    var api = { pose: poseName, mode: 'pending', ready: null };
    var impl = null, img = null, destroyed = false, wantPaused = false;

    function fallbackURL(name) {
      if (typeof opts.fallbackSrc === 'function') return opts.fallbackSrc(name);
      return (opts.fallbackSrc != null ? opts.fallbackSrc : SCRIPT_DIR) + 'egg-' + name + '.png';
    }
    function useFallback() {
      if (destroyed || img) return;
      api.mode = 'fallback';
      img = document.createElement('img');
      img.alt = "Michael's Shell Shockers egg: dark brown shell, round glasses, LCC stamp, Albino Crackshot";
      img.decoding = 'async';
      img.style.cssText = 'display:block;width:100%;height:100%;object-fit:contain;';
      img.src = fallbackURL(poseName);
      if (opts.backdrop) container.style.background = opts.backdrop;
      container.appendChild(img);
    }

    api.setPose = function (name, o) {
      if (POSE_NAMES.indexOf(name) < 0) return Promise.resolve();
      poseName = name; api.pose = name;
      if (impl) return impl.setPose(name, o || {});
      if (img) img.src = fallbackURL(name);
      return Promise.resolve();
    };
    api.pause = function () { wantPaused = true; impl && impl.pause(); };
    api.resume = function () { wantPaused = false; impl && impl.resume(); };
    api.destroy = function () {
      destroyed = true; impl && impl.destroy(); impl = null;
      if (img && img.parentNode) img.parentNode.removeChild(img); img = null;
    };
    api.snapshot = function (o) { return impl ? impl.snapshot(o || {}) : null; };
    api.info = function () { return impl ? impl.info() : { mode: api.mode }; };

    if (!webglOK()) { useFallback(); api.ready = Promise.resolve(api); return api; }
    api.ready = loadLibs().then(function (THREE) {
      T = THREE;
      return loadAssets(opts.glbUrl || (SCRIPT_DIR + 'egg-loadout.glb'));
    }).then(function (res) {
      if (destroyed) return api;
      try { impl = createImpl(container, opts, poseName, res[0], res[1]); api.mode = 'webgl'; }
      catch (e) { global.console && console.warn('[SandboxEgg] init failed, using PNG', e); useFallback(); return api; }
      impl.onLost = function () { impl && impl.destroy(); impl = null; useFallback(); };
      if (wantPaused) impl.pause();
      return api;
    }).catch(function (e) { global.console && console.warn('[SandboxEgg] load failed, using PNG', e); useFallback(); return api; });
    return api;
  }

  function createImpl(container, opts, startPose, gltfSrc, stampImg) {
    // Each mount needs its own copy of the skinned scene graph.
    var gltf = { scene: cloneSkinned(gltfSrc.scene), animations: gltfSrc.animations };

    var renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, opts.pixelRatio || 2));
    if (opts.backdrop) renderer.setClearColor(new T.Color(opts.backdrop), 1); else renderer.setClearColor(0x000000, 0);
    var cvs = renderer.domElement;
    cvs.style.cssText = 'display:block;width:100%;height:100%;outline:none;';
    cvs.setAttribute('role', 'img');
    cvs.setAttribute('aria-label', "Michael's Shell Shockers egg: dark brown shell, round glasses, LCC stamp, Albino Crackshot");
    container.appendChild(cvs);

    var U = {
      uRimColor: { value: new T.Color() }, uRimStr: { value: 1 }, uRimPow: { value: 3 },
      uRimDir: { value: new T.Vector3(1, 0, 0) }, uRimWrap: { value: 0.2 }
    };
    var scene = new T.Scene();
    var R = buildRig(gltf, stampImg, U, opts);
    scene.add(R.root);

    // glow card + contact shadow
    var glowTex = radialTexture([[0, 'rgba(255,255,255,1)'], [0.42, 'rgba(255,255,255,0.85)'], [0.55, 'rgba(255,255,255,0.35)'], [0.75, 'rgba(255,255,255,0.08)'], [1, 'rgba(255,255,255,0)']], 256);
    var glowMat = new T.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, opacity: 0, toneMapped: false });
    var glow = new T.Mesh(new T.PlaneGeometry(1, 1), glowMat); glow.renderOrder = -10; glow.visible = opts.glow !== false; scene.add(glow);
    var shTex = radialTexture([[0, 'rgba(0,0,0,0.9)'], [0.45, 'rgba(0,0,0,0.45)'], [1, 'rgba(0,0,0,0)']]);
    var shMat = new T.MeshBasicMaterial({ map: shTex, transparent: true, depthWrite: false, opacity: 0.5, toneMapped: false });
    var shadow = new T.Mesh(new T.PlaneGeometry(0.85, 0.85), shMat);
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = -0.005; shadow.renderOrder = -5; scene.add(shadow);

    var key = new T.DirectionalLight(0xffffff, 1); scene.add(key, key.target);
    var rim = new T.DirectionalLight(0xffffff, 1); scene.add(rim, rim.target);
    var hemi = new T.HemisphereLight(0xffffff, 0x000000, 0.8); scene.add(hemi);

    var camera = new T.PerspectiveCamera(26, 1, 0.05, 50);
    var cur = resolve(POSES[startPose]), tween = null;
    var reduceMQ = global.matchMedia ? global.matchMedia('(prefers-reduced-motion: reduce)') : null;
    var reduced = opts.motion === false || !!(reduceMQ && reduceMQ.matches);
    var paused = false, onScreen = true, pageVisible = !document.hidden, destroyed = false;
    var raf = 0, last = 0, clock = 0, frames = 0, fpsT = 0, fps = 0;
    var size = { w: 1, h: 1 }, self = {};

    // look-at state: critically damped spring toward target yaw/pitch (radians)
    var look = { yaw: 0, pitch: 0, vy: 0, vp: 0, ty: 0, tp: 0, mode: 'idle', lastInput: -1e9, idleNext: 0, hop: 0, hopV: 0 };
    // turning right swings the gun hand across the face, so that side stops earlier
    var YAW_MAX = 62 * DEG, YAW_MAX_R = 46 * DEG, PITCH_MAX = 28 * DEG, OMEGA = 9.5;

    var v1 = new T.Vector3(), q1 = new T.Quaternion(), eul = new T.Euler();

    function resize() {
      var w = Math.max(1, container.clientWidth), h = Math.max(1, container.clientHeight);
      if (w === size.w && h === size.h) return false;
      size.w = w; size.h = h; renderer.setSize(w, h, false); camera.aspect = w / h;
      return true;
    }

    function apply(time) {
      var c = cur, live = !reduced;
      // camera
      var aspect = size.w / size.h, tanH = Math.tan(c.cam.fov * DEG / 2);
      var dist = Math.max(c.cam.fitH / tanH, c.cam.fitW / (tanH * aspect));
      var az = c.cam.az * DEG, el = c.cam.el * DEG;
      camera.fov = c.cam.fov;
      camera.position.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(dist).add(c.cam.target);
      camera.lookAt(c.cam.target); camera.updateProjectionMatrix(); camera.updateMatrixWorld();

      // paper-doll rig (wk.update): mesh.rotation.y = rotY, head.rotation.x = rotX, mesh.rotation.x = .5 rotX, mesh.position.x = .1 rotY
      var bob = live ? Math.sin(time * 2.0) * 0.006 * c.idle : 0;
      var ky = clamp(Math.abs(look.yaw) / (look.yaw > 0 ? YAW_MAX_R : YAW_MAX), 0, 1), kp = clamp(Math.abs(look.pitch) / PITCH_MAX, 0, 1);
      var yaw = c.yaw * DEG * (1 - ky) + look.yaw, pitch = c.pitch * DEG * (1 - kp) + look.pitch;
      R.mesh.rotation.order = 'YXZ';
      R.mesh.rotation.set(0.5 * pitch, yaw, -c.tilt * DEG);
      R.mesh.position.set(0.1 * yaw * 0.25, Math.max(0, look.hop) + bob, 0);
      R.head.rotation.x = pitch;
      R.gE.position.copy(c.gunPos); R.gE.rotation.set(0.035 + c.gunRot.x * DEG, 0.14 + c.gunRot.y * DEG, c.gunRot.z * DEG);

      // hands follow weapon bones (handsToWeaponSkeleton); fore hand blends to the inventory rest
      R.hGrip.position.copy(R.wGrip.position); R.hGrip.quaternion.copy(R.wGrip.quaternion);
      R.hFore.position.copy(c.foreP).lerp(R.wFore.position, c.fore);
      eul.set(c.foreR.x, c.foreR.y, c.foreR.z, 'YXZ');
      q1.setFromEuler(eul).slerp(R.wFore.quaternion, c.fore); R.hFore.quaternion.copy(q1);
      R.hFore.scale.setScalar(Math.max(c.foreScale, 1e-4));
      R.glintMat.opacity = c.glint * (live ? 0.75 + 0.25 * Math.sin(time * 2.4) : 0.9); R.glintMat.rotation = live ? time * 0.3 : 0.2;

      // lights (camera space -> world)
      key.color.copy(c.key.col); key.intensity = c.key.int;
      key.position.copy(c.key.dir).normalize().applyQuaternion(camera.quaternion).multiplyScalar(5).add(c.cam.target); key.target.position.copy(c.cam.target);
      rim.color.copy(c.rim.col); rim.intensity = c.rim.int;
      rim.position.copy(c.rim.dir).normalize().applyQuaternion(camera.quaternion).multiplyScalar(5).add(c.cam.target); rim.target.position.copy(c.cam.target);
      hemi.color.copy(c.hemi.sky); hemi.groundColor.copy(c.hemi.ground); hemi.intensity = c.hemi.int;
      U.uRimColor.value.copy(c.rimFx.col); U.uRimStr.value = c.rimFx.str; U.uRimPow.value = c.rimFx.pow; U.uRimWrap.value = c.rimFx.wrap;
      U.uRimDir.value.copy(c.rim.dir).normalize();
      renderer.toneMappingExposure = c.exposure;

      // glow behind the egg, facing the camera
      v1.set(0, 0.34, 0).sub(camera.position).normalize();
      glow.position.set(0, 0.32, 0).addScaledVector(v1, 0.6);
      glow.quaternion.copy(camera.quaternion);
      glow.scale.setScalar(c.glow.size);
      glowMat.color.copy(c.glow.col); glowMat.opacity = c.glow.a;
      shMat.opacity = c.shadow * (1 - clamp(look.hop * 12, 0, 0.6));
      shadow.position.x = R.mesh.position.x;
    }

    function render(time) { apply(time); renderer.render(scene, camera); }

    function stepLook(dt, now) {
      if (reduced || !opts.interactive) { look.yaw = look.pitch = look.vy = look.vp = 0; return; }
      if (look.mode === 'pointer' && now - look.lastInput > 15000) look.mode = 'idle';
      if (look.mode === 'idle') {
        // the game's paper-doll idle: pick a new random look every 1.5-4.5 s, with a tiny hop on big turns
        look.idleNext -= dt;
        if (look.idleNext <= 0) {
          var ny = Math.random() * 2 - 1; ny *= (ny > 0 ? YAW_MAX_R : YAW_MAX) * 0.8; var np = (Math.random() * 0.9 - 0.45) * PITCH_MAX;
          if (Math.abs(ny - look.ty) > YAW_MAX * 0.6 && look.hop <= 0) look.hopV = 0.32;
          look.ty = ny; look.tp = np; look.idleNext = 1.5 + Math.random() * 3;
        }
      }
      var w = look.mode === 'idle' ? OMEGA * 0.55 : OMEGA;
      look.vy += (w * w * (look.ty - look.yaw) - 2 * w * look.vy) * dt; look.yaw += look.vy * dt;
      look.vp += (w * w * (look.tp - look.pitch) - 2 * w * look.vp) * dt; look.pitch += look.vp * dt;
      // hop (gravity)
      if (look.hop > 0 || look.hopV > 0) { look.hopV -= 5.5 * dt; look.hop += look.hopV * dt * 0.12; if (look.hop <= 0) { look.hop = 0; look.hopV = 0; } }
    }

    function shouldLoop() { return !destroyed && !paused && onScreen && pageVisible && (!reduced || !!tween); }
    function frame(now) {
      raf = 0;
      if (!shouldLoop()) { renderStill(); return; }
      var dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016; last = now;
      if (!reduced) clock += dt;
      frames++; fpsT += dt; if (fpsT >= 0.5) { fps = frames / fpsT; frames = 0; fpsT = 0; }
      if (tween) {
        tween.t += dt * 1000;
        var k = clamp(tween.t / tween.d, 0, 1);
        lerpState(cur, tween.from, tween.to, reduced ? 1 : easeInOutCubic(k));
        if (k >= 1) { var done = tween.done; tween = null; done(); }
      }
      stepLook(dt, now);
      resize();
      render(clock);
      raf = requestAnimationFrame(frame);
    }
    function kick() { if (destroyed) return; if (shouldLoop()) { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } } else renderStill(); }
    var stillQueued = false;
    function renderStill() {
      if (destroyed || stillQueued || !onScreen) return;
      stillQueued = true;
      requestAnimationFrame(function () { stillQueued = false; if (destroyed) return; resize(); render(reduced ? 0 : clock); });
    }

    self.setPose = function (name, o) {
      var to = resolve(POSES[name]);
      var d = (o && o.duration != null) ? o.duration : 600;
      if (tween) tween.done();
      if (reduced || d <= 0) { cur = to; tween = null; renderStill(); return Promise.resolve(); }
      return new Promise(function (res) { tween = { from: cloneState(cur), to: to, t: 0, d: d, done: res }; kick(); });
    };
    self.pause = function () { paused = true; if (raf) { cancelAnimationFrame(raf); raf = 0; } };
    self.resume = function () { paused = false; kick(); };
    self.info = function () {
      return { mode: 'webgl', fps: Math.round(fps * 10) / 10, running: !!raf, reducedMotion: reduced, look: look.mode,
        lookDeg: [Math.round(look.yaw / DEG * 10) / 10, Math.round(look.pitch / DEG * 10) / 10],
        drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles,
        pixelRatio: renderer.getPixelRatio(), size: [size.w, size.h] };
    };
    self.snapshot = function (o) {
      var w = o.width || 1200, h = o.height || Math.round(w * 0.75);
      var prevPR = renderer.getPixelRatio();
      var clear = renderer.getClearColor(new T.Color()), alpha = renderer.getClearAlpha();
      if (tween) { lerpState(cur, tween.from, tween.to, 1); var dn = tween.done; tween = null; dn(); }
      var saved = { yaw: look.yaw, pitch: look.pitch, hop: look.hop };
      look.yaw = o.yaw || 0; look.pitch = o.pitch || 0; look.hop = 0;
      renderer.setPixelRatio(1); renderer.setSize(w, h, false);
      size.w = w; size.h = h; camera.aspect = w / h;
      if (o.backdrop) renderer.setClearColor(new T.Color(o.backdrop), 1); else renderer.setClearColor(0x000000, 0);
      render(0);
      var url = cvs.toDataURL('image/png');
      look.yaw = saved.yaw; look.pitch = saved.pitch; look.hop = saved.hop;
      renderer.setClearColor(clear, alpha);
      renderer.setPixelRatio(prevPR); size.w = -1; resize(); renderStill();
      return url;
    };
    // test hook: aim the look-at at a page point as if the cursor were there
    self.lookAt = function (x, y) { onPointer({ clientX: x, clientY: y, pointerType: 'mouse' }); kick(); };

    // Pointer anywhere on the page steers the look (mouse/pen); touch follows the finger while pressed.
    function aimFrom(x, y) {
      // each side is normalised by its own distance to the window edge, so the egg turns fully both ways
      // wherever it sits on the page; a soft curve keeps small moves near it lively
      var r = container.getBoundingClientRect(), W = global.innerWidth, H = global.innerHeight;
      var cx = r.left + r.width / 2, cy = r.top + r.height * 0.42;
      var dx = x - cx, dy = y - cy;
      var nx = clamp(dx / Math.max(dx < 0 ? cx : W - cx, 80), -1, 1);
      var ny = clamp(dy / Math.max(dy < 0 ? cy : H - cy, 80), -1, 1);
      nx = (nx < 0 ? -1 : 1) * Math.pow(Math.abs(nx), 0.75);
      ny = (ny < 0 ? -1 : 1) * Math.pow(Math.abs(ny), 0.75);
      // the rig's +pitch tips the face up, so a cursor below the egg (ny > 0) needs negative pitch
      look.ty = nx * (nx > 0 ? YAW_MAX_R : YAW_MAX); look.tp = -ny * PITCH_MAX;
    }
    // Mouse / pen via pointer events. Touch via touch events, which keep firing while the page scrolls
    // (pointer events get cancelled), so the egg follows the finger for the whole drag without blocking scroll.
    function onPointer(e) {
      if (!opts.interactive || reduced || e.pointerType === 'touch') return;
      look.mode = 'pointer'; look.lastInput = performance.now();
      aimFrom(e.clientX, e.clientY); kick();
    }
    function onTouch(e) {
      if (!opts.interactive || reduced) return;
      var tc = e.touches && e.touches[0]; if (!tc) return;
      look.mode = 'touch'; look.lastInput = performance.now();
      aimFrom(tc.clientX, tc.clientY); kick();
    }
    function onTouchEnd(e) {
      if (e.touches && e.touches.length) return;
      if (look.mode === 'touch') { look.mode = 'idle'; look.idleNext = 1.2; }
    }
    // mouse left the window: drift back to the idle look shortly after
    function onOut(e) { if (!e.relatedTarget && look.mode === 'pointer') { look.mode = 'idle'; look.idleNext = 1.2; kick(); } }
        if (opts.interactive) {
      global.addEventListener('pointermove', onPointer, { passive: true });
      document.addEventListener('pointerout', onOut, { passive: true });
      global.addEventListener('touchstart', onTouch, { passive: true });
      global.addEventListener('touchmove', onTouch, { passive: true });
      global.addEventListener('touchend', onTouchEnd, { passive: true });
      global.addEventListener('touchcancel', onTouchEnd, { passive: true });
    }

    var io = null;
    if (global.IntersectionObserver) {
      io = new IntersectionObserver(function (es) {
        onScreen = es[es.length - 1].isIntersecting;
        if (onScreen) kick(); else if (raf) { cancelAnimationFrame(raf); raf = 0; }
      }, { rootMargin: '64px' });
      io.observe(container);
    }
    function onVis() { pageVisible = !document.hidden; if (pageVisible) kick(); else if (raf) { cancelAnimationFrame(raf); raf = 0; } }
    document.addEventListener('visibilitychange', onVis);
    function onMQ() { reduced = opts.motion === false || reduceMQ.matches; kick(); renderStill(); }
    if (reduceMQ) reduceMQ.addEventListener ? reduceMQ.addEventListener('change', onMQ) : reduceMQ.addListener(onMQ);
    var ro = global.ResizeObserver ? new ResizeObserver(function () { if (resize()) renderStill(); }) : null;
    ro && ro.observe(container);
    function onWinResize() { if (resize()) renderStill(); }
    if (!ro) global.addEventListener('resize', onWinResize);
    cvs.addEventListener('webglcontextlost', function (e) { e.preventDefault(); self.onLost && self.onLost(); });

    self.destroy = function () {
      if (destroyed) return; destroyed = true;
      if (raf) cancelAnimationFrame(raf); raf = 0;
      io && io.disconnect(); ro && ro.disconnect();
      global.removeEventListener('resize', onWinResize);
      global.removeEventListener('pointermove', onPointer);
      document.removeEventListener('pointerout', onOut);
      global.removeEventListener('touchstart', onTouch);
      global.removeEventListener('touchmove', onTouch);
      global.removeEventListener('touchend', onTouchEnd);
      global.removeEventListener('touchcancel', onTouchEnd);
      document.removeEventListener('visibilitychange', onVis);
      if (reduceMQ) reduceMQ.removeEventListener ? reduceMQ.removeEventListener('change', onMQ) : reduceMQ.removeListener(onMQ);
      R.disposables.forEach(function (d) { d && d.dispose && d.dispose(); });
      [glowTex, glowMat, shTex, shMat, glow.geometry, shadow.geometry].forEach(function (d) { d.dispose(); });
      renderer.dispose();
      if (cvs.parentNode) cvs.parentNode.removeChild(cvs);
    };

    resize(); render(0); kick();
    return self;
  }

  // Clone a scene that contains SkinnedMeshes, rebinding to the cloned bones (SkeletonUtils.clone, inlined).
  function cloneSkinned(source) {
    var srcLookup = new Map(), cloneLookup = new Map();
    var clone = source.clone();
    (function walk(a, b) { srcLookup.set(b, a); cloneLookup.set(a, b); for (var i = 0; i < a.children.length; i++) walk(a.children[i], b.children[i]); })(source, clone);
    clone.traverse(function (node) {
      if (!node.isSkinnedMesh) return;
      var srcMesh = srcLookup.get(node), srcBones = srcMesh.skeleton.bones;
      node.skeleton = srcMesh.skeleton.clone();
      node.bindMatrix.copy(srcMesh.bindMatrix);
      node.skeleton.bones = srcBones.map(function (b) { return cloneLookup.get(b); });
      node.bind(node.skeleton, node.bindMatrix);
    });
    return clone;
  }

  global.SandboxEgg = { mount: mount, poses: POSE_NAMES.slice(), poseData: POSES, version: '2.0.0' };
})(typeof window !== 'undefined' ? window : this);
