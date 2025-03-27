import { DataTexture } from "three";

export function fillPositionTexture(texture: DataTexture, bounds: number) {
  const bounds_half = bounds / 2;
  const data =
    texture.image.data instanceof Uint8Array ||
    texture.image.data instanceof Float32Array
      ? texture.image.data
      : new Float32Array(texture.source.data.buffer);

  for (let k = 0, kl = data.length; k < kl; k += 4) {
    const x = Math.random() * bounds - bounds_half;
    const y = Math.random() * bounds - bounds_half;
    const z = Math.random() * bounds - bounds_half;

    data[k + 0] = x;
    data[k + 1] = y;
    data[k + 2] = z;
    data[k + 3] = 1;
  }

  texture.needsUpdate = true;
}

export function fillVelocityTexture(texture: DataTexture) {
  const data =
    texture.image.data instanceof Uint8Array ||
    texture.image.data instanceof Float32Array
      ? texture.image.data
      : new Float32Array(texture.source.data.buffer);

  for (let k = 0, kl = data.length; k < kl; k += 4) {
    const x = Math.random() - 0.5;
    const y = Math.random() - 0.5;
    const z = Math.random() - 0.5;

    data[k + 0] = x;
    data[k + 1] = y;
    data[k + 2] = z;
    data[k + 3] = 1;
  }

  texture.needsUpdate = true;
}
