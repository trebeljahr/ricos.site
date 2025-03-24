import { extend, ReactThreeFiber, useFrame } from "@react-three/fiber";
import {
  forwardRef,
  PropsWithChildren,
  useImperativeHandle,
  useRef,
} from "react";
import { Material } from "three";
import { LightningStrike, RayParameters } from "three-stdlib";

export type FixedLightningStrike = LightningStrike & {
  rayParameters: RayParameters;
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
