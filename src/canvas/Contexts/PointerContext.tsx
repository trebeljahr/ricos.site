import { useFrame } from "@react-three/fiber";
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useRef,
} from "react";

const defaultPointerState = {
  deltaTemp: { x: 0, y: 0 },
  down: false,
  delta: { x: 0, y: 0 },
  update: function () {
    this.delta = { ...this.deltaTemp };
    this.deltaTemp = { x: 0, y: 0 };
  },
};

const PointerContext = createContext(defaultPointerState);

export const usePointerContext = () => {
  return useContext(PointerContext);
};

export const PointerContextProvider = ({ children }: PropsWithChildren) => {
  const pointer = usePointerState();

  return (
    <PointerContext.Provider value={pointer}>
      {children}
    </PointerContext.Provider>
  );
};

export const usePointerState = () => {
  const pointer = useRef(defaultPointerState);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      event.button === 0 && (pointer.current.down = true);
    };

    const handlePointerUp = (event: PointerEvent) => {
      event.button === 0 && (pointer.current.down = false);
    };

    const handlePointerMove = (event: PointerEvent) => {
      pointer.current.deltaTemp.x += event.movementX;
      pointer.current.deltaTemp.y += event.movementY;
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
    };
  }, []);

  useFrame(() => {
    pointer.current.update();
  });

  return pointer.current;
};
