import {
  createContext,
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  useContext,
  useState,
} from "react";
import { Texture } from "three";

type EditorContextType = {
  code: string;
  setCode: Dispatch<SetStateAction<string>>;
  textures: Texture[];
  setTextures: Dispatch<SetStateAction<Texture[]>>;
};

const EditorContext = createContext({} as EditorContextType);

export const useEditorContext = () => {
  return useContext(EditorContext);
};

export const EditorContextProvider = ({
  children,
  initialCode,
}: PropsWithChildren<{ initialCode: string }>) => {
  const [code, setCode] = useState(initialCode);
  const [textures, setTextures] = useState<Texture[]>([]);
  return (
    <EditorContext.Provider value={{ code, textures, setCode, setTextures }}>
      {children}
    </EditorContext.Provider>
  );
};
