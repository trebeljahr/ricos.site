import { useUnderwaterContext, waterHeight } from "@contexts/UnderwaterContext";
import { In } from "@pages/r3f/scenes/ocean";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";

const defaultOxygenAmount = 60;

export function OxygenBar() {
  // const materialRef = useRef<CustomShaderMaterialType>()
  const [oxygenAmount, setOxygenAmount] = useState(defaultOxygenAmount);
  const { underwater } = useUnderwaterContext();

  const { camera } = useThree();
  let intervalId = useRef<NodeJS.Timeout>(null!);

  useEffect(() => {
    if (!underwater) {
      intervalId.current && clearInterval(intervalId.current);
      setOxygenAmount(defaultOxygenAmount);
    } else {
      intervalId.current && clearInterval(intervalId.current);
      intervalId.current = setInterval(() => {
        setOxygenAmount((old) => old - 1);
      }, 1000);
    }

    return () => {
      clearInterval(intervalId.current);
    };
  }, [underwater]);

  useEffect(() => {
    if (oxygenAmount <= 0) {
      clearInterval(intervalId.current);
    }
  }, [oxygenAmount]);

  const depthRef = useRef<HTMLDivElement>(null!);

  useFrame(() => {
    if (!depthRef.current) return;

    depthRef.current.innerText = `Depth: ${(
      waterHeight - camera.position.y
    ).toFixed(0)}`;
  });

  return (
    <>
      {/* <ScreenSpace depth={1}> */}
      {/* <Html center sprite>
         
        </Html> */}
      {/* </ScreenSpace> */}
      <In>
        <div className="absolute bottom-0 left-0 z-30">
          Oxygen: {oxygenAmount}
        </div>
        <div ref={depthRef} className="absolute left-0 z-30 bottom-10">
          Depth: {waterHeight - camera.position.y}
        </div>
      </In>
    </>
  );
  // useEffect(() => {
  //   if (materialRef.current) {
  //     materialRef.current.uniforms.oxygenAmount.value = oxygenAmount
  //   }
  // }, [oxygenAmount])

  // const uniforms = useMemo(
  //   () => ({
  //     oxygenAmount: {
  //       value: defaultOxygenAmount,
  //     },
  //   }),
  //   [],
  // )

  // return (
  //   <CustomShaderMaterial
  //     ref={materialRef}
  //     baseMaterial={MeshBasicMaterial}
  //     fragmentShader={oxygenFrag}
  //     uniforms={uniforms}
  //     flatShading
  //     color={'#4CBB17'}
  //   />
  // )
}
