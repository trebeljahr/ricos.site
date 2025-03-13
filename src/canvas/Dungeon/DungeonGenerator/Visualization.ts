import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { DungeonGenerator } from "./Generator";
import { CellType, Vector2Int } from "./TypeStructure";

function setupScene(): {
  scene: THREE.Scene;
  camera: THREE.Camera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
} {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x222222);

  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(25, 30, 25);
  camera.lookAt(25, 0, 25);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(25, 0, 25);
  controls.update();

  const ambientLight = new THREE.AmbientLight(0x404040, 1);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(50, 50, 50);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  scene.add(directionalLight);

  const gridHelper = new THREE.GridHelper(50, 50);
  scene.add(gridHelper);

  return { scene, camera, renderer, controls };
}

function renderDungeon(scene: THREE.Scene): void {
  const size = new Vector2Int(50, 50);
  const generator = new DungeonGenerator(size, 20, new Vector2Int(8, 8), 42);

  const grid = generator.generate();

  console.log(grid);

  const roomMaterial = new THREE.MeshStandardMaterial({
    color: 0xcd5c5c,
    roughness: 0.7,
    metalness: 0.2,
  });

  const hallwayMaterial = new THREE.MeshStandardMaterial({
    color: 0x4682b4,
    roughness: 0.5,
    metalness: 0.3,
  });

  const roomGeometry = new THREE.BoxGeometry(1, 0.5, 1);
  const hallwayGeometry = new THREE.BoxGeometry(1, 0.3, 1);

  for (let x = 0; x < size.x; x++) {
    for (let y = 0; y < size.y; y++) {
      const pos = new Vector2Int(x, y);
      const cellType = grid.getValue(pos);

      let mesh: THREE.Mesh | null = null;

      if (cellType === CellType.Room) {
        mesh = new THREE.Mesh(roomGeometry, roomMaterial);
      } else if (cellType === CellType.Hallway) {
        mesh = new THREE.Mesh(hallwayGeometry, hallwayMaterial);
      }

      if (mesh) {
        mesh.position.set(x, 0, y);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
      }
    }
  }

  const floorGeometry = new THREE.PlaneGeometry(size.x, size.y);
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x333333,
    roughness: 0.9,
    metalness: 0.1,
  });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(size.x / 2 - 0.5, -0.25, size.y / 2 - 0.5);
  floor.receiveShadow = true;
  scene.add(floor);
}

function animate(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera
): void {
  function loop() {
    requestAnimationFrame(loop);
    renderer.render(scene, camera);
  }
  loop();
}

export function initDungeonVis(): void {
  const { scene, camera, renderer } = setupScene();
  renderDungeon(scene);
  animate(renderer, scene, camera);

  window.addEventListener("resize", () => {
    const cameraTyped = camera as THREE.PerspectiveCamera;
    cameraTyped.aspect = window.innerWidth / window.innerHeight;
    cameraTyped.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}
