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
  expanded: boolean;
  setExpanded: Dispatch<SetStateAction<boolean>>;
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
  const [expanded, setExpanded] = useState(false);
  return (
    <EditorContext.Provider
      value={{ code, textures, expanded, setExpanded, setCode, setTextures }}
    >
      {children}
    </EditorContext.Provider>
  );
};
