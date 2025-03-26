import { extend, ReactThreeFiber, useFrame } from "@react-three/fiber";
import {
  forwardRef,
  PropsWithChildren,
  useImperativeHandle,
  useRef,
} from "react";
import { Clock, Material, Object3D } from "three";
import { LightningStrike, RayParameters } from "three-stdlib";

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
  RAY_INITIALIZED,
  RAY_UNBORN,
  RAY_PROPAGATING,
  RAY_STEADY,
  RAY_VANISHING,
  RAY_EXTINGUISHED,
}

export const LightningRay = forwardRef(
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
      <mesh material={material} key={Math.random()}>
        <lightningStrikeGeometry args={[{ ...rayParameters }]} ref={innerRef} />
        {children}
      </mesh>
    );
  }
);
