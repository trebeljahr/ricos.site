import { GenericHealthBar, Shapes } from "@r3f/Dungeon/Healthbar/Healthbar";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";

export const HealthbarsDemo = () => {
  const health = useRef(0.75);

  useFrame((state) => {
    health.current = Math.sin(state.clock.getElapsedTime() * 0.5) * 0.5 + 0.5;
  });

  return (
    <>
      <GenericHealthBar
        health={health}
        position={[0, 3, 0]}
        rotation={[0, 0, -Math.PI / 2]}
        scale={[0.5, 1, 5]}
        shape={Shapes.RHOMBUS}
        waveAmp={0}
        fillColor={"#ff0000"}
        secondColor={"#1fb141"}
        borderWidth={0.018}
      />

      <GenericHealthBar
        health={health}
        position={[-3, 3, 0]}
        rotation={[0, 0, 0]}
        scale={[0.5, 1, 3]}
        shape={Shapes.RHOMBUS}
        waveAmp={0}
        fillColor={"#f9ee27"}
        borderWidth={0.03}
      />

      <GenericHealthBar
        health={health}
        position={[0, 1.5, 0]}
        rotation={[0, 0, -Math.PI / 2]}
        scale={[1, 1, 4]}
        shape={Shapes.BOX}
        waveAmp={0}
        borderColor={"#5f5e5e"}
        borderWidth={0.02}
        fillColor={"#00e5ff"}
      />

      <GenericHealthBar
        health={health}
        position={[4, -1, 0]}
        rotation={[0, 0, 0]}
        scale={[2, 1, 2]}
        shape={Shapes.CIRCLE}
        waveAmp={0.01}
        waveFreq={32}
        waveSpeed={0.3}
        borderColor={"#363535"}
        borderWidth={0.02}
        fillColor={"#3279fd"}
      />

      <GenericHealthBar
        health={health}
        position={[0, 0, 0]}
        scale={[1, 1, 1]}
        shape={Shapes.BOX}
        fillColor={"#00ff15"}
      />

      <GenericHealthBar
        health={health}
        position={[-3, -1.5, 0]}
        scale={[2, 1, 1]}
        bgColor={"#3a3a3a"}
        shape={Shapes.RHOMBUS}
        fillColor={"#1ddaa7"}
      />

      <GenericHealthBar
        health={health}
        position={[0, -4.5, 0]}
        scale={[1, 1, 3]}
        shape={Shapes.CIRCLE}
        borderWidth={0.01}
        fillColor={"#ff397b"}
      />

      <GenericHealthBar
        health={health}
        position={[3, -4, 0]}
        rotation={[0, 0, -Math.PI / 2]}
        waveAmp={0}
        scale={[1, 1, 3]}
        shape={Shapes.CIRCLE}
        borderWidth={0.01}
        fillColor={"#f73b11"}
      />

      <GenericHealthBar
        health={health}
        position={[-3, -4, 0]}
        waveAmp={0}
        scale={[2, 1, 2]}
        bgColor={"#3a3a3a"}
        borderColor={"#989898"}
        shape={Shapes.CIRCLE}
        fillColor={"#f7114e"}
      />
    </>
  );
};
