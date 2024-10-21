import * as runtime from "react/jsx-runtime";
import { MarkdownRenderers } from "./CustomRenderers";
import { UnitVectorDemo } from "./collisionDetection/UnitVectorDemo";
import { ThreeFiberDemo } from "./Demo";

const useMDXComponent = (code: string) => {
  const fn = new Function(code);
  return fn({ ...runtime }).default;
};

interface MDXProps {
  code: string;
  components?: Record<string, React.ComponentType>;
  [key: string]: any;
}

export const MDXContent = ({ code, components, ...props }: MDXProps) => {
  console.log(code);

  const Component = useMDXComponent(code);
  return (
    <Component
      components={{
        ...MarkdownRenderers,
        ...components,
      }}
      {...props}
    />
  );
};
