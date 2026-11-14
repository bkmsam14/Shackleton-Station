// M0 scaffold: renderer + empty scene to prove the toolchain works.
import * as THREE from 'three';
import { TIME } from './config/gameplay.js';

const app = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(0, 1.6, 4);

const box = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xdddddd }));
scene.add(box);
const sun = new THREE.DirectionalLight(0xffffff, 3);
sun.position.set(5, 1, 2);
scene.add(sun);

const timer = new THREE.Timer();
timer.connect(document);
renderer.setAnimationLoop(() => {
  timer.update();
  box.rotation.y += timer.getDelta() * 0.5;
  renderer.render(scene, camera);
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

console.info(`[Shackleton] M0 scaffold running. Time scale ${TIME.SCALE}×.`);
