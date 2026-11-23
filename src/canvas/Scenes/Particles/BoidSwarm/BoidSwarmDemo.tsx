import { useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useControls } from "leva";
import { useEffect, useMemo, useRef } from "react";
import {
  type BufferGeometry,
  Color,
  DoubleSide,
  type Mesh,
  type MeshStandardMaterial,
  PlaneGeometry,
  Vector3,
} from "three";
import { createAgent, type FieldAgent, retarget, stepAgent, writeAgentState } from "./fieldAgents";
import {
  createFishGeometry,
  createFishInstances,
  createFishMaterial,
  type FishPart,
} from "./fishMesh";
import {
  type FishTextureUniforms,
  floatTexture,
  GpuBoidSwarm,
  type SwarmPredator,
  type SwarmSphere,
} from "./GpuBoidSwarm";
import {
  createReefWorld,
  REEF_BOUNDS,
  REEF_MODELS,
  REEF_SURFACE,
  reefFloor,
  reefSpecies,
} from "./reefWorld";
import { createRng, MAX_PREDATORS } from "./swarmConfig";

const MODEL_PATH = "/3d-assets/glb/fish_pack/";
const WATER = "#06304a";
const MAX_SHARKS = 4;
const SHARK = { size: 4.6, cruiseSpeed: 4.4, turnRate: 1.1, clearance: 3, fearRadius: 5.5 };
const POINTER_MODES = ["predator", "bait", "rock", "off"] as const;

/** One model of the fish pack as a swim-ready geometry. */
function useFishGeometry(name: string): BufferGeometry {
  const { scene } = useGLTF(`${MODEL_PATH}${name}.glb`);
  return useMemo(() => {
    const parts: FishPart[] = [];
    scene.traverse((object) => {
      const mesh = object as Mesh<BufferGeometry, MeshStandardMaterial>;
      if (mesh.isMesh) parts.push({ geometry: mesh.geometry, color: mesh.material.color });
    });
    return createFishGeometry(parts);
  }, [scene]);
}

function Reef({ world }: { world: ReturnType<typeof createReefWorld> }) {
  const floor = useMemo(() => {
    const [minX, , minZ] = REEF_BOUNDS.min;
    const [maxX, , maxZ] = REEF_BOUNDS.max;
    const geometry = new PlaneGeometry(maxX - minX + 60, maxZ - minZ + 60, 128, 128);
    geometry.rotateX(-Math.PI / 2);
    const position = geometry.getAttribute("position");
    for (let i = 0; i < position.count; i++) {
      position.setY(i, reefFloor(position.getX(i), position.getZ(i)));
    }
    geometry.computeVertexNormals();
    return geometry;
  }, []);
  useEffect(() => () => floor.dispose(), [floor]);

  return (
    <group>
      <mesh geometry={floor}>
        <meshStandardMaterial color="#b9a777" roughness={1} />
      </mesh>
      {world.obstacles.map((o) => {
        if (o.kind === "cylinder") {
          const top = o.maxY ?? REEF_SURFACE;
          const bottom = reefFloor(o.x, o.z) - 2;
          return (
            <mesh key={`c${o.x},${o.z}`} position={[o.x, (top + bottom) / 2, o.z]}>
              <cylinderGeometry args={[o.radius, o.radius * 1.08, top - bottom, 20]} />
              <meshStandardMaterial color="#8d8a7d" roughness={0.95} />
            </mesh>
          );
        }
        if (o.kind === "sphere") {
          return (
            <mesh key={`s${o.x},${o.z}`} position={[o.x, o.y, o.z]}>
              <icosahedronGeometry args={[o.radius, 3]} />
              <meshStandardMaterial color="#7f8478" roughness={0.95} flatShading />
            </mesh>
          );
        }
        return (
          <mesh key={`a${o.x},${o.z}`} position={[o.x, o.y, o.z]} rotation={[0, -(o.yaw ?? 0), 0]}>
            <torusGeometry args={[o.majorRadius, o.tubeRadius, 14, 40, Math.PI]} />
            <meshStandardMaterial color="#99907a" roughness={0.95} />
          </mesh>
        );
      })}
      {world.meshes.map((m) => (
        <mesh
          key={m.geometry.uuid}
          geometry={m.geometry}
          matrix={m.matrix}
          matrixAutoUpdate={false}
        >
          <meshStandardMaterial color="#c2607a" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

export function BoidSwarmDemo() {
  const controls = useControls({
    fish: { value: 12000, options: [2000, 6000, 12000, 24000, 48000] },
    sharks: { value: 2, min: 0, max: MAX_SHARKS, step: 1 },
    pointer: { value: "predator", options: [...POINTER_MODES] },
    "bait ball": false,
    separation: { value: 1, min: 0, max: 3 },
    alignment: { value: 1, min: 0, max: 3 },
    cohesion: { value: 1, min: 0, max: 3 },
    current: { value: 0.25, min: 0, max: 1.5 },
    paused: false,
  });
  const live = useRef(controls);
  live.current = controls;

  const world = useMemo(createReefWorld, []);
  const fish1 = useFishGeometry(REEF_MODELS[0]);
  const fish2 = useFishGeometry(REEF_MODELS[1]);
  const fish3 = useFishGeometry(REEF_MODELS[2]);
  const dolphin = useFishGeometry(REEF_MODELS[3]);
  const manta = useFishGeometry(REEF_MODELS[4]);
  const fishGeometries = useMemo(
    () => [fish1, fish2, fish3, dolphin, manta],
    [fish1, fish2, fish3, dolphin, manta],
  );
  const sharkGeometry = useFishGeometry("Shark");

  // The swarm, its school leaders and one instanced mesh per species.
  const sim = useMemo(() => {
    const species = reefSpecies(controls.fish);
    const swarm = new GpuBoidSwarm({ species, bounds: world.bounds, field: world.field });
    const rng = createRng(7);
    const leaders = species.map((s) =>
      createAgent(
        {
          size: 1,
          cruiseSpeed: s.cruiseSpeed * 0.55,
          turnRate: 0.8,
          clearance: Math.min(4, s.schoolRadius * 0.5),
        },
        world.field,
        world.bounds,
        rng,
      ),
    );
    return { species, swarm, rng, leaders };
  }, [world, controls.fish]);
  useEffect(() => () => sim.swarm.dispose(), [sim]);

  const schools = useMemo(
    () =>
      sim.species.map((s, i) => ({
        key: s.name,
        geometry: createFishInstances(
          fishGeometries[i],
          sim.swarm.layout.width,
          sim.swarm.layout.starts[i],
          s.count,
        ),
        material: createFishMaterial(sim.swarm.renderUniforms, {
          size: s.size,
          swimStyle: s.swimStyle,
          swimAmplitude: s.swimAmplitude,
          bend: s.bend,
        }),
      })),
    [sim, fishGeometries],
  );
  useEffect(
    () => () => {
      for (const school of schools) {
        school.geometry.dispose();
        school.material.dispose();
      }
    },
    [schools],
  );

  // Sharks are steered on the CPU, so the swarm can be told where they are.
  const sharks = useMemo(() => {
    const rng = createRng(21);
    const agents: FieldAgent[] = [];
    for (let i = 0; i < MAX_SHARKS; i++) {
      agents.push(createAgent(SHARK, world.field, world.bounds, rng));
    }
    const pos = new Float32Array(MAX_SHARKS * 4);
    const vel = new Float32Array(MAX_SHARKS * 4);
    const pose = new Float32Array(MAX_SHARKS * 4);
    const meta = new Float32Array(MAX_SHARKS * 4);
    for (let i = 0; i < MAX_SHARKS; i++) meta.set([0, 0.9 + 0.2 * rng(), rng(), rng()], i * 4);
    const textures = [pos, vel, pose, meta].map((data) => floatTexture(data, MAX_SHARKS, 1));
    const uniforms: FishTextureUniforms = {
      tSwarmPos: { value: textures[0] },
      tSwarmVel: { value: textures[1] },
      tSwarmPose: { value: textures[2] },
      tSwarmMeta: { value: textures[3] },
    };
    const geometry = createFishInstances(sharkGeometry, MAX_SHARKS, 0, MAX_SHARKS);
    const material = createFishMaterial(uniforms, {
      size: SHARK.size,
      swimAmplitude: 0.7,
      bend: 1.3,
    });
    return { rng, agents, pos, vel, pose, textures, geometry, material };
  }, [world, sharkGeometry]);
  useEffect(
    () => () => {
      sharks.geometry.dispose();
      sharks.material.dispose();
      for (const texture of sharks.textures) texture.dispose();
    },
    [sharks],
  );

  const marker = useRef<Mesh<BufferGeometry, MeshStandardMaterial>>(null);
  const scratch = useMemo(
    () => ({
      point: new Vector3(),
      normal: new Vector3(),
      min: new Vector3().fromArray(REEF_BOUNDS.min),
      max: new Vector3().fromArray(REEF_BOUNDS.max),
      predators: [] as SwarmPredator[],
      rocks: [] as SwarmSphere[],
      colors: {
        predator: new Color("#ff5a4a"),
        bait: new Color("#7dff9a"),
        rock: new Color("#9aa3a8"),
      },
    }),
    [],
  );

  useFrame((state, delta) => {
    const c = live.current;
    const { swarm, leaders, rng } = sim;
    const { field, bounds } = world;
    sharks.geometry.instanceCount = c.sharks;

    // Where the pointer is in the water: on the plane through the middle of
    // the reef that faces the camera.
    const mode = c.pointer as (typeof POINTER_MODES)[number];
    const { point, normal } = scratch;
    state.camera.getWorldDirection(normal);
    state.raycaster.setFromCamera(state.pointer, state.camera);
    const ray = state.raycaster.ray;
    const along = -ray.origin.dot(normal) / ray.direction.dot(normal);
    const pointerInWater = mode !== "off" && Number.isFinite(along) && along > 0;
    if (pointerInWater) {
      ray.at(along, point);
      point.clamp(scratch.min, scratch.max);
    }
    if (marker.current) {
      marker.current.visible = pointerInWater;
      if (pointerInWater) {
        marker.current.position.copy(point);
        marker.current.scale.setScalar(mode === "rock" ? 3 : 0.35);
        marker.current.material.color.copy(scratch.colors[mode as "predator" | "bait" | "rock"]);
      }
    }
    if (c.paused) return;
    const dt = Math.min(delta, 1 / 20);

    for (let i = 0; i < leaders.length; i++) {
      const leader = leaders[i];
      if (stepAgent(leader, field, bounds, dt)) retarget(leader, field, bounds, rng);
      swarm.setGoal(i, leader.position[0], leader.position[1], leader.position[2]);
    }
    if (c["bait ball"]) swarm.setGoal(0, 0, 1, 12, 1);

    const predators = scratch.predators;
    predators.length = 0;
    for (let i = 0; i < c.sharks; i++) {
      const shark = sharks.agents[i];
      if (stepAgent(shark, field, bounds, dt)) {
        // Mostly hunt a school, sometimes just roam.
        const prey = leaders[Math.floor(sharks.rng() * 3)];
        retarget(shark, field, bounds, sharks.rng, sharks.rng() < 0.65 ? prey.position : undefined);
      }
      predators.push({
        position: shark.position,
        velocity: [
          shark.heading[0] * shark.speed,
          shark.heading[1] * shark.speed,
          shark.heading[2] * shark.speed,
        ],
        fearRadius: SHARK.fearRadius,
      });
    }
    writeAgentState(sharks.agents, sharks.pos, sharks.vel, sharks.pose);
    for (let i = 0; i < 3; i++) sharks.textures[i].needsUpdate = true;

    const rocks = scratch.rocks;
    rocks.length = 0;
    if (pointerInWater && mode === "predator" && predators.length < MAX_PREDATORS) {
      predators.push({ position: [point.x, point.y, point.z], fearRadius: 6 });
    }
    if (pointerInWater && mode === "rock") {
      rocks.push({ position: [point.x, point.y, point.z], radius: 3 });
    }
    swarm.setPredators(predators);
    swarm.setDynamicObstacles(rocks);
    swarm.setAttractor(
      pointerInWater && mode === "bait"
        ? { position: [point.x, point.y, point.z], strength: 2.5, radius: 22 }
        : null,
    );
    swarm.setFlockScale(c.separation, c.alignment, c.cohesion);
    swarm.setBehavior({ flow: c.current });
    swarm.step(state.gl, dt);
  });

  const renderer = useThree((state) => state.gl);
  const getState = useThree((state) => state.get);
  // Lets a test read the simulation back. Never set in production builds.
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const target = window as unknown as { __boidSwarm?: unknown };
    target.__boidSwarm = {
      swarm: sim.swarm,
      field: world.field,
      renderer,
      getState,
      sharks: sharks.agents,
      controls: live,
    };
    return () => {
      target.__boidSwarm = undefined;
    };
  }, [sim, world, renderer, getState, sharks]);

  return (
    <>
      <color attach="background" args={[WATER]} />
      <fog attach="fog" args={[WATER, 18, 95]} />
      <hemisphereLight args={["#bfe9ff", "#27425a", 1.6]} />
      <directionalLight position={[8, 30, 6]} intensity={2.2} color="#dff4ff" />
      <Reef world={world} />
      {schools.map((school) => (
        <mesh
          key={school.key}
          geometry={school.geometry}
          material={school.material}
          frustumCulled={false}
        />
      ))}
      <mesh geometry={sharks.geometry} material={sharks.material} frustumCulled={false} />
      <mesh ref={marker} visible={false}>
        <sphereGeometry args={[1, 20, 14]} />
        <meshStandardMaterial transparent opacity={0.55} side={DoubleSide} />
      </mesh>
    </>
  );
}

for (const name of [...REEF_MODELS, "Shark"]) useGLTF.preload(`${MODEL_PATH}${name}.glb`);
