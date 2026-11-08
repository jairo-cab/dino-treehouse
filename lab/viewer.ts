// Quick lab page: shows a generated GLB model turning slowly, to judge real-3D quality.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 0.6, 4);

scene.add(new THREE.HemisphereLight(0xffffff, 0xffd9a0, 1.4));
const sun = new THREE.DirectionalLight(0xfff1d6, 2.2);
sun.position.set(-3, 5, 4);
sun.castShadow = true;
scene.add(sun);

const ground = new THREE.Mesh(new THREE.CircleGeometry(1.4, 48), new THREE.ShadowMaterial({ opacity: 0.25 }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.autoRotate = true;
controls.autoRotateSpeed = 2.5;

new GLTFLoader().load('./pip_trellis.glb', (gltf) => {
  const m = gltf.scene;
  const box = new THREE.Box3().setFromObject(m);
  const size = box.getSize(new THREE.Vector3());
  const k = 2 / size.y;
  m.scale.setScalar(k);
  const b2 = new THREE.Box3().setFromObject(m);
  m.position.y -= b2.min.y;           // stand on the ground
  m.position.x -= (b2.min.x + b2.max.x) / 2;
  m.position.z -= (b2.min.z + b2.max.z) / 2;
  m.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; } });
  scene.add(m);
  controls.target.set(0, 1, 0);
  console.log('loaded', size.toArray().map((n) => n.toFixed(2)).join(' x '));
});

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });
