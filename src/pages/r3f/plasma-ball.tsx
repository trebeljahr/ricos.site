import { ThreeFiberLayout } from "@components/dom/Layout";
import { Box, OrbitControls, Stage } from "@react-three/drei";
import {
  Canvas,
  extend,
  ReactThreeFiber,
  ThreeEvent,
  useFrame,
  useThree,
} from "@react-three/fiber";
import {
  Bloom,
  EffectComposer,
  ToneMapping,
} from "@react-three/postprocessing";
import {
  forwardRef,
  PropsWithChildren,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import {
  ColorRepresentation,
  DoubleSide,
  Material,
  Mesh,
  MeshLambertMaterial,
  Raycaster,
  Sphere,
  Vector2,
  Vector3,
} from "three";
import {
  LightningStrike,
  MeshSurfaceSampler,
  RayParameters,
} from "three-stdlib";

type FixedLightningStrike = LightningStrike & { rayParameters: RayParameters };

declare module "@react-three/fiber" {
  interface ThreeElements {
    lightningStrikeGeometry: ReactThreeFiber.Node<
      LightningStrike,
      typeof LightningStrike & { rayParameters: RayParameters }
    >;
  }
}

extend({ LightningStrikeGeometry: LightningStrike });

type OtherLightningProps = {
  material?: Material;
};

const LightningRay = forwardRef(
  (
    {
      material,
      children,
      ...rayParameters
    }: PropsWithChildren<RayParameters & OtherLightningProps>,
    outerRef?: React.Ref<FixedLightningStrike>
  ) => {
    const innerRef = useRef<FixedLightningStrike>(null!);
    useImperativeHandle(outerRef, () => innerRef.current!, []);

    useFrame(({ clock }) => {
      const time = clock.getElapsedTime();
      if (!innerRef.current) return;
      innerRef.current.update(time);
    });

    return (
      <mesh material={material}>
        <lightningStrikeGeometry args={[{ ...rayParameters }]} ref={innerRef} />
        {children}
      </mesh>
    );
  }
);

const PlasmaBall = () => {
  const sphereHeight = 300;
  const sphereRadius = 200;

  const plasmaColor = "#f200ff";
  const blackPlastic = new MeshLambertMaterial({
    color: "#020202",
  });

  const rayDirection = new Vector3();
  let rayLength = 0;
  const vec1 = new Vector3();
  const vec2 = new Vector3();

  const plasmaOrigin = new Vector3(0, sphereHeight * 0.5, 0);

  const rayParams: RayParameters = {
    sourceOffset: plasmaOrigin,
    destOffset: new Vector3(sphereRadius / 2, 0, 0).add(plasmaOrigin),
    radius0: 0.4,
    radius1: 0.4,
    radius0Factor: 0.82,
    minRadius: 2.5,
    maxIterations: 6,
    isEternal: true,

    timeScale: 0.6,
    propagationTimeFactor: 0.15,
    vanishingTimeFactor: 0.87,
    subrayPeriod: 0.8,
    ramification: 5,
    recursionProbability: 0.8,

    roughness: 0.85,
    straightness: 0.7,

    onSubrayCreation(segment, parentSubray, childSubray, lightningStrike) {
      const typedLightningStrike = lightningStrike as LightningStrike & {
        rayParameters: RayParameters;
        subrayConePosition: any;
        randomGenerator: any;
      };

      typedLightningStrike.subrayConePosition(
        segment,
        parentSubray,
        childSubray,
        0.6,
        0.9,
        0.7
      );

      vec1.subVectors(
        childSubray.pos1,
        typedLightningStrike.rayParameters.sourceOffset!
      );
      vec2.set(0, 0, 0);

      if (typedLightningStrike.randomGenerator.random() < 0.7) {
        vec2.copy(rayDirection).multiplyScalar(rayLength * 1.0865);
      }

      vec1.add(vec2).setLength(rayLength);
      childSubray.pos1.addVectors(
        vec1,
        typedLightningStrike.rayParameters.sourceOffset!
      );
    },
  };

  const ref = useRef<FixedLightningStrike>(null!);

  const onPointerOver = (event: ThreeEvent<PointerEvent>) => {
    if (!ref.current) return;
    if (!ref.current.rayParameters.destOffset) return;

    const point = event.point;
    if (!point) return;

    ref.current.rayParameters.destOffset.copy(
      point.add(plasmaOrigin).multiplyScalar(100)
    );
  };

  const glassSphere = useRef<Mesh>(null!);
  const destinations = useMemo(() => {
    if (!glassSphere.current) return [];

    const sampler = new MeshSurfaceSampler(glassSphere.current)
      .setWeightAttribute("color")
      .build();

    const destinations = [] as Vector3[];
    const position = new Vector3();
    const numLightningRays = 20;

    for (let i = 0; i < numLightningRays; i++) {
      sampler.sample(position);
      destinations.push(position.divideScalar(10));
    }

    return destinations;
  }, [glassSphere.current]);

  return (
    <group scale={0.01}>
      {destinations.map((destination, index) => {
        return (
          <LightningRay {...rayParams} destOffset={destination} ref={ref}>
            <meshStandardMaterial
              color={plasmaColor}
              emissive={plasmaColor}
              emissiveIntensity={5}
            />
          </LightningRay>
        );
      })}
      <LightningRay {...rayParams} ref={ref}>
        <meshStandardMaterial
          color={plasmaColor}
          emissive={plasmaColor}
          emissiveIntensity={5}
        />
      </LightningRay>

      <Box
        args={[sphereRadius * 0.5, sphereHeight * 0.1, sphereRadius * 0.5]}
        position={[0, sphereHeight * 0.05 * 0.5, 0]}
        material={blackPlastic}
      />

      <mesh
        position={[0, sphereRadius / 2 - sphereRadius * 0.06 * 1.2, 0]}
        material={blackPlastic}
      >
        <cylinderGeometry
          args={[
            sphereRadius * 0.06,
            sphereRadius * 0.06,
            sphereHeight / 2,
            6,
            1,
            true,
          ]}
        />
      </mesh>

      <mesh position={[0, sphereHeight * 0.5, 0]}>
        <sphereGeometry args={[sphereRadius * 0.1, 24, 12]} />
        <meshStandardMaterial
          color={plasmaColor}
          emissive={plasmaColor}
          emissiveIntensity={3}
          side={DoubleSide}
        />
      </mesh>

      <mesh
        position={[0, sphereHeight / 2, 0]}
        onPointerMove={onPointerOver}
        ref={glassSphere}
      >
        <sphereGeometry args={[sphereRadius / 2, 80, 40]} />
        <meshPhysicalMaterial
          color={"#ffffff"}
          transparent={true}
          opacity={0.5}
          transmission={0.96}
          depthWrite={false}
          metalness={0}
          roughness={0}
        />
      </mesh>
    </group>
  );
};

export default function Page() {
  const rayParams = {
    sourceOffset: new Vector3(),
    destOffset: new Vector3(50, 0, 0),
    radius0: 0.4,
    radius1: 0.4,
    minRadius: 1.5,
    maxRadius: 2,
    maxIterations: 7,
    isEternal: true,

    timeScale: 0.7,

    propagationTimeFactor: 0.05,
    vanishingTimeFactor: 0.95,
    subrayPeriod: 3.5,
    subrayDutyCycle: 0.6,
    maxSubrayRecursion: 3,
    ramification: 7,
    recursionProbability: 0.6,

    roughness: 0.85,
    straightness: 0.6,
  };

  return (
    <ThreeFiberLayout>
      <Canvas>
        <color attach="background" args={["#7b7a7a"]} />
        <ambientLight intensity={1} />

        {/* <LightningRay {...rayParams} /> */}
        <Stage adjustCamera>
          <PlasmaBall />
        </Stage>

        <EffectComposer>
          <Bloom mipmapBlur luminanceThreshold={1} levels={8} intensity={4} />
          <ToneMapping />
        </EffectComposer>
        <OrbitControls />
      </Canvas>
    </ThreeFiberLayout>
  );
}
