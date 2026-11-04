// Bakes two models from public/3d-assets into small JSON files for the 3D demos in
// /computer. The demos run on their own renderer, so they read plain numbers and
// never load three.js or a Draco decoder in the browser.
//
//   node src/scripts/graphics/bakeDemoModels.mjs
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Matrix4, Quaternion, Vector3 } from "three";

const require = createRequire(import.meta.url);
const OUT = "src/lib/computer/graphics/baked";
const RADIUS = 1.9;
const CLIP_FPS = 15;
const CLIPS = {
  Walk: "TRex_Walk",
  Run: "TRex_Run",
  Idle: "TRex_Idle",
  Attack: "TRex_Attack",
  Jump: "TRex_Jump",
};

const round = (value, digits = 3) => Number(value.toFixed(digits));
const linearToSrgb = (c) =>
  Math.round(255 * (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055));

function readGlb(path) {
  const file = readFileSync(path);
  const jsonLength = file.readUInt32LE(12);
  const json = JSON.parse(file.subarray(20, 20 + jsonLength).toString());
  return { json, bin: file.subarray(20 + jsonLength + 8) };
}

const TYPE_SIZE = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
const ARRAYS = {
  5120: Int8Array,
  5121: Uint8Array,
  5122: Int16Array,
  5123: Uint16Array,
  5125: Uint32Array,
  5126: Float32Array,
};

function readAccessor({ json, bin }, index) {
  const accessor = json.accessors[index];
  const view = json.bufferViews[accessor.bufferView];
  const size = TYPE_SIZE[accessor.type];
  const Kind = ARRAYS[accessor.componentType];
  const offset = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const stride = view.byteStride;
  const out = new Float64Array(accessor.count * size);
  const data = new DataView(bin.buffer, bin.byteOffset, bin.byteLength);
  const read = {
    5120: "getInt8",
    5121: "getUint8",
    5122: "getInt16",
    5123: "getUint16",
    5125: "getUint32",
    5126: "getFloat32",
  }[accessor.componentType];
  const step = stride ?? size * Kind.BYTES_PER_ELEMENT;
  for (let i = 0; i < accessor.count; i++) {
    for (let c = 0; c < size; c++) {
      let value = data[read](offset + i * step + c * Kind.BYTES_PER_ELEMENT, true);
      if (accessor.normalized)
        value /= { 5121: 255, 5123: 65535, 5120: 127, 5122: 32767 }[accessor.componentType];
      out[i * size + c] = value;
    }
  }
  return out;
}

const nodeMatrix = (node) => {
  if (node.matrix) return new Matrix4().fromArray(node.matrix);
  return new Matrix4().compose(
    new Vector3(...(node.translation ?? [0, 0, 0])),
    new Quaternion(...(node.rotation ?? [0, 0, 0, 1])),
    new Vector3(...(node.scale ?? [1, 1, 1])),
  );
};

const rowMajor = (m) => {
  const e = m.elements;
  return [
    e[0],
    e[4],
    e[8],
    e[12],
    e[1],
    e[5],
    e[9],
    e[13],
    e[2],
    e[6],
    e[10],
    e[14],
    e[3],
    e[7],
    e[11],
    e[15],
  ].map((v) => round(v, 6));
};

function bakeTrex() {
  const glb = readGlb("public/3d-assets/glb/Trex.glb");
  const { json } = glb;
  const parentOf = new Map();
  json.nodes.forEach((node, i) => {
    for (const child of node.children ?? []) parentOf.set(child, i);
  });
  const globalOf = (i) => {
    const local = nodeMatrix(json.nodes[i]);
    return parentOf.has(i) ? globalOf(parentOf.get(i)).multiply(local) : local;
  };
  const skin = json.skins[0];
  const inverseBind = readAccessor(glb, skin.inverseBindMatrices);
  const skinMatrices = skin.joints.map((joint, j) => {
    const ibm = new Matrix4().fromArray(inverseBind.slice(j * 16, j * 16 + 16));
    return globalOf(joint).multiply(ibm);
  });

  // Parents before children, so a single pass can work out every bone's world matrix.
  const jointSet = new Set(skin.joints);
  const order = [];
  const visit = (node) => {
    if (order.includes(node)) return;
    const parent = parentOf.get(node);
    if (jointSet.has(parent)) visit(parent);
    order.push(node);
  };
  skin.joints.forEach(visit);
  const newIndex = new Map(skin.joints.map((node) => [node, order.indexOf(node)]));

  // Vertices in their rest pose, welded per material.
  const positions = [];
  const joints = [];
  const weights = [];
  const triangles = [];
  const materials = [];
  const keyToIndex = new Map();
  const vector = new Vector3();
  const mesh = json.meshes[json.nodes.find((node) => node.skin !== undefined).mesh];
  for (const primitive of mesh.primitives) {
    const p = readAccessor(glb, primitive.attributes.POSITION);
    const j = readAccessor(glb, primitive.attributes.JOINTS_0);
    const w = readAccessor(glb, primitive.attributes.WEIGHTS_0);
    const indices = readAccessor(glb, primitive.indices);
    const local = [];
    for (let i = 0; i < p.length / 3; i++) {
      const out = new Vector3();
      for (let k = 0; k < 4; k++) {
        const weight = w[i * 4 + k];
        if (weight === 0) continue;
        vector.set(p[i * 3], p[i * 3 + 1], p[i * 3 + 2]).applyMatrix4(skinMatrices[j[i * 4 + k]]);
        out.addScaledVector(vector, weight);
      }
      const key = `${primitive.material}:${out.x.toFixed(2)},${out.y.toFixed(2)},${out.z.toFixed(2)}`;
      let index = keyToIndex.get(key);
      if (index === undefined) {
        index = positions.length / 3;
        keyToIndex.set(key, index);
        positions.push(out.x, out.y, out.z);
        const influences = [];
        for (let k = 0; k < 4; k++) {
          if (w[i * 4 + k] >= 0.01)
            influences.push([newIndex.get(skin.joints[j[i * 4 + k]]), w[i * 4 + k]]);
        }
        const total = influences.reduce((sum, [, value]) => sum + value, 0);
        for (let k = 0; k < 4; k++) {
          joints.push(influences[k]?.[0] ?? 0);
          weights.push(round((influences[k]?.[1] ?? 0) / total));
        }
      }
      local.push(index);
    }
    for (let i = 0; i < indices.length; i += 3) {
      const [a, b, c] = [local[indices[i]], local[indices[i + 1]], local[indices[i + 2]]];
      if (a === b || b === c || a === c) continue;
      triangles.push(a, b, c);
      materials.push(primitive.material);
    }
  }

  // Fit the whole model around the origin, and let the skeleton's root carry the same fit.
  const count = positions.length / 3;
  const low = [Infinity, Infinity, Infinity];
  const high = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < count; i++) {
    for (let c = 0; c < 3; c++) {
      low[c] = Math.min(low[c], positions[i * 3 + c]);
      high[c] = Math.max(high[c], positions[i * 3 + c]);
    }
  }
  const center = low.map((value, c) => (value + high[c]) / 2);
  let radius = 0;
  for (let i = 0; i < count; i++) {
    radius = Math.max(
      radius,
      Math.hypot(
        positions[i * 3] - center[0],
        positions[i * 3 + 1] - center[1],
        positions[i * 3 + 2] - center[2],
      ),
    );
  }
  const fit = RADIUS / radius;
  for (let i = 0; i < count; i++) {
    for (let c = 0; c < 3; c++)
      positions[i * 3 + c] = round((positions[i * 3 + c] - center[c]) * fit);
  }
  const fitMatrix = new Matrix4()
    .makeScale(fit, fit, fit)
    .multiply(new Matrix4().makeTranslation(-center[0], -center[1], -center[2]));
  const rootParent = parentOf.get(order[0]);
  const root =
    rootParent === undefined ? fitMatrix : fitMatrix.clone().multiply(globalOf(rootParent));

  const restOf = (node) => ({
    t: node.translation ?? [0, 0, 0],
    r: node.rotation ?? [0, 0, 0, 1],
    s: node.scale ?? [1, 1, 1],
  });

  const clips = {};
  for (const [label, name] of Object.entries(CLIPS)) {
    const animation = json.animations.find((candidate) => candidate.name.endsWith(name));
    const tracks = new Map();
    let duration = 0;
    for (const channel of animation.channels) {
      const sampler = animation.samplers[channel.sampler];
      const times = readAccessor(glb, sampler.input);
      duration = Math.max(duration, times[times.length - 1]);
      tracks.set(`${channel.target.node}:${channel.target.path}`, {
        times,
        values: readAccessor(glb, sampler.output),
      });
    }
    const frameCount = Math.max(2, Math.round(duration * CLIP_FPS) + 1);
    const sampleTrack = (track, time, size) => {
      const { times, values } = track;
      let i = 0;
      while (i < times.length - 2 && times[i + 1] < time) i++;
      const span = times[i + 1] - times[i] || 1;
      const t = times.length < 2 ? 0 : Math.max(0, Math.min(1, (time - times[i]) / span));
      const out = [];
      for (let c = 0; c < size; c++) {
        const a = values[i * size + c];
        const b = values[Math.min(times.length - 1, i + 1) * size + c];
        out.push(a + (b - a) * t);
      }
      return out;
    };
    const rotations = [];
    const translations = [];
    for (let f = 0; f < frameCount; f++) {
      const time = (f / (frameCount - 1)) * duration;
      for (const node of order) {
        const rest = restOf(json.nodes[node]);
        const rotation = tracks.get(`${node}:rotation`);
        const q = rotation ? sampleTrack(rotation, time, 4) : rest.r;
        const length = Math.hypot(...q) || 1;
        rotations.push(...q.map((v) => round(v / length)));
        const translation = tracks.get(`${node}:translation`);
        translations.push(
          ...(translation ? sampleTrack(translation, time, 3) : rest.t).map((v) => round(v, 4)),
        );
      }
    }
    clips[label] = { duration: round(duration), frames: frameCount, rotations, translations };
  }

  const palette = json.materials.map((material) => {
    const [r, g, b] = material.pbrMetallicRoughness.baseColorFactor;
    // Lifted: the file's colours rely on a lit scene with tone mapping, which the demos do not have.
    return [r, g, b].map((c) => Math.min(255, Math.round(linearToSrgb(c) * 1.45 + 30)));
  });
  return {
    positions,
    triangles,
    materials,
    palette,
    joints,
    weights,
    bones: {
      names: order.map((node) => json.nodes[node].name),
      parents: order.map((node) => {
        const parent = parentOf.get(node);
        return jointSet.has(parent) ? order.indexOf(parent) : -1;
      }),
      translations: order.flatMap((node) => restOf(json.nodes[node]).t.map((v) => round(v, 4))),
      rotations: order.flatMap((node) => restOf(json.nodes[node]).r.map((v) => round(v, 4))),
      scales: order.flatMap((node) => restOf(json.nodes[node]).s.map((v) => round(v, 4))),
      root: rowMajor(root),
    },
    clips,
  };
}

async function bakeArissa() {
  const glb = readGlb("public/3d-assets/glb/characters/arissa-transformed.glb");
  const { json, bin } = glb;
  // three's package is ESM, while this file is CommonJS: load a copy that says so.
  const decoderCopy = join(mkdtempSync(join(tmpdir(), "draco-")), "draco_decoder.cjs");
  writeFileSync(
    decoderCopy,
    readFileSync(require.resolve("three/examples/jsm/libs/draco/gltf/draco_decoder.js")),
  );
  const DracoDecoderModule = require(decoderCopy);
  const draco = await DracoDecoderModule();
  const position = [];
  const uv = [];
  const indices = [];
  const decoder = new draco.Decoder();
  for (const { primitives } of json.meshes) {
    for (const primitive of primitives) {
      const compressed = primitive.extensions.KHR_draco_mesh_compression;
      const view = json.bufferViews[compressed.bufferView];
      const bytes = new Int8Array(
        bin.buffer,
        bin.byteOffset + (view.byteOffset ?? 0),
        view.byteLength,
      );
      const buffer = new draco.DecoderBuffer();
      buffer.Init(bytes, bytes.length);
      const mesh = new draco.Mesh();
      const status = decoder.DecodeBufferToMesh(buffer, mesh);
      if (!status.ok()) throw new Error(status.error_msg());
      const attribute = (id, size) => {
        const out = new draco.DracoFloat32Array();
        decoder.GetAttributeFloatForAllPoints(mesh, decoder.GetAttributeByUniqueId(mesh, id), out);
        const values = [];
        for (let i = 0; i < mesh.num_points() * size; i++) values.push(out.GetValue(i));
        draco.destroy(out);
        return values;
      };
      const start = position.length / 3;
      position.push(...attribute(compressed.attributes.POSITION, 3));
      uv.push(...attribute(compressed.attributes.TEXCOORD_0, 2));
      const faces = new draco.DracoInt32Array();
      for (let f = 0; f < mesh.num_faces(); f++) {
        decoder.GetFaceFromMesh(mesh, f, faces);
        indices.push(
          start + faces.GetValue(0),
          start + faces.GetValue(1),
          start + faces.GetValue(2),
        );
      }
    }
  }

  const count = position.length / 3;
  const low = [Infinity, Infinity, Infinity];
  const high = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < count; i++) {
    for (let c = 0; c < 3; c++) {
      low[c] = Math.min(low[c], position[i * 3 + c]);
      high[c] = Math.max(high[c], position[i * 3 + c]);
    }
  }
  const center = low.map((value, c) => (value + high[c]) / 2);
  const tallest = Math.max(...high.map((value, c) => value - low[c]));
  const fit = 2.8 / tallest;
  const positions = [];
  const uvs = [];
  for (let i = 0; i < count; i++) {
    for (let c = 0; c < 3; c++) positions.push(round((position[i * 3 + c] - center[c]) * fit));
    uvs.push(round(uv[i * 2], 4), round(uv[i * 2 + 1], 4));
  }

  // The colour map, made small enough to ship.
  const texture = json.textures[json.materials[0].pbrMetallicRoughness.baseColorTexture.index];
  const image = json.images[texture.source ?? texture.extensions.EXT_texture_webp.source];
  const imageView = json.bufferViews[image.bufferView];
  const folder = mkdtempSync(join(tmpdir(), "bake-"));
  const input = join(folder, "in.jpg");
  const output = join(folder, "out.jpg");
  writeFileSync(
    input,
    bin.subarray(imageView.byteOffset ?? 0, (imageView.byteOffset ?? 0) + imageView.byteLength),
  );
  execFileSync(
    "sips",
    ["-Z", "512", "-s", "format", "jpeg", "-s", "formatOptions", "70", input, "--out", output],
    { stdio: "ignore" },
  );
  return {
    positions,
    uvs,
    triangles: indices,
    texture: `data:image/jpeg;base64,${readFileSync(output).toString("base64")}`,
  };
}

const trex = bakeTrex();
writeFileSync(`${OUT}/trex.json`, JSON.stringify(trex));
const arissa = await bakeArissa();
writeFileSync(`${OUT}/arissa.json`, JSON.stringify(arissa));
console.log(
  `trex ${trex.positions.length / 3} vertices, ${trex.triangles.length / 3} triangles; arissa ${arissa.positions.length / 3} vertices, ${arissa.triangles.length / 3} triangles`,
);
