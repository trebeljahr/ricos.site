import { GraphCanvas } from "reagraph";
import { transformToGraph } from "./graphHelpers";
import { F } from "./Value";

export const MyGraph = () => {
  const data = transformToGraph(F);
  const simpleNodes = data.nodes;
  const edges = data.edges;

  return (
    <GraphCanvas
      layoutType="hierarchicalLr"
      nodes={simpleNodes}
      edges={edges}
    />
  );
  3;
};
