// sky.js — black sky (no atmosphere), stars, the low Sun, and Earth near the horizon.
// Sky objects follow the camera so they behave as if infinitely far away.
import * as THREE from 'three';
import { SKY } from '../config/gameplay.js';
import { skyDirection } from '../systems/daycycle.js';
import { mulberry32 } from './heightfield.js';

const SUN_DIST = 2000;
const EARTH_DIST = 1900;
const STAR_DIST = 2400;

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

  // --- stars -------------------------------------------------------------
  const rand = mulberry32(2026);
  const makeStars = (n, size, brightness) => {
    const p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      // uniform on the sphere, but skip below −4° (behind the ground)
      let y;
      let x;
      let z;
      do {
        const u = rand() * 2 - 1;
        const t = rand() * Math.PI * 2;
        const s = Math.sqrt(1 - u * u);
        x = s * Math.cos(t);
        y = u;
        z = s * Math.sin(t);
      } while (y < -0.07);
      p[i * 3] = x * STAR_DIST;
      p[i * 3 + 1] = y * STAR_DIST;
      p[i * 3 + 2] = z * STAR_DIST;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const m = new THREE.PointsMaterial({
      color: new THREE.Color(brightness, brightness, brightness),
      size,
      sizeAttenuation: false,
      depthWrite: false,
      fog: false,
    });
    const pts = new THREE.Points(g, m);
    pts.frustumCulled = false;
    pts.renderOrder = -10;
    return pts;
  };
  const starsDim = makeStars(Math.floor(starCount * 0.8), 1.4, 0.55);
  const starsBright = makeStars(Math.floor(starCount * 0.2), 2.4, 1.0);
  group.add(starsDim, starsBright);

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
    update(camera, sunDirVec, earthSpin) {
      group.position.copy(camera.position);
      tmp.set(sunDirVec.x, sunDirVec.y, sunDirVec.z).multiplyScalar(SUN_DIST);
      sun.position.copy(tmp);
      earthPivot.position.set(earthDir.x, earthDir.y, earthDir.z).multiplyScalar(EARTH_DIST);
      earth.rotation.y = earthSpin;
      earthMat.uniforms.sunDir.value.set(sunDirVec.x, sunDirVec.y, sunDirVec.z);
    },
    setStarCount(high) {
      starsDim.visible = high;
    },
  };
}
