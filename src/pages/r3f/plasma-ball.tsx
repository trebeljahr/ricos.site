import { ThreeFiberLayout } from "@components/dom/Layout";
import {
  Box,
  OrbitControls,
  Stage,
  Sphere as SphereMesh,
} from "@react-three/drei";
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
import { getRandomInt } from "src/lib/utils/misc";
import {
  ColorRepresentation,
  DoubleSide,
  Material,
  Mesh,
  MeshLambertMaterial,
  MeshStandardMaterial,
  Raycaster,
  Sphere,
  Spherical,
  Vector2,
  Vector3,
} from "three";
import {
  LightningStrike,
  MeshSurfaceSampler,
  RayParameters,
} from "three-stdlib";
import { lerp } from "three/src/math/MathUtils";

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
  const poleHeight = 30;
  const glassSphereDiameter = 20;
  const plasmaSphereRadius = glassSphereDiameter * 0.05;

  const plasmaColor = "#f200ff";
  const blackPlastic = new MeshLambertMaterial({
    color: "#020202",
  });

  const rayDirection = new Vector3();
  let rayLength = 0;
  const vec1 = new Vector3();
  const vec2 = new Vector3();

  const plasmaOrigin = new Vector3(0, poleHeight * 0.5, 0);

  const rayParams: RayParameters = {
    sourceOffset: plasmaOrigin,
    destOffset: new Vector3(glassSphereDiameter / 2, 0, 0).add(plasmaOrigin),
    radius0: 0.1,
    radius1: 0.1,
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

    ref.current.rayParameters.destOffset.copy(point.add(plasmaOrigin));
  };

  const jitterStrength = 0.005;
  //   const jitterSpeed = 0.5;

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const s = new Spherical(glassSphereDiameter / 2);
    const p = new Vector3();
    const halfPi = Math.PI / 2;

    lightningRefs.current.forEach((thisRef, i) => {
      if (!thisRef.rayParameters.destOffset) return;

      if (!targets[i]) return;

      const directionPhi = contactPoints[i].phi - targets[i].phi;
      const directionTheta = contactPoints[i].theta - targets[i].theta;

      contactPoints[i].phi += directionPhi * jitterStrength;
      contactPoints[i].theta += directionTheta * jitterStrength;

      const delta = 0.01;

      const distancePhi = Math.abs(contactPoints[i].phi - targets[i].phi);
      const distanceTheta = Math.abs(contactPoints[i].theta - targets[i].theta);

      const hasReachedTarget = distancePhi <= delta && distanceTheta <= delta;
      if (hasReachedTarget) {
        targets[i].phi = Math.random() * Math.PI * 2;
        targets[i].theta = Math.random() * Math.PI * 2;
      }

      s.phi = contactPoints[i].phi;
      s.theta = contactPoints[i].theta;

      thisRef.rayParameters.destOffset.copy(
        p.setFromSpherical(s).add(plasmaOrigin)
      );

      if (contactPointRefs.current[i]) {
        contactPointRefs.current[i].position.copy(
          thisRef.rayParameters.destOffset
        );
      }
    });
  });

  const { contactPoints, targets } = useMemo(() => {
    const contactPoints = [] as { phi: number; theta: number }[];
    const targets = [] as { phi: number; theta: number }[];
    const numLightningRays = 30;

    for (let i = 0; i < numLightningRays; i++) {
      contactPoints.push({
        phi: Math.random() * Math.PI * 2,
        theta: Math.random() * Math.PI * 2,
      });

      targets.push({
        phi: Math.random() * Math.PI * 2,
        theta: Math.random() * Math.PI * 2,
      });
    }

    return { contactPoints, targets };
  }, []);

  const plasmaMaterial = useMemo(() => {
    const material = new MeshStandardMaterial({
      color: plasmaColor,
      emissive: plasmaColor,
      emissiveIntensity: 4,
      side: DoubleSide,
    });

    return material;
  }, [plasmaColor]);

  const lightningRefs = useRef<FixedLightningStrike[]>([]);
  const contactPointRefs = useRef<Mesh[]>([]);

  return (
    <group scale={1}>
      {contactPoints.map((pos, index) => {
        const targetPosition = new Vector3()
          .setFromSphericalCoords(
            glassSphereDiameter / 2,
            targets[index].phi,
            targets[index].theta
          )
          .add(plasmaOrigin);

        const currentPosition = new Vector3()
          .setFromSphericalCoords(glassSphereDiameter / 2, pos.phi, pos.theta)
          .add(plasmaOrigin);

        return (
          <group key={index}>
            <SphereMesh
              args={[glassSphereDiameter * 0.004, 24, 12]}
              position={currentPosition.clone()}
              material={plasmaMaterial}
              ref={(elem) => {
                if (elem) {
                  contactPointRefs.current.push(elem);
                }
              }}
            />

            <LightningRay
              {...rayParams}
              destOffset={currentPosition.clone()}
              radius0={0.06}
              radius1={0.06}
              material={plasmaMaterial}
              ref={(elem) => {
                if (elem) {
                  lightningRefs.current.push(elem);
                }
              }}
            />
          </group>
        );
      })}
      {/* <LightningRay {...rayParams} ref={ref}>
        <meshStandardMaterial
          color={plasmaColor}
          emissive={plasmaColor}
          emissiveIntensity={4.5}
        />
      </LightningRay> */}

      <Box
        args={[
          glassSphereDiameter * 0.5,
          poleHeight * 0.1,
          glassSphereDiameter * 0.5,
        ]}
        position={[0, poleHeight * 0.05 * 0.5, 0]}
        material={blackPlastic}
      />

      <mesh
        position={[0, glassSphereDiameter / 2 - plasmaSphereRadius * 2, 0]}
        material={blackPlastic}
      >
        <cylinderGeometry
          args={[
            plasmaSphereRadius - 0.01,
            plasmaSphereRadius - 0.01,
            poleHeight / 2 - plasmaSphereRadius * 2,
            6,
            1,
            true,
          ]}
        />
      </mesh>

      <mesh position={[0, poleHeight * 0.5, 0]}>
        <sphereGeometry args={[glassSphereDiameter * 0.05, 24, 12]} />
        <meshStandardMaterial
          color={plasmaColor}
          emissive={plasmaColor}
          emissiveIntensity={3}
          //   side={DoubleSide}
        />
      </mesh>

      <mesh position={[0, poleHeight / 2, 0]} onPointerMove={onPointerOver}>
        <sphereGeometry args={[glassSphereDiameter / 2, 80, 40]} />
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
  return (
    <ThreeFiberLayout>
      <Canvas>
        <color attach="background" args={["#121524"]} />
        <ambientLight intensity={1} />

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
