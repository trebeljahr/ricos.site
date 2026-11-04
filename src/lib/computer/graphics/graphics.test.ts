import { describe, expect, it } from "vitest";
import {
  cross,
  determinant2,
  dot,
  identity,
  length,
  lookAt,
  multiply,
  multiplyAll,
  normalize,
  perspective,
  rotate2,
  rotateY,
  scale2,
  subtract,
  transform,
  transformPoint,
  translate2,
  translate3,
  type Vec3,
  viewport,
} from "./matrix";
import {
  floatBytes,
  meshBytes,
  meshEdges,
  pyramid,
  sharedCube,
  sphere,
  splitCube,
  torus,
  triangleMesh,
  wall,
} from "./meshes";
import { type PipelineSettings, pipelineMatrices, vertexJourney } from "./pipeline";
import {
  clipPolygon,
  Framebuffer,
  insideClip,
  type PipelineVertex,
  rasterize,
  scanTriangles,
} from "./rasterizer";
import { material, shade } from "./shading";
import {
  automaticWeights,
  axisAngle,
  composeTransform,
  invert,
  keyAngle,
  loadArissa,
  loadTrex,
  paintWeight,
  restPose,
  samplePose,
  skinMatrices,
  skinPositions,
  smoothWeights,
  worldMatrices,
} from "./skeleton";
import { cylinderMesh, edgeKey, seamPresets, unwrap, weld } from "./unwrap";

const near = (actual: readonly number[], expected: readonly number[], digits = 5) => {
  expect(actual.length).toBe(expected.length);
  actual.forEach((value, i) => {
    expect(value).toBeCloseTo(expected[i], digits);
  });
};

describe("matrices", () => {
  it("leaves things alone with the identity", () => {
    near(multiply(identity(3), rotate2(1)), rotate2(1));
    near(transform(identity(4), [1, 2, 3, 1]), [1, 2, 3, 1]);
  });

  it("applies the rightmost matrix first, so order matters", () => {
    const scaleThenMove = multiply(translate2(1, 0), scale2(2, 2));
    const moveThenScale = multiply(scale2(2, 2), translate2(1, 0));
    near(transform(scaleThenMove, [1, 0, 1]), [3, 0, 1]);
    near(transform(moveThenScale, [1, 0, 1]), [4, 0, 1]);
  });

  it("holds where the axes land in its columns", () => {
    const m = multiply(rotate2(Math.PI / 2), scale2(2, 3));
    near(transform(m, [1, 0, 0]), [m[0], m[3], 0]);
    near(transform(m, [0, 1, 0]), [m[1], m[4], 0]);
  });

  it("does not move a direction with w = 0, only a point with w = 1", () => {
    near(transform(translate2(5, 5), [1, 0, 0]), [1, 0, 0]);
    near(transform(translate2(5, 5), [1, 0, 1]), [6, 5, 1]);
  });

  it("reports flips and squashes through the determinant", () => {
    expect(determinant2(rotate2(1))).toBeCloseTo(1);
    expect(determinant2(scale2(2, 3))).toBeCloseTo(6);
    expect(determinant2(scale2(-1, 1))).toBeCloseTo(-1);
  });

  it("puts the camera at the origin looking down -Z", () => {
    const view = lookAt([3, 4, 5], [0, 0, 0]);
    near(transformPoint(view, [3, 4, 5]), [0, 0, 0]);
    const target = transformPoint(view, [0, 0, 0]);
    near(target, [0, 0, -Math.hypot(3, 4, 5)]);
  });

  it("survives a camera looking straight down", () => {
    const view = lookAt([0, 5, 0], [0, 0, 0]);
    near(transformPoint(view, [0, 0, 0]), [0, 0, -5]);
  });

  it("maps near and far onto the two ends of depth", () => {
    const p = perspective(60, 1, 1, 10);
    const atNear = transform(p, [0, 0, -1, 1]);
    const atFar = transform(p, [0, 0, -10, 1]);
    expect(atNear[2] / atNear[3]).toBeCloseTo(-1);
    expect(atFar[2] / atFar[3]).toBeCloseTo(1);
    expect(atFar[3]).toBeCloseTo(10);
  });

  it("flips y on the way to pixels", () => {
    near(transform(viewport(320, 240), [-1, 1, -1, 1]), [0, 0, 0, 1]);
    near(transform(viewport(320, 240), [1, -1, 1, 1]), [320, 240, 1, 1]);
  });
});

describe("meshes", () => {
  const meshes = {
    triangle: triangleMesh(),
    pyramid: pyramid(),
    sharedCube: sharedCube(),
    splitCube: splitCube(),

    sphere: sphere(),
    torus: torus(),
    wall: wall(4),
  };

  it("keeps every index in range and has one normal per corner", () => {
    for (const mesh of Object.values(meshes)) {
      expect(mesh.normals.length).toBe(mesh.positions.length);
      expect(mesh.tangents.length).toBe(mesh.positions.length);
      expect(mesh.uvs.length).toBe(mesh.positions.length);
      for (const triangle of mesh.triangles) {
        for (const index of triangle) expect(mesh.positions[index]).toBeDefined();
      }
    }
  });

  it("winds closed meshes so that faces point outward", () => {
    for (const mesh of [
      meshes.pyramid,
      meshes.sharedCube,
      meshes.splitCube,
      meshes.sphere,
      meshes.torus,
    ]) {
      const centre = [0, 0, 0] as Vec3;
      for (const [a, b, c] of mesh.triangles) {
        const face = cross(
          subtract(mesh.positions[b], mesh.positions[a]),
          subtract(mesh.positions[c], mesh.positions[a]),
        );
        if (mesh === meshes.torus) continue;
        expect(dot(face, subtract(mesh.positions[a], centre))).toBeGreaterThan(0);
      }
    }
  });

  it("winds the torus in agreement with its normals", () => {
    const mesh = meshes.torus;
    for (const [a, b, c] of mesh.triangles) {
      const face = cross(
        subtract(mesh.positions[b], mesh.positions[a]),
        subtract(mesh.positions[c], mesh.positions[a]),
      );
      expect(dot(face, mesh.normals[a])).toBeGreaterThan(0);
    }
  });

  it("winds the sphere and the wall in agreement with their normals", () => {
    for (const mesh of [meshes.sphere, meshes.wall]) {
      for (const [a, b, c] of mesh.triangles) {
        const face = cross(
          subtract(mesh.positions[b], mesh.positions[a]),
          subtract(mesh.positions[c], mesh.positions[a]),
        );
        expect(dot(face, mesh.normals[a])).toBeGreaterThan(0);
      }
    }
  });

  it("makes the split cube's normals square to its faces", () => {
    const mesh = meshes.splitCube;
    expect(mesh.positions.length).toBe(24);
    expect(meshes.sharedCube.positions.length).toBe(8);
    for (const [a, b, c] of mesh.triangles) {
      const face = normalize(
        cross(
          subtract(mesh.positions[b], mesh.positions[a]),
          subtract(mesh.positions[c], mesh.positions[a]),
        ),
      );
      near(face, mesh.normals[a]);
    }
  });

  it("keeps tangents square to normals", () => {
    for (const mesh of Object.values(meshes)) {
      mesh.tangents.forEach((tangent, i) => {
        expect(Math.abs(dot(tangent, mesh.normals[i]))).toBeLessThan(1e-6);
        expect(length(tangent)).toBeCloseTo(1);
      });
    }
  });

  it("counts edges and bytes", () => {
    expect(meshEdges(meshes.sharedCube).length).toBe(18);
    expect(meshBytes(meshes.sharedCube)).toEqual({
      vertexBuffer: 96,
      indexBuffer: 72,
      withoutIndices: 432,
    });
  });

  it("reads a float's bytes, least significant first", () => {
    expect(floatBytes(1)).toEqual([0x00, 0x00, 0x80, 0x3f]);
    expect(floatBytes(-2)).toEqual([0x00, 0x00, 0x00, 0xc0]);
  });
});

const settings: PipelineSettings = {
  position: [0, 0, 0],
  yaw: 0,
  pitch: 0,
  scale: 1,
  cameraYaw: 0,
  cameraPitch: 0,
  cameraDistance: 5,
  fov: 60,
  near: 1,
  far: 20,
  width: 320,
  height: 240,
};

describe("the journey of a corner", () => {
  it("lands the origin in the middle of the screen", () => {
    const journey = vertexJourney([0, 0, 0], pipelineMatrices(settings), 320, 240);
    near(journey.view, [0, 0, -5, 1]);
    expect(journey.clip[3]).toBeCloseTo(5);
    expect(journey.pixel).toEqual([160, 120]);
    expect(journey.inside).toBe(true);
  });

  it("moves with the model matrix and the camera", () => {
    const moved = vertexJourney(
      [0, 0, 0],
      pipelineMatrices({ ...settings, position: [2, 0, 0] }),
      320,
      240,
    );
    near(moved.world, [2, 0, 0, 1]);
    expect(moved.screen?.[0]).toBeGreaterThan(160);
    const orbit = vertexJourney(
      [0, 0, 0],
      pipelineMatrices({ ...settings, cameraYaw: 90 }),
      320,
      240,
    );
    near(orbit.view, [0, 0, -5, 1]);
  });

  it("makes farther things smaller", () => {
    const m = pipelineMatrices(settings);
    const close = vertexJourney([1, 0, 2], m, 320, 240);
    const far = vertexJourney([1, 0, -2], m, 320, 240);
    expect((close.screen?.[0] ?? 0) - 160).toBeGreaterThan((far.screen?.[0] ?? 0) - 160);
  });

  it("gives no pixel to a corner behind the camera", () => {
    const journey = vertexJourney([0, 0, 10], pipelineMatrices(settings), 320, 240);
    expect(journey.clip[3]).toBeLessThan(0);
    expect(journey.ndc).toBeNull();
    expect(journey.pixel).toBeNull();
    expect(journey.inside).toBe(false);
  });
});

const corner = (x: number, y: number, z: number, w: number, value = 0): PipelineVertex => ({
  clip: [x, y, z, w],
  attributes: [value],
});

describe("clipping", () => {
  it("keeps a triangle that is fully inside as it is", () => {
    const triangle = [corner(0, 0, 0, 1), corner(0.5, 0, 0, 1), corner(0, 0.5, 0, 1)];
    expect(clipPolygon(triangle)).toEqual(triangle);
    expect(insideClip([0.5, 0, 0, 1])).toBe(true);
    expect(insideClip([1.5, 0, 0, 1])).toBe(false);
  });

  it("removes a triangle that is fully outside", () => {
    expect(clipPolygon([corner(2, 0, 0, 1), corner(3, 0, 0, 1), corner(2, 1, 0, 1)])).toEqual([]);
  });

  it("cuts a corner off into a quad, and interpolates what it cuts", () => {
    const out = clipPolygon([
      corner(0, 0, 0, 1, 0),
      corner(3, 0, 0, 1, 3),
      corner(0, 0.5, 0, 1, 0),
    ]);
    expect(out.length).toBe(4);
    for (const v of out) {
      expect(v.clip[0]).toBeLessThanOrEqual(1 + 1e-9);
      expect(v.attributes[0]).toBeCloseTo(v.clip[0]);
    }
  });

  it("removes what is behind the camera", () => {
    const out = clipPolygon([corner(0, 0, 0, 1), corner(0.2, 0, -3, -1), corner(0, 0.2, -3, -1)]);
    for (const v of out) expect(v.clip[3]).toBeGreaterThan(0);
  });
});

describe("the rasterizer", () => {
  // Counter-clockwise seen from the front, and covering the left half of the screen's top.
  const tri = (z = 0, value = 1): [PipelineVertex, PipelineVertex, PipelineVertex] => [
    corner(-1, -1, z, 1, value),
    corner(1, -1, z, 1, value),
    corner(-1, 1, z, 1, value),
  ];
  const paint = (out: number[]) => {
    out[0] = 200;
    out[1] = 100;
    out[2] = 50;
  };

  it("fills half of the screen with half a square", () => {
    const fb = new Framebuffer(8, 8);
    const stats = rasterize(fb, [tri()], (_, out) => paint(out));
    // Eight pixel centres sit exactly on the diagonal, and that edge is not a top or left one.
    expect(stats.fragments).toBe(28);
    expect(fb.owner[7 * 8]).toBe(0);
    expect(fb.owner[7]).toBe(-1);
  });

  it("gives every pixel of a shared edge to one triangle only", () => {
    const fb = new Framebuffer(16, 16);
    const a = corner(-1, -1, 0, 1);
    const b = corner(1, -1, 0, 1);
    const c = corner(1, 1, 0, 1);
    const d = corner(-1, 1, 0, 1);
    const stats = rasterize(
      fb,
      [
        [a, b, c],
        [a, c, d],
      ],
      (_, out) => paint(out),
    );
    expect(stats.fragments).toBe(16 * 16);
    expect(stats.depthRejected).toBe(0);
  });

  it("culls a triangle seen from behind, unless told not to", () => {
    const [a, b, c] = tri();
    const fb = new Framebuffer(8, 8);
    const stats = rasterize(fb, [[a, c, b]], (_, out) => paint(out));
    expect(stats.culled).toBe(1);
    expect(stats.fragments).toBe(0);
    const open = rasterize(new Framebuffer(8, 8), [[a, c, b]], (_, out) => paint(out), {
      cull: false,
    });
    expect(open.fragments).toBeGreaterThan(0);
  });

  it("lets the depth buffer settle who is in front, in either order", () => {
    for (const order of [
      [0.5, -0.5],
      [-0.5, 0.5],
    ]) {
      const fb = new Framebuffer(8, 8);
      const shader = (input: { attributes: number[] }, out: number[]) => {
        out[0] = input.attributes[0] * 100;
        out[1] = 0;
        out[2] = 0;
      };
      rasterize(
        fb,
        order.map((z) => tri(z, z < 0 ? 2 : 1)),
        shader,
      );
      expect(fb.color[7 * 8 * 4]).toBe(200);
    }
    const fb = new Framebuffer(8, 8);
    const stats = rasterize(fb, [tri(-0.5), tri(0.5)], (_, out) => paint(out));
    expect(stats.depthRejected).toBe(stats.fragments / 2);
  });

  it("stops at the fragment limit", () => {
    const fb = new Framebuffer(8, 8);
    const stats = rasterize(fb, [tri()], (_, out) => paint(out), { fragmentLimit: 5 });
    expect(stats.fragments).toBe(5);
    expect(fb.owner.filter((owner) => owner === 0).length).toBe(5);
  });

  it("interpolates with perspective, not in a straight line on screen", () => {
    // A slanted edge from w=1 to w=3 with the attribute running 0 to 1: the middle of the
    // screen is where 1/w is halfway, which is a quarter of the way along in the world.
    const fb = new Framebuffer(4, 4);
    const seen: number[] = [];
    rasterize(
      fb,
      [
        [
          { clip: [-1, -1, 0, 1], attributes: [0] },
          { clip: [3, -3, 0, 3], attributes: [1] },
          { clip: [-1, 1, 0, 1], attributes: [0] },
        ],
      ],
      (input, out) => {
        seen.push(input.attributes[0]);
        out[0] = 0;
        out[1] = 0;
        out[2] = 0;
      },
    );
    const screenLinear = 0.5;
    expect(Math.min(...seen.map((v) => Math.abs(v - screenLinear)))).toBeGreaterThan(0);
    expect(Math.min(...seen)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...seen)).toBeLessThan(0.5);
  });

  it("does not draw geometry behind the camera", () => {
    const mesh = sharedCube();
    const m = pipelineMatrices({ ...settings, cameraDistance: 0.5, near: 0.1 });
    const triangles = mesh.triangles.map(
      ([a, b, c]) =>
        [a, b, c].map((i) => {
          const journey = vertexJourney(mesh.positions[i], m, 64, 48);
          return { clip: journey.clip, attributes: [] };
        }) as unknown as [PipelineVertex, PipelineVertex, PipelineVertex],
    );
    const fb = new Framebuffer(64, 48);
    // The camera is inside the cube, looking at the backs of its faces.
    const stats = rasterize(fb, triangles, (_, out) => paint(out), { cull: false });
    expect(stats.clipped).toBeGreaterThan(0);
    expect(stats.fragments).toBeGreaterThan(0);
  });
});

describe("lighting", () => {
  const base = {
    ambient: 0.1,
    diffuse: 0.8,
    specular: 0.5,
    shininess: 32,
    useColorMap: false,
    useNormalMap: false,
    useSpecularMap: false,
    useOcclusionMap: false,
    smoothSampling: false,
  };
  const input = (light: Vec3) => ({
    position: [0, 0, 0] as Vec3,
    normal: [0, 0, 1] as Vec3,
    tangent: [1, 0, 0] as Vec3,
    u: 0.3,
    v: 0.3,
    light,
    eye: [0, 0, 5] as Vec3,
  });
  const mat = material("bricks");

  it("is brightest with the light straight on, gone from behind", () => {
    const front = shade(input([0, 0, 5]), mat, base);
    expect(front.nDotL).toBeCloseTo(1);
    const slanted = shade(input([5, 0, 5]), mat, base);
    expect(slanted.nDotL).toBeCloseTo(Math.SQRT1_2);
    const behind = shade(input([0, 0, -5]), mat, base);
    expect(behind.nDotL).toBe(0);
    expect(behind.specular[0]).toBe(0);
    expect(behind.final[0]).toBeCloseTo(206 * 0.1);
  });

  it("puts the highlight where the halfway vector meets the normal", () => {
    const onAxis = shade(input([0, 0, 5]), mat, base);
    expect(onAxis.shine).toBeCloseTo(1);
    const off = shade(input([5, 0, 1]), mat, base);
    expect(off.shine).toBeLessThan(0.2);
  });

  it("bends the normal with a normal map and keeps it unit length", () => {
    const lit = input([0, 0, 5]);
    let bent = 0;
    for (let v = 0; v < 1; v += 0.03) {
      const result = shade({ ...lit, u: 0.11, v }, mat, { ...base, useNormalMap: true });
      expect(length(result.normal)).toBeCloseTo(1);
      if (result.normal[2] < 0.99) bent++;
    }
    expect(bent).toBeGreaterThan(0);
    expect(shade(lit, mat, base).normal).toEqual([0, 0, 1]);
  });

  it("takes albedo and shine from the maps only when they are on", () => {
    const lit = input([0, 0, 5]);
    expect(shade(lit, mat, base).albedo).toEqual([206, 206, 206]);
    expect(shade(lit, mat, { ...base, useColorMap: true }).albedo).not.toEqual([206, 206, 206]);
    expect(shade(lit, mat, { ...base, useSpecularMap: true }).specular[0]).toBeLessThan(
      shade(lit, mat, base).specular[0],
    );
  });

  it("keeps a rotated, moved mesh's matrices consistent", () => {
    near(
      transformPoint(multiplyAll(translate3(1, 0, 0), rotateY(Math.PI / 2)), [0, 0, 1]),
      [2, 0, 0],
    );
  });
});

describe("the scan", () => {
  const corners: [number, number][] = [
    [1.5, 10.5],
    [13.5, 8.5],
    [5.5, 1.5],
  ];

  it("fills exactly the pixels the real rasterizer fills", () => {
    const steps = scanTriangles([{ corners, depth: 0.5 }], 16, 12);
    const toClip = ([x, y]: [number, number]): PipelineVertex => ({
      clip: [(x / 16) * 2 - 1, 1 - (y / 12) * 2, 0, 1],
      attributes: [],
    });
    const fb = new Framebuffer(16, 12);
    rasterize(
      fb,
      [[toClip(corners[0]), toClip(corners[1]), toClip(corners[2])]],
      (_, out) => {
        out[0] = 1;
      },
      { cull: false },
    );
    const fromScan = steps.filter((s) => s.outcome === "written").map((s) => s.y * 16 + s.x);
    const fromRaster: number[] = [];
    fb.owner.forEach((owner, i) => {
      if (owner >= 0) fromRaster.push(i);
    });
    expect(fromScan).toEqual(fromRaster);
  });

  it("gives weights that add up to one, and all positive inside", () => {
    for (const step of scanTriangles([{ corners, depth: 0.5 }], 16, 12)) {
      expect(step.weights[0] + step.weights[1] + step.weights[2]).toBeCloseTo(1);
      if (step.inside) expect(Math.min(...step.weights)).toBeGreaterThanOrEqual(0);
    }
  });

  it("puts all of a corner's weight at that corner", () => {
    const steps = scanTriangles(
      [
        {
          corners: [
            [0.5, 0.5],
            [8.5, 0.5],
            [0.5, 8.5],
          ],
          depth: 0.5,
        },
      ],
      10,
      10,
    );
    const first = steps.find((s) => s.x === 0 && s.y === 0);
    expect(first?.weights[0]).toBeCloseTo(1);
  });

  it("settles overlaps by depth, in either order", () => {
    const near = { corners, depth: 0.2 };
    const far = { corners, depth: 0.8 };
    const nearFirst = scanTriangles([near, far], 16, 12);
    expect(nearFirst.filter((s) => s.triangle === 1 && s.outcome === "written").length).toBe(0);
    const farFirst = scanTriangles([far, near], 16, 12);
    expect(farFirst.filter((s) => s.triangle === 1 && s.outcome === "behind").length).toBe(0);
  });
});

describe("matrix inverse", () => {
  it("undoes a transform", () => {
    const m = composeTransform([1, 2, 3], axisAngle([0, 1, 0], 0.7), [2, 2, 2]);
    near(multiply(m, invert(m)), identity(4));
  });
  it("refuses a flat matrix", () => {
    expect(() => invert([1, 1, 0, 0, 0, 0, 0, 0, 1])).toThrow();
  });
});

describe("the T. rex rig", () => {
  it("has parents before children", async () => {
    const { skeleton } = await loadTrex();
    skeleton.parents.forEach((parent, i) => {
      expect(parent).toBeLessThan(i);
    });
  });

  it("stays exactly at rest in the rest pose", async () => {
    const { skeleton, mesh, weights } = await loadTrex();
    const count = skeleton.names.length;
    const skin = skinMatrices(skeleton, worldMatrices(skeleton, restPose(skeleton)));
    const moved = skinPositions(mesh.positions, weights, count, skin);
    moved.forEach((p, i) => {
      near(p, mesh.positions[i], 2);
    });
  });

  it("has weights that sum to one", async () => {
    const { skeleton, mesh, weights } = await loadTrex();
    const count = skeleton.names.length;
    for (let v = 0; v < mesh.positions.length; v++) {
      let total = 0;
      for (let b = 0; b < count; b++) total += weights[v * count + b];
      expect(total).toBeCloseTo(1, 2);
    }
  });

  it("moves when a clip plays, and the nose is on the head", async () => {
    const { skeleton, mesh, weights, clips, nose } = await loadTrex();
    const count = skeleton.names.length;
    expect(weights[nose * count + skeleton.names.indexOf("Head")]).toBeGreaterThan(0.9);
    const pose = samplePose(clips.Walk, count, 0.4);
    const skin = skinMatrices(skeleton, worldMatrices(skeleton, pose));
    const moved = skinPositions(mesh.positions, weights, count, skin);
    let furthest = 0;
    moved.forEach((p, i) => {
      furthest = Math.max(furthest, length(subtract(p, mesh.positions[i])));
    });
    expect(furthest).toBeGreaterThan(0.05);
    expect(furthest).toBeLessThan(3);
  });

  it("holds the last key when stepping", async () => {
    const { skeleton, clips } = await loadTrex();
    const count = skeleton.names.length;
    const clip = clips.Walk;
    const key = clip.duration / (clip.frames - 1);
    const held = samplePose(clip, count, key * 2.5, 1, "step");
    const atKey = samplePose(clip, count, key * 2, 1, "linear");
    near(held.rotations[16], atKey.rotations[16]);
    expect(keyAngle(clip, skeleton, 0, 16)).toBeGreaterThanOrEqual(0);
  });

  it("paints a weight up, keeps the row summing to one, and smooths it back", async () => {
    const { skeleton, mesh, weights } = await loadTrex();
    const count = skeleton.names.length;
    const table = weights.slice();
    paintWeight(table, count, 0, 3, 0.5);
    let total = 0;
    for (let b = 0; b < count; b++) total += table[b];
    expect(total).toBeCloseTo(1, 4);
    paintWeight(table, count, 0, 3, -1);
    expect(table[3]).toBe(0);
    smoothWeights(table, count, 0, [1, 2], 1);
    total = 0;
    for (let b = 0; b < count; b++) total += table[b];
    expect(total).toBeCloseTo(1, 4);
    const auto = automaticWeights(mesh.positions.slice(0, 5), skeleton);
    total = 0;
    for (let b = 0; b < count; b++) total += auto[b];
    expect(total).toBeCloseTo(1, 4);
  });
});

describe("unwrapping", () => {
  const cube = weld(sharedCube());
  it("welds a cube to eight corners, and a split cube too", () => {
    expect(cube.positions.length).toBe(8);
    expect(weld(splitCube()).positions.length).toBe(8);
  });

  it("opens a cube with no stretch or folds", () => {
    const layout = unwrap(cube, seamPresets.cube(cube));
    expect(layout.islands).toBe(1);
    expect(layout.folded).toBe(0);
    expect(Math.max(...layout.stretch)).toBeCloseTo(1, 1);
    expect(Math.min(...layout.stretch)).toBeCloseTo(1, 1);
  });

  it("keeps everything inside the square", () => {
    for (const seams of [seamPresets.cube(cube), new Set<number>()]) {
      for (const triangle of unwrap(cube, seams).corners) {
        for (const [u, v] of triangle) {
          expect(u).toBeGreaterThanOrEqual(0);
          expect(u).toBeLessThanOrEqual(1);
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it("gives a cylinder three islands: two caps and the side", () => {
    const mesh = cylinderMesh();
    const layout = unwrap(mesh, seamPresets.cylinder(mesh));
    expect(layout.islands).toBe(3);
    expect(layout.folded).toBe(0);
    expect(Math.max(...layout.stretch)).toBeLessThan(1.2);
  });

  it("flattens a sphere cut once from pole to pole with no folds", () => {
    const mesh = weld(sphere(12, 8, 1.3));
    const layout = unwrap(mesh, seamPresets.sphere(mesh));
    expect(layout.islands).toBe(1);
    expect(layout.folded).toBe(0);
    expect(Math.max(...layout.stretch)).toBeGreaterThan(1.2);
  });

  it("does not split a closed mesh with a single cut edge", () => {
    expect(unwrap(cube, new Set()).islands).toBe(1);
    expect(unwrap(cube, new Set([edgeKey(0, 1, 8)])).islands).toBe(1);
  });

  it("loads a real layout", async () => {
    const arissa = await loadArissa();
    expect(arissa.texture.startsWith("data:image/jpeg")).toBe(true);
    expect(arissa.uvs.length / 2).toBe(arissa.positions.length / 3);
  });
});
