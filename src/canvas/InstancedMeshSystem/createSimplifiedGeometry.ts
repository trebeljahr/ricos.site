import { Flags, MeshoptSimplifier } from "meshoptimizer";
import { BufferGeometry } from "three";

export interface SimplifyParams {
  ratio: number;
  error: number;
  lockBorder?: boolean;
  errorAbsolute?: boolean;
  sparse?: boolean;
  prune?: boolean;
}

export async function createSimplifiedGeometry(
  geometry: BufferGeometry,
  params: SimplifyParams
): Promise<BufferGeometry> {
  await MeshoptSimplifier.ready;

  const dstGeometry = geometry.clone();
  if (!dstGeometry.index) {
    throw new Error("Geometry must have an index buffer");
  }

  const srcIndexArray = dstGeometry.index.array as Uint32Array;
  const srcPositionArray = dstGeometry.attributes.position
    .array as Float32Array;
  const targetCount = 3 * Math.floor((params.ratio * srcIndexArray.length) / 3);

  const flags: Flags[] = [];
  if (params.lockBorder) flags.push("LockBorder");
  if (params.sparse) flags.push("Sparse");
  if (params.errorAbsolute) flags.push("ErrorAbsolute");
  if (params.prune) {
    MeshoptSimplifier.useExperimentalFeatures = true;
    flags.push("Prune");
  }

  const [dstIndexArray] = MeshoptSimplifier.simplify(
    srcIndexArray,
    srcPositionArray,
    3,
    targetCount,
    params.error,
    flags
  );

  console.log(`targetCount: ${targetCount}, count: ${dstIndexArray.length}`);

  (dstGeometry.index.array as any).set(dstIndexArray);
  dstGeometry.index.needsUpdate = true;

  dstGeometry.setDrawRange(0, dstIndexArray.length);

  return dstGeometry;
}
