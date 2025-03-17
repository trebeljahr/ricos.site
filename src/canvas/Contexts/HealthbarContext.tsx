import { GenericHealthBar, Shapes } from "@r3f/Helpers/Healthbar";
import {
  Billboard,
  Hud,
  OrthographicCamera,
  PerspectiveCamera,
  ScreenSpace,
} from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { view } from "framer-motion/dist/client";
import {
  createContext,
  MutableRefObject,
  PropsWithChildren,
  useContext,
  useEffect,
  useRef,
} from "react";
import { Group } from "three";

const defaultHealth = 1.0;
const maxHealth = 1.0;
const minHealth = 0.0;

const HealthContext = createContext<{
  health: MutableRefObject<number>;
  damage: (amount: number) => void;
  heal: (amount: number) => void;
  setHealth: (amount: number) => void;
}>({
  damage: () => {},
  health: { current: defaultHealth },
  heal: () => {},
  setHealth: () => {},
});

export const useHealthContext = () => {
  return useContext(HealthContext);
};

export const HealthContextProvider = ({
  children,
  hideUI = false,
}: PropsWithChildren<{ hideUI?: boolean }>) => {
  const health = useRef(defaultHealth);

  const heal = (amount: number) => {
    health.current = Math.min(maxHealth, health.current + amount);
  };

  const damage = (amount: number) => {
    health.current = Math.max(minHealth, health.current - amount);
  };

  const setHealth = (amount: number) => {
    health.current = Math.max(minHealth, Math.min(maxHealth, amount));
  };

  const { viewport } = useThree();

  //   const groupRef = useRef<Group>(null!);

  //   useFrame((state) => {
  //     if (groupRef.current) {
  //       groupRef.current.position.copy(state.camera.position);
  //       groupRef.current.rotation.copy(state.camera.rotation);
  //       groupRef.current.position.z += 0.5;
  //     }
  //   });

  console.log(viewport);

  return (
    <HealthContext.Provider value={{ health, damage, heal, setHealth }}>
      {!hideUI && (
        <Hud renderPriority={1}>
          {/* <OrthographicCamera makeDefault position={[0, 0, 1]} /> */}
          <PerspectiveCamera makeDefault position={[0, 0, 10]} />

          <group position={[-viewport.width / 2 + 7, 0, 0]}>
            <GenericHealthBar
              health={health}
              rotation={[0, 0, -Math.PI / 2]}
              scale={[1, 1, 5]}
              shape={Shapes.RHOMBUS}
              waveAmp={0}
              fillColor={"#ff0000"}
              secondColor={"#1fb141"}
              borderWidth={0.01}
            />
          </group>
        </Hud>
      )}
      {children}
    </HealthContext.Provider>
  );
};
