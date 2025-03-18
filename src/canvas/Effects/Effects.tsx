import { EffectComposer } from "@react-three/postprocessing";
import { UnderwaterFogEffect } from "../Scenes/OceanDemo/UnderwaterFog";

export function Effects() {
  return (
    <>
      <EffectComposer multisampling={0} depthBuffer={true}>
        <UnderwaterFogEffect />
      </EffectComposer>
    </>
  );
}
