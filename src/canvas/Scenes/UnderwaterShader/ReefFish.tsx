import { useFrame } from "@react-three/fiber";
import { useControls } from "leva";
import { useEffect, useMemo } from "react";
import { createAgent, retarget, stepAgent } from "../Particles/BoidSwarm/fieldAgents";
import { createFishInstances, createFishMaterial } from "../Particles/BoidSwarm/fishMesh";
import {
  GpuBoidSwarm,
  type SwarmPredator,
  type SwarmSphere,
} from "../Particles/BoidSwarm/GpuBoidSwarm";
import type { ObstacleField } from "../Particles/BoidSwarm/obstacleField";
import { createRng, type SwarmBounds, type SwarmSpecies } from "../Particles/BoidSwarm/swarmConfig";
import { preloadFishModels, useFishGeometries } from "../Particles/BoidSwarm/useFishGeometry";
import { CORAL_PATCHES, type CoralPatch } from "./lagoonTerrain";

/**
 * Who lives on the reefs: the three slender fish of the fish pack, repainted.
 * `colors` goes by the model's material names; `share` is the part of all
 * reef fish; `patch` picks the reef.
 */
const RESIDENTS = [
  {
    name: "blue tang",
    model: "Fish2",
    colors: { Body: "#1f5fd0", Front: "#16357f", Fins: "#ffd23f" },
    share: 0.2,
    patch: 0,
    size: 0.8,
    speed: 1.5,
    school: 0.9,
    roam: 6,
  },
  {
    name: "yellow tang",
    model: "Fish2",
    colors: { Body: "#ffd632", Front: "#fff0a0", Fins: "#ffbe0b" },
    share: 0.2,
    patch: 0,
    size: 0.7,
    speed: 1.4,
    school: 0.9,
    roam: 5.5,
  },
  {
    name: "butterflyfish",
    model: "Fish3",
    colors: { Body: "#ffd84a", Stripes: "#f7f3e3", Outline: "#1d1d1d" },
    share: 0.14,
    patch: 0,
    size: 0.6,
    speed: 1.1,
    school: 0.4,
    roam: 5,
  },
  {
    name: "clownfish",
    model: "Fish3",
    colors: { Body: "#ff7a1a", Stripes: "#fff6ea", Outline: "#161616" },
    share: 0.12,
    patch: 0,
    size: 0.5,
    speed: 0.8,
    school: 0.3,
    roam: 3,
  },
  {
    name: "parrotfish",
    model: "Fish1",
    colors: { Top: "#1fb8a6", Bottom: "#ff8fb3", Fins: "#2f7bff" },
    share: 0.06,
    patch: 0,
    size: 1.1,
    speed: 1.2,
    school: 0.3,
    roam: 6.5,
  },
  {
    name: "moorish idol",
    model: "Fish2",
    colors: { Body: "#f7f1d5", Front: "#1b1b1b", Fins: "#ffd23f" },
    share: 0.1,
    patch: 1,
    size: 0.75,
    speed: 1.2,
    school: 0.6,
    roam: 4.5,
  },
  {
    name: "royal gramma",
    model: "Fish1",
    colors: { Top: "#8a3fd1", Bottom: "#ffd23f", Fins: "#c86bff" },
    share: 0.1,
    patch: 1,
    size: 0.45,
    speed: 0.9,
    school: 0.3,
    roam: 3.5,
  },
  {
    name: "mandarinfish",
    model: "Fish3",
    colors: { Body: "#ff7a1a", Stripes: "#1e6fd9", Outline: "#2bd4a0" },
    share: 0.08,
    patch: 1,
    size: 0.45,
    speed: 0.7,
    school: 0.2,
    roam: 3,
  },
] as const;
const MODELS = RESIDENTS.map((r) => r.model);
const COLORS = RESIDENTS.map((r) => r.colors);

/** Part of a threat's fear radius that reef fish respect. */
const BOLDNESS = 0.45;
/** Smaller than the open-water fish, so a smaller neighbourhood. */
const PERCEPTION = 1.5;

function residents(total: number): SwarmSpecies[] {
  return RESIDENTS.map((r) => ({
    name: r.name,
    count: Math.max(1, Math.round(total * r.share)),
    size: r.size,
    cruiseSpeed: r.speed,
    // Reef fish dawdle, then dart when something frightens them.
    maxSpeed: 6.5,
    turnRate: 4.2,
    separation: 1.6,
    alignment: r.school,
    cohesion: r.school * 0.8,
    schoolRadius: r.roam,
  }));
}

/** The water over a reef where its fish look for food: from just above the seabed to a little over the coral. */
function homeOf(patch: CoralPatch): SwarmBounds {
  const reach = patch.radius * 0.75;
  return {
    min: [patch.x - reach, patch.floor + 0.6, patch.z - reach],
    max: [patch.x + reach, patch.top + 2.2, patch.z + reach],
  };
}

/** One box around every reef, with room to flee into. */
function reefBounds(): SwarmBounds {
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (const patch of CORAL_PATCHES) {
    const reach = patch.radius + 9;
    min[0] = Math.min(min[0], patch.x - reach);
    min[1] = Math.min(min[1], patch.floor - 3);
    min[2] = Math.min(min[2], patch.z - reach);
    max[0] = Math.max(max[0], patch.x + reach);
    max[1] = Math.max(max[1], patch.top + 6);
    max[2] = Math.max(max[2], patch.z + reach);
  }
  return { min, max };
}

export interface ReefThreats {
  predators: readonly SwarmPredator[];
  spheres: readonly SwarmSphere[];
}

/**
 * Small colourful fish that live on the coral reefs: each kind stays over its
 * reef, weaves between the colonies and darts away from sharks and the diver.
 * `threats` is filled by the open-water swarm every frame.
 */
export function ReefFish({ field, threats }: { field: ObstacleField; threats: ReefThreats }) {
  const { reefFish } = useControls("Marine Life", {
    reefFish: { label: "Reef fish", value: 500, options: [150, 500, 1500, 4000] },
  });
  const geometries = useFishGeometries(MODELS, COLORS);

  const sim = useMemo(() => {
    const species = residents(reefFish);
    const swarm = new GpuBoidSwarm({
      species,
      bounds: reefBounds(),
      field,
      behavior: { perception: PERCEPTION, boundsMargin: 3, flow: 0.15 },
      seed: 5,
    });
    const rng = createRng(17);
    const homes = CORAL_PATCHES.map(homeOf);
    // A slow point over the reef that each kind follows around.
    const leaders = RESIDENTS.map((r) => ({
      home: homes[r.patch],
      agent: createAgent(
        { size: 0.6, cruiseSpeed: r.speed * 0.35, turnRate: 1.2, clearance: 0.8 },
        field,
        homes[r.patch],
        rng,
      ),
    }));
    return { species, swarm, rng, leaders };
  }, [field, reefFish]);
  useEffect(() => () => sim.swarm.dispose(), [sim]);

  const schools = useMemo(
    () =>
      sim.species.map((s, i) => ({
        key: s.name,
        geometry: createFishInstances(
          geometries[i],
          sim.swarm.layout.width,
          sim.swarm.layout.starts[i],
          s.count,
        ),
        material: createFishMaterial(sim.swarm.renderUniforms, { size: s.size, roughness: 0.55 }),
      })),
    [sim, geometries],
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

  const scratch = useMemo(() => [] as SwarmPredator[], []);
  useFrame((state, delta) => {
    const { swarm, leaders, rng } = sim;
    const dt = Math.min(delta, 1 / 20);
    for (let i = 0; i < leaders.length; i++) {
      const { agent, home } = leaders[i];
      if (stepAgent(agent, field, home, dt)) retarget(agent, field, home, rng);
      swarm.setGoal(i, agent.position[0], agent.position[1], agent.position[2]);
    }
    // Reef fish are bold: they let a threat come close, then dart into the coral.
    const predators = scratch;
    predators.length = 0;
    for (const threat of threats.predators) {
      predators.push({ ...threat, fearRadius: threat.fearRadius * BOLDNESS });
    }
    swarm.setPredators(predators);
    swarm.setDynamicObstacles(threats.spheres);
    swarm.step(state.gl, dt);
  });

  // Lets a test read the simulation back. Never set in production builds.
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const target = window as unknown as { __reefFish?: unknown };
    target.__reefFish = { swarm: sim.swarm };
    return () => {
      target.__reefFish = undefined;
    };
  }, [sim]);

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
    </>
  );
}

preloadFishModels(MODELS);
