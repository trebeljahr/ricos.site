import { type FixedLightningStrike, LightningRay } from "@r3f/Helpers/LightningRay";
import { Box, Sphere as SphereMesh } from "@react-three/drei";
import { type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
  DoubleSide,
  type Group,
  type Mesh,
  MeshLambertMaterial,
  MeshStandardMaterial,
  Spherical,
  Vector2,
  Vector3,
} from "three";
import type { LightningStrike, RayParameters } from "three-stdlib";

function randomPointOnSphere() {
  const phi = Math.random() * Math.PI - 0.3;
  const theta = Math.random() * Math.PI * 2;

  return {
    phi,
    theta,
  };
}

export const PlasmaBall = () => {
  const poleHeight = 30;
  const glassSphereDiameter = 20;
  const plasmaSphereRadius = glassSphereDiameter * 0.05;

  const plasmaColor = "#f200ff";
  const blackPlastic = new MeshLambertMaterial({
    color: "#020202",
  });

  const rayDirection = new Vector3();
  const rayLength = 0;
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

      typedLightningStrike.subrayConePosition(segment, parentSubray, childSubray, 0.6, 0.9, 0.7);

      vec1.subVectors(typedLightningStrike.rayParameters.destOffset!, childSubray.pos1);
      vec2.set(0, 0, 0);

      if (typedLightningStrike.randomGenerator.random() < 0.7) {
        vec2.copy(rayDirection).multiplyScalar(rayLength * 1.0865);
      }

      vec1.add(vec2).setLength(rayLength);
      childSubray.pos1.addVectors(vec1, typedLightningStrike.rayParameters.sourceOffset!);
    },
  };

  const groupRef = useRef<Group>(null!);
  const glassMeshRef = useRef<Mesh>(null!);
  const hoverPointRef = useRef<Vector3 | null>(null);
  const pointerNDCRef = useRef<Vector2 | null>(null);
  const wasHoveringRef = useRef(false);
  const sphereRadius = glassSphereDiameter / 2;
  const { camera, raycaster } = useThree();
  const worldHit = useMemo(() => new Vector3(), []);

  const onPointerMove = (event: ThreeEvent<PointerEvent>) => {
    if (!pointerNDCRef.current) pointerNDCRef.current = new Vector2();
    pointerNDCRef.current.copy(event.pointer);
  };

  const onPointerOut = () => {
    pointerNDCRef.current = null;
    hoverPointRef.current = null;
  };

  const updateHoverPointFromPointer = () => {
    const ndc = pointerNDCRef.current;
    if (!ndc || !groupRef.current || !glassMeshRef.current) {
      hoverPointRef.current = null;
      return;
    }
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObject(glassMeshRef.current, false);
    if (hits.length === 0) {
      hoverPointRef.current = null;
      return;
    }
    worldHit.copy(hits[0].point);
    const local = groupRef.current.worldToLocal(worldHit);
    local.sub(plasmaOrigin).normalize().multiplyScalar(sphereRadius).add(plasmaOrigin);
    if (!hoverPointRef.current) hoverPointRef.current = new Vector3();
    hoverPointRef.current.copy(local);
  };

  const jitterStrength = 0.01;
  const dispersalBoost = 0.12;
  const dispersalDecayMs = 600;
  const hoverLerp = 0.55;
  const snapDistance = 0.05;
  const contactSpread = 0.09;
  const contactWander = 0.04;

  const dispersalEndsAtRef = useRef(0);

  const centerDir = useMemo(() => new Vector3(), []);
  const tangent = useMemo(() => new Vector3(), []);
  const perRayTarget = useMemo(() => new Vector3(), []);
  const wanderTarget = useMemo(() => new Vector3(), []);

  useFrame(() => {
    updateHoverPointFromPointer();
    const hoverPoint = hoverPointRef.current;

    if (hoverPoint) {
      wasHoveringRef.current = true;
      centerDir.copy(hoverPoint).sub(plasmaOrigin).normalize();
      lightningRefs.current.forEach((thisRef, i) => {
        const dest = thisRef.rayParameters.destOffset;
        if (!dest) return;
        const offset = hoverOffsets[i];
        if (!offset) return;
        // Wander each per-ray offset toward a fresh random direction so the
        // patch keeps shimmering instead of being frozen.
        wanderTarget.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
        offset.lerp(wanderTarget, contactWander);
        // Nudge centerDir by a per-ray tangent inside a small cone around the cursor.
        tangent.copy(offset).addScaledVector(centerDir, -offset.dot(centerDir));
        perRayTarget
          .copy(centerDir)
          .addScaledVector(tangent, contactSpread)
          .normalize()
          .multiplyScalar(sphereRadius)
          .add(plasmaOrigin);
        if (dest.distanceTo(perRayTarget) < snapDistance) {
          dest.copy(perRayTarget);
        } else {
          dest.lerp(perRayTarget, hoverLerp);
        }
        if (contactPointRefs.current[i]) {
          contactPointRefs.current[i].position.copy(dest);
        }
      });
      return;
    }

    const s = new Spherical(glassSphereDiameter / 2);
    const p = new Vector3();
    const tmp = new Vector3();

    if (wasHoveringRef.current) {
      wasHoveringRef.current = false;
      dispersalEndsAtRef.current = performance.now() + dispersalDecayMs;
      lightningRefs.current.forEach((thisRef, i) => {
        if (!thisRef.rayParameters.destOffset) return;
        if (!contactPoints[i]) return;
        tmp.copy(thisRef.rayParameters.destOffset).sub(plasmaOrigin);
        const sph = new Spherical().setFromVector3(tmp);
        contactPoints[i].phi = sph.phi;
        contactPoints[i].theta = sph.theta;
        // Fresh random target so each ray walks off in its own direction.
        targets[i] = randomPointOnSphere();
      });
    }

    const remainingBoostMs = dispersalEndsAtRef.current - performance.now();
    const boost = remainingBoostMs > 0 ? remainingBoostMs / dispersalDecayMs : 0;
    const effectiveJitter = jitterStrength + boost * (dispersalBoost - jitterStrength);

    lightningRefs.current.forEach((thisRef, i) => {
      if (!thisRef.rayParameters.destOffset) return;
      if (!targets[i]) return;
      if (!contactPoints[i]) return;
      if (!contactPointRefs.current[i]) return;

      const directionPhi = targets[i].phi - contactPoints[i].phi;
      const directionTheta = targets[i].theta - contactPoints[i].theta;

      contactPoints[i].phi += (directionPhi / Math.abs(directionPhi)) * effectiveJitter;
      contactPoints[i].theta += (directionTheta / Math.abs(directionTheta)) * effectiveJitter;

      const delta = 0.1;

      const distancePhi = Math.abs(contactPoints[i].phi - targets[i].phi);
      const distanceTheta = Math.abs(contactPoints[i].theta - targets[i].theta);

      const hasReachedTarget = distancePhi <= delta && distanceTheta <= delta;
      if (hasReachedTarget) {
        const newTarget = randomPointOnSphere();
        targets[i] = newTarget;
      }

      s.phi = contactPoints[i].phi;
      s.theta = contactPoints[i].theta;

      thisRef.rayParameters.destOffset.copy(p.setFromSpherical(s).add(plasmaOrigin));

      contactPointRefs.current[i].position.copy(thisRef.rayParameters.destOffset);
    });
  });

  const { contactPoints, targets, hoverOffsets } = useMemo(() => {
    const contactPoints = [] as { phi: number; theta: number }[];
    const targets = [] as { phi: number; theta: number }[];
    const hoverOffsets = [] as Vector3[];
    const numLightningRays = 30;

    for (let i = 0; i < numLightningRays; i++) {
      contactPoints.push(randomPointOnSphere());
      targets.push(randomPointOnSphere());
      // Random unit direction, scaled by sqrt(random) to bias toward edge of unit disc.
      hoverOffsets.push(new Vector3().randomDirection().multiplyScalar(Math.sqrt(Math.random())));
    }

    return { contactPoints, targets, hoverOffsets };
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: verify dependency list manually
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
    <group scale={1} ref={groupRef}>
      {contactPoints.map((pos, index) => {
        const currentPosition = new Vector3()
          .setFromSphericalCoords(glassSphereDiameter / 2, pos.phi, pos.theta)
          .add(plasmaOrigin);

        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: stable list rendered once, no reorder
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

      <Box
        args={[glassSphereDiameter * 0.5, poleHeight * 0.1, glassSphereDiameter * 0.5]}
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
        <meshStandardMaterial color={plasmaColor} emissive={plasmaColor} emissiveIntensity={3} />
      </mesh>

      <mesh
        position={[0, poleHeight / 2, 0]}
        ref={glassMeshRef}
        onPointerMove={onPointerMove}
        onPointerOut={onPointerOut}
      >
        <sphereGeometry args={[glassSphereDiameter / 2, 80, 40]} />
        <meshPhysicalMaterial
          color={"#ffffff"}
          transparent={true}
          opacity={0.5}
          transmission={0.96}
          side={DoubleSide}
          depthWrite={false}
          metalness={0}
          roughness={0}
        />
      </mesh>
    </group>
  );
};
