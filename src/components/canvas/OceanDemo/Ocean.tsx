import { useRef, useMemo } from "react";
import {
  extend,
  useThree,
  useLoader,
  useFrame,
  Object3DNode,
} from "@react-three/fiber";
import { Water } from "three-stdlib";
import { PlaneGeometry, RepeatWrapping, TextureLoader, Vector3 } from "three";

extend({ Water });

declare module "@react-three/fiber" {
  interface ThreeElements {
    water: Object3DNode<Water, typeof Water>;
  }
}

export function OceanSurface({
  position = [0, 0, 0] as [number, number, number],
}) {
  const ref = useRef<Water>(null!);
  const gl = useThree((state) => state.gl);
  const waterNormals = useLoader(
    TextureLoader,
    "/3d-assets/textures/waternormals.jpeg"
  );
  waterNormals.wrapS = waterNormals.wrapT = RepeatWrapping;
  const geom = useMemo(() => new PlaneGeometry(10000, 10000), []);
  const config = useMemo(
    () => ({
      textureWidth: 512,
      textureHeight: 512,
      waterNormals,
      sunDirection: new Vector3(),
      sunColor: 0xffffff,
      waterColor: 0x001e0f,
      distortionScale: 3.7,
      fog: true,
      format: gl.outputEncoding,
    }),
    [waterNormals, gl.outputEncoding]
  );
  useFrame((state, delta) => {
    if (ref.current) {
      ref.current.material.uniforms.time.value += delta;
    }
  });

  return (
    <water
      ref={ref}
      args={[geom, config]}
      rotation-x={-Math.PI / 2}
      position={position}
    />
  );
}
