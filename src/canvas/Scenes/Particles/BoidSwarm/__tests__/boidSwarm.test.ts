import { BoxGeometry, BufferGeometry, Color, Float32BufferAttribute } from "three";
import { describe, expect, it } from "vitest";
import { createAgent, retarget, stepAgent } from "../fieldAgents";
import { createFishGeometry, createFishInstances } from "../fishMesh";
import { meshDistance } from "../meshDistance";
import { type FieldSample, ObstacleField, obstacleDistance } from "../obstacleField";
import { createReefWorld, REEF_BOUNDS, reefFloor, reefSpecies } from "../reefWorld";
import {
  computeGridLayout,
  computeSimLayout,
  createRng,
  gridTexel,
  MAX_SPECIES,
  SLOTS_PER_CELL,
  type SwarmBounds,
} from "../swarmConfig";

const bounds: SwarmBounds = { min: [-10, -5, -10], max: [10, 5, 10] };
const sample: FieldSample = { distance: 0, nx: 0, ny: 0, nz: 0 };

describe("sim layout", () => {
  it("gives every species its own contiguous range", () => {
    const layout = computeSimLayout([{ count: 100 }, { count: 0 }, { count: 37 }]);
    expect(layout.starts).toEqual([0, 100, 100, 137]);
    expect(layout.total).toBe(137);
    expect(layout.width * layout.height).toBeGreaterThanOrEqual(137);
    expect(layout.width * (layout.height - 1)).toBeLessThan(137);
  });

  it("refuses more species than the shaders have room for", () => {
    const tooMany = Array.from({ length: MAX_SPECIES + 1 }, () => ({ count: 1 }));
    expect(() => computeSimLayout(tooMany)).toThrow();
  });
});

describe("grid layout", () => {
  it("covers the bounds with cells one perception radius wide", () => {
    const grid = computeGridLayout(bounds, 1.3);
    expect(grid.cell).toBe(1.3);
    for (let a = 0; a < 3; a++) {
      expect(grid.dim[a] * grid.cell).toBeGreaterThanOrEqual(bounds.max[a] - bounds.min[a]);
    }
    expect(grid.tiles[0] * grid.tiles[1]).toBeGreaterThanOrEqual(grid.dim[2]);
  });

  it("maps every cell slot to its own texel inside the texture", () => {
    const grid = computeGridLayout(bounds, 2.5);
    const seen = new Set<number>();
    for (let z = 0; z < grid.dim[2]; z++) {
      for (let y = 0; y < grid.dim[1]; y++) {
        for (let x = 0; x < grid.dim[0]; x++) {
          for (let slot = 0; slot < SLOTS_PER_CELL; slot++) {
            const [u, v] = gridTexel(grid, x, y, z, slot);
            expect(u).toBeLessThan(grid.texWidth);
            expect(v).toBeLessThan(grid.texHeight);
            seen.add(v * grid.texWidth + u);
          }
        }
      }
    }
    expect(seen.size).toBe(grid.dim[0] * grid.dim[1] * grid.dim[2] * SLOTS_PER_CELL);
  });

  it("grows the cells instead of the texture for huge bounds", () => {
    const grid = computeGridLayout({ min: [0, 0, 0], max: [1000, 10, 1000] }, 1);
    expect(Math.max(...grid.dim)).toBeLessThanOrEqual(96);
    expect(grid.cell).toBeGreaterThan(1);
  });
});

describe("obstacle distances", () => {
  it("measures a sphere", () => {
    const sphere = { kind: "sphere", x: 1, y: 2, z: 3, radius: 2 } as const;
    expect(obstacleDistance(1, 2, 3, sphere)).toBeCloseTo(-2);
    expect(obstacleDistance(6, 2, 3, sphere)).toBeCloseTo(3);
  });

  it("measures a capped cylinder from the side, the top and the rim", () => {
    const pillar = { kind: "cylinder", x: 0, z: 0, radius: 1, minY: 0, maxY: 4 } as const;
    expect(obstacleDistance(3, 2, 0, pillar)).toBeCloseTo(2);
    expect(obstacleDistance(0, 6, 0, pillar)).toBeCloseTo(2);
    expect(obstacleDistance(4, 8, 0, pillar)).toBeCloseTo(5);
    expect(obstacleDistance(0, 2, 0, pillar)).toBeCloseTo(-1);
  });

  it("leaves the opening of an arch free", () => {
    const arch = { kind: "arch", x: 0, y: 0, z: 0, majorRadius: 5, tubeRadius: 1 } as const;
    expect(obstacleDistance(0, 2, 0, arch)).toBeCloseTo(2);
    expect(obstacleDistance(0, 5, 0, arch)).toBeCloseTo(-1);
    expect(obstacleDistance(5, -3, 0, arch)).toBeCloseTo(2);
    // Turned a quarter, the arch stands in the YZ plane.
    expect(obstacleDistance(0, 0, 5, { ...arch, yaw: Math.PI / 2 })).toBeCloseTo(-1);
  });
});

describe("mesh distance", () => {
  const box = new BoxGeometry(2, 2, 2);
  const distance = meshDistance({
    positions: box.getAttribute("position").array,
    index: box.index?.array,
  });

  it("is negative inside and positive outside a closed mesh", () => {
    expect(distance(0, 0, 0)).toBeCloseTo(-1);
    expect(distance(0.5, 0, 0)).toBeCloseTo(-0.5);
    expect(distance(3, 0, 0)).toBeCloseTo(2);
    expect(distance(2, 2, 0)).toBeCloseTo(Math.SQRT2);
  });

  it("follows the world matrix", () => {
    const moved = meshDistance({
      positions: box.getAttribute("position").array,
      index: box.index?.array,
      matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 10, 0, 0, 1],
    });
    expect(moved(10, 0, 0)).toBeCloseTo(-1);
    expect(moved(0, 0, 0)).toBeGreaterThan(3);
  });
});

describe("obstacle field", () => {
  const field = new ObstacleField(bounds, 0.5);
  field.bake({
    obstacles: [{ kind: "sphere", x: 0, y: 0, z: 0, radius: 3 }],
    floor: () => -4,
  });

  it("reproduces distances between voxels", () => {
    expect(field.sample(5.2, 0.1, 0.3, sample).distance).toBeCloseTo(2.2, 0);
    expect(field.sample(0, 0, 0, sample).distance).toBeLessThan(-2);
    expect(field.sample(8, -3.2, 8, sample).distance).toBeCloseTo(0.8, 1);
  });

  it("points away from the nearest surface", () => {
    field.sample(4.5, 0, 0, sample);
    expect(sample.nx).toBeGreaterThan(0.95);
    field.sample(8, -3.5, 8, sample);
    expect(sample.ny).toBeGreaterThan(0.95);
  });

  it("clamps reads outside the volume", () => {
    expect(Number.isFinite(field.sample(100, 100, 100, sample).distance)).toBe(true);
  });
});

describe("field agents", () => {
  it("swim for a minute without entering a solid or leaving the bounds", () => {
    const world = createReefWorld();
    const rng = createRng(3);
    const config = { size: 4.6, cruiseSpeed: 4.4, turnRate: 1.1, clearance: 3 };
    const agents = Array.from({ length: 4 }, () =>
      createAgent(config, world.field, world.bounds, rng),
    );
    let closest = Number.POSITIVE_INFINITY;
    let travelled = 0;
    for (let frame = 0; frame < 60 * 60; frame++) {
      for (const agent of agents) {
        const before = [...agent.position];
        if (stepAgent(agent, world.field, world.bounds, 1 / 60)) {
          retarget(agent, world.field, world.bounds, rng);
        }
        travelled += Math.hypot(
          agent.position[0] - before[0],
          agent.position[1] - before[1],
          agent.position[2] - before[2],
        );
        const [x, y, z] = agent.position;
        closest = Math.min(closest, world.field.sample(x, y, z, sample).distance);
        for (let a = 0; a < 3; a++) {
          expect(agent.position[a]).toBeGreaterThanOrEqual(REEF_BOUNDS.min[a]);
          expect(agent.position[a]).toBeLessThanOrEqual(REEF_BOUNDS.max[a]);
        }
        expect(Math.hypot(...agent.heading)).toBeCloseTo(1, 3);
      }
    }
    // The step eases agents back out to half a body length from a surface.
    expect(closest).toBeGreaterThan(config.size * 0.5 - 0.25);
    // They kept moving instead of getting stuck against something.
    expect(travelled / agents.length).toBeGreaterThan(config.cruiseSpeed * 60 * 0.8);
  });
});

describe("reef world", () => {
  it("bakes the seabed, the pillars and the free-form mesh", () => {
    const { field } = createReefWorld();
    expect(field.sample(-30, reefFloor(-30, 30) + 2, 30, sample).distance).toBeCloseTo(2, 0);
    expect(field.sample(-14, 0, -10, sample).distance).toBeLessThan(-0.8);
    // On the tube of the torus knot, which only exists as triangles.
    expect(field.sample(15 + 2.4 + 1.2, -3.5, 8, sample).distance).toBeLessThan(0.3);
    expect(field.sample(-28, 2, 0, sample).distance).toBeGreaterThan(4);
  });

  it("splits the requested fish over the three schools", () => {
    const species = reefSpecies(10000);
    expect(species[0].count + species[1].count + species[2].count).toBe(10000);
    expect(species.length).toBeLessThanOrEqual(MAX_SPECIES);
  });
});

describe("fish geometry", () => {
  function part(offsetY: number): BufferGeometry {
    // A flat fish lying along Y, as the fish pack models do, with its back at +Z.
    const geometry = new BufferGeometry();
    geometry.setAttribute(
      "position",
      new Float32BufferAttribute(
        [0, offsetY, 0, 0, offsetY + 2, 0, 0, offsetY + 1, 0.5, 0.1, offsetY, 0],
        3,
      ),
    );
    geometry.setIndex([0, 1, 2, 0, 3, 1]);
    geometry.computeVertexNormals();
    return geometry;
  }

  it("lays the body along Z, one unit long, centred, with part colours", () => {
    const geometry = createFishGeometry([
      { geometry: part(0), color: new Color(1, 0, 0) },
      { geometry: part(2), color: new Color(0, 0, 1) },
    ]);
    geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    expect(box?.max.z).toBeCloseTo(0.5);
    expect(box?.min.z).toBeCloseTo(-0.5);
    expect((box?.max.y ?? 0) + (box?.min.y ?? 1)).toBeCloseTo(0);
    expect(geometry.getAttribute("position").count).toBe(8);
    expect(geometry.index?.count).toBe(12);
    const color = geometry.getAttribute("color");
    expect([color.getX(0), color.getZ(0)]).toEqual([1, 0]);
    expect([color.getX(7), color.getZ(7)]).toEqual([0, 1]);
  });

  it("points each instance at its boid's texel", () => {
    const fish = createFishGeometry([{ geometry: part(0), color: new Color(1, 1, 1) }]);
    const instances = createFishInstances(fish, 10, 18, 5);
    const refs = instances.getAttribute("aRef");
    expect(instances.instanceCount).toBe(5);
    expect([refs.getX(0), refs.getY(0)]).toEqual([8, 1]);
    expect([refs.getX(2), refs.getY(2)]).toEqual([0, 2]);
  });
});

describe("lagoon obstacle field", () => {
  it("bakes the seabed, pillars, arch and reef of the underwater scene", async () => {
    const { createLagoonField, sampleSeabedHeight, PILLARS, ARCH, REEF_FORMATIONS } = await import(
      "../../../UnderwaterShader/lagoonTerrain"
    );
    const field = createLagoonField();
    const out = { distance: 0, nx: 0, ny: 0, nz: 0 };

    // Open water over the lagoon shelf.
    expect(field.sample(0, 38, 14, out).distance).toBeGreaterThan(2);
    // Under the seabed, and the normal points up out of it.
    const floor = sampleSeabedHeight(4, 16);
    expect(field.sample(4, floor - 1.5, 16, out).distance).toBeLessThan(0);
    expect(out.ny).toBeGreaterThan(0.5);
    // Inside a pillar and inside a sea stack.
    const pillar = PILLARS[0];
    expect(field.sample(pillar.pos[0], 40, pillar.pos[2], out).distance).toBeLessThan(0);
    expect(field.sample(-22, 42, -16, out).distance).toBeLessThan(0);
    // The crown of the arch is solid, the opening under it is water.
    const crown = ARCH.position[1] + ARCH.majorRadius * ARCH.scale[1];
    expect(field.sample(0, crown, ARCH.position[2], out).distance).toBeLessThan(0);
    expect(field.sample(0, crown - 6, ARCH.position[2], out).distance).toBeGreaterThan(1);
    // Above the fish ceiling counts as solid.
    expect(field.sample(0, 44.5, 20, out).distance).toBeLessThan(0);
    // A reef formation in open view is solid at its centre.
    const reef = REEF_FORMATIONS.find((f) => f.kind === "boulder" && f.scale[1] > 1);
    if (reef)
      expect(field.sample(reef.pos[0], reef.pos[1], reef.pos[2], out).distance).toBeLessThan(0.3);
  });
});

describe("agent steering", () => {
  it("turns one way at a time instead of twitching near surfaces", async () => {
    const { createLagoonField, LAGOON_BOUNDS } = await import(
      "../../../UnderwaterShader/lagoonTerrain"
    );
    const field = createLagoonField();
    const rng = createRng(21);
    const shark = createAgent(
      { size: 4.6, cruiseSpeed: 4.4, turnRate: 1.1, clearance: 3 },
      field,
      LAGOON_BOUNDS,
      rng,
    );
    const dt = 1 / 60;
    const sample = { distance: 0, nx: 0, ny: 0, nz: 0 };
    let flips = 0;
    let deepest = Number.POSITIVE_INFINITY;
    let previous = [0, 0, 0];
    for (let frame = 0; frame < 60 * 240; frame++) {
      const [hx, hy, hz] = shark.heading;
      if (stepAgent(shark, field, LAGOON_BOUNDS, dt)) retarget(shark, field, LAGOON_BOUNDS, rng);
      const h = shark.heading;
      const axis = [hy * h[2] - hz * h[1], hz * h[0] - hx * h[2], hx * h[1] - hy * h[0]];
      const turning = Math.hypot(axis[0], axis[1], axis[2]) > 0.003;
      const before = Math.hypot(previous[0], previous[1], previous[2]) > 0.003;
      if (turning && before) {
        if (axis[0] * previous[0] + axis[1] * previous[1] + axis[2] * previous[2] < 0) flips++;
      }
      previous = axis;
      field.sample(shark.position[0], shark.position[1], shark.position[2], sample);
      deepest = Math.min(deepest, sample.distance);
    }
    // Before the smoothing this was above 100 flips a minute.
    expect(flips / 4).toBeLessThan(15);
    expect(deepest).toBeGreaterThan(0.5);
  });
});
