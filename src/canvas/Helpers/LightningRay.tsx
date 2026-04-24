import { type ReactThreeFiber, extend, useFrame } from "@react-three/fiber";
import { type PropsWithChildren, forwardRef, useImperativeHandle, useRef } from "react";
import { Clock, type Material, type Object3D } from "three";
import { LightningStrike, type RayParameters } from "three-stdlib";

export type FixedLightningStrike = Object3D &
  LightningStrike & {
    rayParameters: RayParameters;
    randomGenerator: {
      random: () => number;
    };
  };

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

enum LightningRayState {
  RAY_INITIALIZED = 0,
  RAY_UNBORN = 1,
  RAY_PROPAGATING = 2,
  RAY_STEADY = 3,
  RAY_VANISHING = 4,
  RAY_EXTINGUISHED = 5,
}

export const LightningRay = forwardRef(
  (
    {
      material,
      children,
      ...rayParameters
    }: PropsWithChildren<RayParameters & OtherLightningProps>,
    outerRef?: React.Ref<FixedLightningStrike>,
  ) => {
    const innerRef = useRef<FixedLightningStrike>(null!);
    useImperativeHandle(outerRef, () => innerRef.current!, []);

    const clock = useRef(new Clock());

    useFrame(({ scene }) => {
      const time = clock.current.getElapsedTime();
      if (!innerRef.current) return;
      innerRef.current.update(time);

      if (innerRef.current.state === LightningRayState.RAY_EXTINGUISHED) {
        scene.remove(innerRef.current);
        innerRef.current.dispose();
        clock.current.start();
      }
    });

    return (
      <mesh material={material}>
        <lightningStrikeGeometry args={[{ ...rayParameters }]} ref={innerRef} />
        {children}
      </mesh>
    );
  },
);
