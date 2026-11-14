// M1 preview: outside world with an orbit camera (player controller arrives in M3).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createWorld } from './world/World.js';
import { createDayCycle, stepDayCycle, getSun } from './systems/daycycle.js';

const app = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
app.appendChild(renderer.domElement);

const world = createWorld({ quality: 'high' });
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 3000);
camera.position.set(10, 6, 24);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(-6, 3, 12);
controls.update();

const day = createDayCycle();
const timer = new THREE.Timer();
timer.connect(document);
const speed = new URLSearchParams(location.search).get('sunspeed') ?? 1;

renderer.setAnimationLoop(() => {
  timer.update();
  const dt = Math.min(timer.getDelta(), 0.1);
  stepDayCycle(day, dt * speed);
  const sun = getSun(day);
  world.update(dt * speed, camera, controls.target, sun, (day.gameSeconds / 86400) * Math.PI * 2);
  controls.update();
  renderer.render(world.scene, camera);
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

window.__debug = {
  renderer,
  world,
  day,
  camera,
  controls,
  look(az, el = 1.5, from = [-2, 2.2, 10]) {
    const a = (az * Math.PI) / 180;
    camera.position.set(...from);
    controls.target.set(from[0] + Math.sin(a) * 50, from[1] + Math.tan((el * Math.PI) / 180) * 50, from[2] - Math.cos(a) * 50);
    controls.update();
  },
};
