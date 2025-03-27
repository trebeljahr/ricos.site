import { ThreeFiberLayout } from "@components/dom/ThreeFiberLayout";
import { useAxe1 } from "@r3f/Dungeon/Enemies/Axes";
import { useSword1 } from "@r3f/Dungeon/Enemies/Swords";
import { OrbitControls, useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import {
  Bloom,
  EffectComposer,
  ToneMapping,
} from "@react-three/postprocessing";
import fragmentShader from "@shaders/mesh-merger/particlesFragmentShader.glsl";
import vertexShader from "@shaders/mesh-merger/particlesVertexShader.glsl";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BoxGeometry,
  BufferGeometry,
  DataArrayTexture,
  Float32BufferAttribute,
  FloatType,
  GLSL3,
  Mesh,
  MeshStandardMaterial,
  RawShaderMaterial,
  RGBAFormat,
  Sphere,
  SphereGeometry,
  TorusGeometry,
  TorusKnotGeometry,
  Vector2,
  Vector3,
} from "three";
import { MeshSurfaceSampler } from "three-stdlib";

const seoInfo = {
  title: "Particles for Merging Meshes",
  description: "",
  url: "/r3f/particles/mesh-merger",
  keywords: [
    "threejs",
    "react-three-fiber",
    "particles",
    "r3f",
    "3D",
    "programming",
    "graphics",
    "webgl",
  ],
  image: "/assets/pages/mesh-merger.png",
  imageAlt: "",
};

const Scene = ({ numParticles = 100 }: { numParticles?: number }) => {
  const diffuseTexture = useTexture("/3d-assets/textures/particles/circle.png");
  const sword = useSword1();
  const axe = useAxe1();

  const scaled = useRef(false);

  const { pointGeo, pointMat, samplers } = useMemo(() => {
    const boxGeo = new BoxGeometry(1, 1, 1);
    const sphereGeo = new SphereGeometry(0.8, 32, 32);
    const torusGeo = new TorusGeometry(0.5, 0.15, 16, 100);
    const torusKnotGeo = new TorusKnotGeometry(0.5, 0.15, 100, 16);

    const mat = new MeshStandardMaterial();

    if (!scaled.current) {
      sword.geometry.scale(100, 100, 100).rotateX(-Math.PI / 2);
      axe.geometry.scale(100, 100, 100).translate(0, -0.5, 0);
      scaled.current = true;
    }

    const box = new Mesh(boxGeo.toNonIndexed(), mat);
    const sphere = new Mesh(sphereGeo.toNonIndexed(), mat);
    const torus = new Mesh(torusGeo.toNonIndexed(), mat);
    const torusKnot = new Mesh(torusKnotGeo.toNonIndexed(), mat);
    const swordMesh = new Mesh(sword.geometry.toNonIndexed(), mat);
    const axeMesh = new Mesh(axe.geometry.toNonIndexed(), mat);

    const samplerBox = new MeshSurfaceSampler(box).build();
    const samplerSphere = new MeshSurfaceSampler(sphere).build();
    const samplerTorus = new MeshSurfaceSampler(torus).build();
    const samplerTorusKnot = new MeshSurfaceSampler(torusKnot).build();
    const swordSampler = new MeshSurfaceSampler(swordMesh).build();
    const axeSampler = new MeshSurfaceSampler(axeMesh).build();

    const pointGeo = new BufferGeometry();
    const positions = [];
    const pt = new Vector3();

    for (let i = 0; i < numParticles * numParticles; ++i) {
      positions.push(i);
    }

    const samplers = [
      samplerBox,
      swordSampler,
      samplerSphere,
      axeSampler,
      samplerTorus,
      samplerTorusKnot,
    ];
    const data = new Float32Array(
      samplers.length * 4 * numParticles * numParticles
    );

    for (let i = 0; i < samplers.length; ++i) {
      const curData = new Float32Array(4 * numParticles * numParticles);

      for (let j = 0; j < numParticles * numParticles; ++j) {
        samplers[i].sample(pt);

        curData[j * 4 + 0] = pt.x;
        curData[j * 4 + 1] = pt.y;
        curData[j * 4 + 2] = pt.z;
        curData[j * 4 + 3] = 0;
      }

      const offset = i * (4 * numParticles * numParticles);
      data.set(curData, offset);
    }

    const dataTexture = new DataArrayTexture(
      data,
      numParticles,
      numParticles,
      samplers.length
    );
    dataTexture.format = RGBAFormat;
    dataTexture.type = FloatType;
    dataTexture.needsUpdate = true;

    boxGeo.dispose();
    sphereGeo.dispose();
    torusGeo.dispose();
    torusKnotGeo.dispose();
    sword.geometry.dispose();
    axe.geometry.dispose();
    mat.dispose();

    pointGeo.setAttribute("position", new Float32BufferAttribute(positions, 1));

    pointGeo.boundingBox = null;
    pointGeo.boundingSphere = new Sphere(new Vector3(), 1000);

    const pointMat = new RawShaderMaterial({
      uniforms: {
        time: { value: 0 },
        dataTexture: { value: dataTexture },
        dataTextureIndex: { value: 0 },
        dataTextureLength: { value: samplers.length },
        diffuseTexture: { value: diffuseTexture },
        resolution: { value: new Vector2(numParticles, numParticles) },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: AdditiveBlending,
      glslVersion: GLSL3,
    });

    return { pointGeo, pointMat, samplers };
  }, [diffuseTexture, numParticles, sword, axe]);

  useFrame(({ clock }) => {
    const totalTime = clock.getElapsedTime();
    const timeElapsed = totalTime / samplers.length;
    const blendIndex = timeElapsed % samplers.length;
    pointMat.uniforms.time.value = totalTime;
    pointMat.uniforms.dataTextureIndex.value = blendIndex;
  });

  return (
    <>
      <points args={[pointGeo, pointMat]} />
      <EffectComposer>
        <Bloom mipmapBlur luminanceThreshold={1} levels={8} intensity={4} />
        <ToneMapping />
      </EffectComposer>
    </>
  );
};

export default function Page() {
  return (
    <ThreeFiberLayout
      {...seoInfo}
      withKeyboardControls={false}
      camera={{ position: new Vector3(0, 0, 2) }}
    >
      <ambientLight intensity={2} />
      <color attach="background" args={["#191616"]} />
      <Scene />
      <OrbitControls enablePan={false} />
    </ThreeFiberLayout>
  );
}
