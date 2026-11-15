// sky.js — black sky (no atmosphere), stars, the low Sun, and Earth near the horizon.
// Sky objects follow the camera so they behave as if infinitely far away.
import * as THREE from 'three';
import { SKY } from '../config/gameplay.js';
import { skyDirection } from '../systems/daycycle.js';
import { mulberry32 } from './heightfield.js';
import { bvToTemperatureK, temperatureToRgb } from '../systems/skyMath.js';

const SUN_DIST = 2000;
const EARTH_DIST = 1900;
const STAR_DIST = 2400;
const UP = new THREE.Vector3(0, 1, 0);

function discRadius(angularDiameterDeg, dist) {
  return Math.tan(((angularDiameterDeg * SKY.SKY_DISC_SCALE) / 2) * (Math.PI / 180)) * dist;
}

function radialTexture(stops, size = 256) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [o, c] of stops) g.addColorStop(o, c);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Placeholder Earth texture: oceans, blobby continents, clouds, ice caps (not real geography). */
function earthTexture() {
  const w = 512;
  const h = 256;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#1f5fae';
  ctx.fillRect(0, 0, w, h);
  const rand = mulberry32(7);
  const blob = (color, n, rMin, rMax, yMin, yMax) => {
    ctx.fillStyle = color;
    for (let i = 0; i < n; i++) {
      const cx = rand() * w;
      const cy = yMin + rand() * (yMax - yMin);
      const parts = 4 + Math.floor(rand() * 5);
      for (let p = 0; p < parts; p++) {
        const r = rMin + rand() * (rMax - rMin);
        ctx.beginPath();
        ctx.ellipse(cx + (rand() - 0.5) * r * 2.2, cy + (rand() - 0.5) * r, r * 1.3, r, rand() * 3, 0, Math.PI * 2);
        ctx.fill();
        if (cx < rMax * 2) {
          ctx.beginPath();
          ctx.ellipse(cx + w, cy, r * 1.3, r, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  };
  blob('#3f8f4a', 7, 10, 26, 50, 200);
  blob('#b59a62', 4, 6, 14, 90, 160);
  ctx.globalAlpha = 0.75;
  blob('#ffffff', 22, 4, 12, 20, 236);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#f4f7fb';
  ctx.fillRect(0, 0, w, 14);
  ctx.fillRect(0, h - 16, w, 16);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}

export function createSky({ starCount = 2600 } = {}) {
  const group = new THREE.Group();
  group.name = 'sky';

  // --- stars: the REAL sky (Yale Bright Star Catalog via NASA HEASARC) -----------------
  // Filled in by setStars() once the catalog has loaded. Positions are built for sky turn 0;
  // the whole star group then rotates about "up" as the sky turns (systems/skyMath.js).
  const starGroup = new THREE.Group();
  starGroup.name = 'realStars';
  group.add(starGroup);
  const starMat = new THREE.ShaderMaterial({
    uniforms: { pixelRatio: { value: 1 }, maxMag: { value: 9 } },
    vertexShader: /* glsl */ `
      attribute float aSize;
      attribute float aMag;
      attribute vec3 aColor;
      uniform float pixelRatio;
      uniform float maxMag;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vColor = aColor;
        vAlpha = aMag > maxMag ? 0.0 : clamp(1.15 - aMag * 0.13, 0.25, 1.0);
        gl_PointSize = aSize * pixelRatio;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.15, d) * vAlpha;
        if (a < 0.02) discard;
        gl_FragColor = vec4(vColor * 1.25, a);
      }`,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });
  let starPoints = null;
  // constellation lines + names you have found (fade in when you look toward them)
  const figures = new Map(); // id → { line, label, dir: Vector3 (turn-0 frame), fade }
  let labelsOn = true;
  const tmpDir = new THREE.Vector3();
  const viewDir = new THREE.Vector3();

  function starPos(lon, lat, dist = STAR_DIST) {
    const d = skyDirection(lon, -lat); // altitude = −ecliptic latitude (turn 0)
    return new THREE.Vector3(d.x, d.y, d.z).multiplyScalar(dist);
  }

  function nameSprite(text) {
    const cv = document.createElement('canvas');
    cv.width = 512;
    cv.height = 96;
    const c = cv.getContext('2d');
    c.font = '600 54px Fredoka, Nunito, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.lineWidth = 8;
    c.strokeStyle = 'rgba(0,0,0,0.75)';
    c.strokeText(text, 256, 48);
    c.fillStyle = '#bfefff';
    c.fillText(text, 256, 48);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false, opacity: 0 }));
    sp.scale.set(STAR_DIST * 0.34, STAR_DIST * 0.064, 1);
    return sp;
  }

  // --- sun -----------------------------------------------------------------
  const sunR = discRadius(SKY.SUN_ANGULAR_DIAMETER_DEG, SUN_DIST);
  const sunCore = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: radialTexture([
        [0, '#ffffff'],
        [0.42, '#fffdf4'],
        [0.5, 'rgba(255,248,225,0.9)'],
        [0.62, 'rgba(255,240,200,0.0)'],
      ]),
      depthWrite: false,
      fog: false,
      toneMapped: false,
    }),
  );
  sunCore.material.color.setScalar(10); // HDR-bright: the Sun blooms
  sunCore.scale.setScalar(sunR * 2 * 2);
  const sunGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: radialTexture([
        [0, 'rgba(255,250,235,0.9)'],
        [0.08, 'rgba(255,244,220,0.45)'],
        [0.25, 'rgba(255,236,200,0.12)'],
        [0.6, 'rgba(255,230,190,0.03)'],
        [1, 'rgba(255,230,190,0)'],
      ]),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
      toneMapped: false,
    }),
  );
  sunGlow.material.color.setScalar(1.6);
  sunGlow.scale.setScalar(sunR * 2 * 22);
  const sun = new THREE.Group();
  sun.add(sunGlow, sunCore);
  group.add(sun);

  // --- earth (phase computed from the real Sun direction) --------------------
  const earthR = discRadius(SKY.EARTH_ANGULAR_DIAMETER_DEG, EARTH_DIST);
  const earthMat = new THREE.ShaderMaterial({
    uniforms: {
      map: { value: earthTexture() },
      sunDir: { value: new THREE.Vector3(1, 0, 0) },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vNormalW;
      void main() {
        vUv = uv;
        vNormalW = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D map;
      uniform vec3 sunDir;
      varying vec2 vUv;
      varying vec3 vNormalW;
      void main() {
        vec3 col = texture2D(map, vUv).rgb;
        float lit = smoothstep(-0.08, 0.18, dot(normalize(vNormalW), sunDir));
        vec3 night = col * 0.035;
        gl_FragColor = vec4(mix(night, col * 1.05, lit), 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const earth = new THREE.Mesh(new THREE.SphereGeometry(earthR, 40, 24), earthMat);
  earth.rotation.z = (23.4 * Math.PI) / 180; // Earth's axial tilt (NASA Earth Fact Sheet)
  const earthPivot = new THREE.Group();
  earthPivot.add(earth);
  group.add(earthPivot);

  const earthDir = skyDirection(SKY.EARTH_AZIMUTH_DEG, SKY.EARTH_ELEVATION_DEG);
  const tmp = new THREE.Vector3();

  return {
    group,
    /**
     * @param camera  THREE.Camera (sky follows it)
     * @param sunDir  {x,y,z} unit vector to the Sun
     * @param earthSpin  radians — Earth's rotation from the game clock
     */
    update(camera, sunDirVec, earthSpin, skyTurnDeg = 0) {
      group.position.copy(camera.position);
      // the sky's turn: azimuth = λ + θ  →  rotate the star group by −θ about "up"
      starGroup.rotation.y = (-skyTurnDeg * Math.PI) / 180;
      if (figures.size) {
        camera.getWorldDirection(viewDir);
        for (const f of figures.values()) {
          tmpDir.copy(f.dir).applyAxisAngle(UP, starGroup.rotation.y);
          const target = labelsOn && tmpDir.dot(viewDir) > 0.9 ? 1 : 0; // within ~25° of your view
          f.fade += (target - f.fade) * 0.06;
          f.line.material.opacity = f.fade * 0.55;
          f.label.material.opacity = f.fade;
          f.line.visible = f.label.visible = f.fade > 0.01;
        }
      }
      tmp.set(sunDirVec.x, sunDirVec.y, sunDirVec.z).multiplyScalar(SUN_DIST);
      sun.position.copy(tmp);
      earthPivot.position.set(earthDir.x, earthDir.y, earthDir.z).multiplyScalar(EARTH_DIST);
      earth.rotation.y = earthSpin;
      earthMat.uniforms.sunDir.value.set(sunDirVec.x, sunDirVec.y, sunDirVec.z);
    },
    /** Low quality: draw only the brighter stars. */
    setStarCount(high) {
      starMat.uniforms.maxMag.value = high ? 9 : 4.5;
    },
    /** catalog: { stars: [{lon, lat, mag, bv}] } from data/stars.js */
    setStars(catalog, pixelRatio = 1) {
      if (starPoints) starGroup.remove(starPoints);
      const n = catalog.stars.length;
      const pos = new Float32Array(n * 3);
      const col = new Float32Array(n * 3);
      const size = new Float32Array(n);
      const mag = new Float32Array(n);
      catalog.stars.forEach((s, i) => {
        const p = starPos(s.lon, s.lat);
        pos.set([p.x, p.y, p.z], i * 3);
        const rgb = temperatureToRgb(bvToTemperatureK(s.bv));
        // keep colours gentle (stars look mostly white to the eye, tinted blue or orange)
        col.set(rgb.map((c) => 0.45 + c * 0.55), i * 3);
        size[i] = Math.max(1.3, 4.6 - s.mag * 0.62); // brighter stars are bigger dots
        mag[i] = s.mag;
      });
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
      g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
      g.setAttribute('aMag', new THREE.BufferAttribute(mag, 1));
      starPoints = new THREE.Points(g, starMat);
      starPoints.frustumCulled = false;
      starPoints.renderOrder = -10;
      starMat.uniforms.pixelRatio.value = pixelRatio;
      starGroup.add(starPoints);
    },
    /**
     * Show the lines + name of a constellation you found. figure: { id, name, segments:
     * [[{lon,lat},{lon,lat}], …], centre: {lon,lat} }
     */
    addFigure(figure) {
      if (figures.has(figure.id)) return;
      const pts = [];
      for (const [p, q] of figure.segments) pts.push(starPos(p.lon, p.lat, STAR_DIST * 0.99), starPos(q.lon, q.lat, STAR_DIST * 0.99));
      const line = new THREE.LineSegments(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color: 0x7fd8ff, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }),
      );
      line.frustumCulled = false;
      line.renderOrder = -9;
      const label = nameSprite(figure.name);
      const c = starPos(figure.centre.lon, figure.centre.lat, STAR_DIST * 0.98);
      label.position.copy(c).add(new THREE.Vector3(0, STAR_DIST * 0.07, 0));
      label.renderOrder = -8;
      starGroup.add(line, label);
      figures.set(figure.id, { line, label, dir: c.clone().normalize(), fade: 0 });
    },
    setLabels(on) {
      labelsOn = on;
    },
  };
}
