import { useFrame, useThree } from "@react-three/fiber";
import { useControls } from "leva";
import { type RefObject, useEffect, useMemo, useRef } from "react";
import type { Group } from "three";
import {
  createAgent,
  type FieldAgent,
  retarget,
  stepAgent,
  writeAgentState,
} from "../Particles/BoidSwarm/fieldAgents";
import { createFishInstances, createFishMaterial } from "../Particles/BoidSwarm/fishMesh";
import {
  type FishTextureUniforms,
  floatTexture,
  GpuBoidSwarm,
  type SwarmPredator,
  type SwarmSphere,
} from "../Particles/BoidSwarm/GpuBoidSwarm";
import { REEF_MODELS, reefSpecies } from "../Particles/BoidSwarm/reefWorld";
import { createRng, type SwarmBounds } from "../Particles/BoidSwarm/swarmConfig";
import { preloadFishModels, useFishGeometry } from "../Particles/BoidSwarm/useFishGeometry";
import { createLagoonField, LAGOON_BOUNDS } from "./lagoonTerrain";
import { WATER_LEVEL } from "./waterPresets";

const MAX_SHARKS = 4;
/** Bodies twice the reef demo's: the lagoon is seen through fog, from further off. */
const FISH_SCALE = 2;
/** Neighbour search radius, grown with the bodies. */
const PERCEPTION = 2.4;
/** Schools stay over the lagoon shelf, where the viewpoints are; sharks roam everywhere. */
const HOME_BOUNDS: SwarmBounds = { min: [-30, 30, -30], max: [30, WATER_LEVEL - 2, 34] };
const SHARK = { size: 6.5, cruiseSpeed: 5, turnRate: 1, clearance: 4, fearRadius: 7 };
/** Fish keep this far from the diver, and flow around the whale's body. */
const DIVER_FEAR_RADIUS = 8;
/** A fast diver is seen from further off: extra radius per unit of speed, up to a cap. */
const DIVER_FEAR_PER_SPEED = 0.45;
const DIVER_FEAR_EXTRA = 9;
const WHALE_RADIUS = 5;

/**
 * Schools of fish, dolphins, mantas and sharks that steer around the seabed,
 * the sea stacks, the pillars, the arch, the reef, the whale and the diver.
 */
export function LagoonSwarm({ whaleRef }: { whaleRef: RefObject<Group | null> }) {
  const controls = useControls("Marine Life", {
    fish: { label: "Fish", value: 4000, options: [1000, 2000, 4000, 8000, 16000] },
    sharks: { label: "Sharks", value: 2, min: 0, max: MAX_SHARKS, step: 1 },
    shyFish: { label: "Fish flee you", value: true },
  });
  const live = useRef(controls);
  live.current = controls;

  const field = useMemo(() => createLagoonField(), []);
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
    const species = reefSpecies(controls.fish, FISH_SCALE);
    const swarm = new GpuBoidSwarm({
      species,
      bounds: LAGOON_BOUNDS,
      field,
      behavior: { perception: PERCEPTION },
    });
    const rng = createRng(11);
    const leaders = species.map((s) =>
      createAgent(
        {
          size: 1,
          cruiseSpeed: s.cruiseSpeed * 0.55,
          turnRate: 0.8,
          clearance: Math.min(4, s.schoolRadius * 0.5),
        },
        field,
        HOME_BOUNDS,
        rng,
      ),
    );
    return { species, swarm, rng, leaders };
  }, [field, controls.fish]);
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
    const rng = createRng(29);
    const agents: FieldAgent[] = [];
    for (let i = 0; i < MAX_SHARKS; i++) {
      agents.push(createAgent(SHARK, field, LAGOON_BOUNDS, rng));
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
  }, [field, sharkGeometry]);
  useEffect(
    () => () => {
      sharks.geometry.dispose();
      sharks.material.dispose();
      for (const texture of sharks.textures) texture.dispose();
    },
    [sharks],
  );

  const scratch = useMemo(
    () => ({
      predators: [] as SwarmPredator[],
      spheres: [] as SwarmSphere[],
      diver: {
        seen: false,
        last: [0, 0, 0] as [number, number, number],
        velocity: [0, 0, 0] as [number, number, number],
      },
    }),
    [],
  );

  useFrame((state, delta) => {
    const c = live.current;
    const { swarm, leaders, rng } = sim;
    const dt = Math.min(delta, 1 / 20);
    sharks.geometry.instanceCount = c.sharks;

    for (let i = 0; i < leaders.length; i++) {
      const leader = leaders[i];
      if (stepAgent(leader, field, HOME_BOUNDS, dt)) retarget(leader, field, HOME_BOUNDS, rng);
      swarm.setGoal(i, leader.position[0], leader.position[1], leader.position[2]);
    }

    const predators = scratch.predators;
    predators.length = 0;
    for (let i = 0; i < c.sharks; i++) {
      const shark = sharks.agents[i];
      if (stepAgent(shark, field, LAGOON_BOUNDS, dt)) {
        // Mostly hunt a school, sometimes just roam.
        const prey = leaders[Math.floor(sharks.rng() * 3)];
        retarget(
          shark,
          field,
          LAGOON_BOUNDS,
          sharks.rng,
          sharks.rng() < 0.65 ? prey.position : undefined,
        );
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

    // The diver is a predator too. Its velocity lets fish sidestep out of
    // its path instead of fleeing straight ahead of it.
    const eye = state.camera.position;
    const diver = scratch.diver;
    if (diver.seen && delta > 1e-4) {
      const blend = 1 - Math.exp(-delta * 6);
      diver.velocity[0] += ((eye.x - diver.last[0]) / delta - diver.velocity[0]) * blend;
      diver.velocity[1] += ((eye.y - diver.last[1]) / delta - diver.velocity[1]) * blend;
      diver.velocity[2] += ((eye.z - diver.last[2]) / delta - diver.velocity[2]) * blend;
    }
    // A jump between viewpoints is not a swim.
    const speed = Math.hypot(diver.velocity[0], diver.velocity[1], diver.velocity[2]);
    if (speed > 80) diver.velocity.fill(0);
    diver.last[0] = eye.x;
    diver.last[1] = eye.y;
    diver.last[2] = eye.z;
    diver.seen = true;
    if (c.shyFish && eye.y < WATER_LEVEL) {
      predators.push({
        position: diver.last,
        velocity: diver.velocity,
        fearRadius:
          DIVER_FEAR_RADIUS +
          Math.min(DIVER_FEAR_EXTRA, Math.min(speed, 80) * DIVER_FEAR_PER_SPEED),
      });
    }
    const spheres = scratch.spheres;
    spheres.length = 0;
    const whale = whaleRef.current;
    if (whale) {
      const p = whale.position;
      spheres.push({ position: [p.x, p.y, p.z], radius: WHALE_RADIUS });
    }
    swarm.setPredators(predators);
    swarm.setDynamicObstacles(spheres);
    swarm.step(state.gl, dt);
  });

  const renderer = useThree((state) => state.gl);
  const getState = useThree((state) => state.get);
  // Lets a test read the simulation back. Never set in production builds.
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const target = window as unknown as { __boidSwarm?: unknown };
    target.__boidSwarm = { swarm: sim.swarm, field, renderer, getState, sharks: sharks.agents };
    return () => {
      target.__boidSwarm = undefined;
    };
  }, [sim, field, renderer, getState, sharks]);

  return (
    <>
      {schools.map((school) => (
        <mesh
          key={school.key}
          geometry={school.geometry}
          material={school.material}
          frustumCulled={false}
        />
      ))}
      <mesh geometry={sharks.geometry} material={sharks.material} frustumCulled={false} />
    </>
  );
}

preloadFishModels([...REEF_MODELS, "Shark"]);
