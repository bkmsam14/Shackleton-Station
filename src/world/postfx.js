// postfx.js — post-processing with the pmndrs "postprocessing" library:
//   RenderPass → N8AO ambient occlusion (indoors) → bloom + ACES tone mapping + a gentle
//   colour grade + soft vignette (one pass) → FXAA
// Only on High quality. On Low the renderer draws directly with ACES tone mapping.
// Graphics overhaul: ACES Filmic gives the richer, "animated film" contrast and colour
// (AgX looked washed out); bloom is softer so lights glow without blowing out.
// Bloom picks up HDR-bright materials only (the Sun, light strips, LEDs; see MAT.glow).
import * as THREE from 'three';
import {
  EffectComposer,
  RenderPass,
  EffectPass,
  BloomEffect,
  ToneMappingEffect,
  ToneMappingMode,
  FXAAEffect,
  HueSaturationEffect,
  VignetteEffect,
} from 'postprocessing';
import { N8AOPostPass } from 'n8ao';

// AO feel per zone (world units). Small radius indoors = contact shadows in corners.
const AO = {
  outside: { aoRadius: 3.0, distanceFalloff: 1.0, intensity: 3.5 },
  habitat: { aoRadius: 1.4, distanceFalloff: 1.0, intensity: 3.8 },
  greenhouse: { aoRadius: 1.3, distanceFalloff: 1.0, intensity: 3.6 },
};

export function createPostFX(renderer, scene, camera) {
  const composer = new EffectComposer(renderer, { frameBufferType: THREE.HalfFloatType });
  composer.addPass(new RenderPass(scene, camera));

  const w = window.innerWidth;
  const h = window.innerHeight;
  const ao = new N8AOPostPass(scene, camera, w, h);
  ao.setQualityMode('Performance');
  Object.assign(ao.configuration, AO.habitat, {
    halfRes: true, // half-resolution AO keeps it cheap on integrated GPUs
    depthAwareUpsampling: true,
    gammaCorrection: false, // the tone-mapping pass below handles output colour
  });
  composer.addPass(ao);

  const bloom = new BloomEffect({
    mipmapBlur: true,
    luminanceThreshold: 1.0, // only HDR-bright things glow, not white walls
    luminanceSmoothing: 0.2,
    intensity: 0.5,
    radius: 0.6,
  });
  const tone = new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC });
  // a touch more colour after tone mapping (ACES flattens saturated brights a little)
  const grade = new HueSaturationEffect({ saturation: 0.08 });
  // soft vignette: draws the eye to the middle of the screen, never hides anything
  const vignette = new VignetteEffect({ offset: 0.32, darkness: 0.34 });
  composer.addPass(new EffectPass(camera, bloom, tone, grade, vignette));
  // FXAA: one cheap pass (SMAA cost ~3.4 ms on an Intel UHD laptop GPU at 720p)
  const aaPass = new EffectPass(camera, new FXAAEffect());
  composer.addPass(aaPass);

  let enabled = false;
  let zone = null;
  let aoAllowed = true; // switched off automatically if the GPU can't keep up

  return {
    ao,
    bloom,
    aaPass,
    get enabled() {
      return enabled;
    },
    setEnabled(on) {
      enabled = on;
      // pmndrs applies tone mapping in its own pass; the renderer must not do it twice
      renderer.toneMapping = on ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
    },
    /** Draw a scene straight to the screen (the airlock room), always tone-mapped. */
    renderPlain(scene, cam) {
      const before = renderer.toneMapping;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.render(scene, cam);
      renderer.toneMapping = before;
    },
    setZone(zoneId) {
      if (zoneId === zone) return;
      zone = zoneId;
      Object.assign(ao.configuration, AO[zoneId] ?? AO.outside);
      // Outside, the harsh Sun and near-black shadows hide AO, and it costs ~8 ms on
      // integrated GPUs — so it runs only inside the modules, where it grounds everything.
      ao.enabled = aoAllowed && zoneId !== 'outside';
    },
    get aoAllowed() {
      return aoAllowed;
    },
    disableAO() {
      aoAllowed = false;
      ao.enabled = false;
    },
    setSize(width, height) {
      composer.setSize(width, height);
    },
    render(dt) {
      composer.render(dt);
    },
  };
}
