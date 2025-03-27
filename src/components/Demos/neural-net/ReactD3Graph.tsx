// import { Graph } from "react-d3-graph";
import { transformToGraph } from "./graphHelpers";
import { F } from "./Value";

export const MyGraph = () => {
  const data = transformToGraph(F);

  const myConfig = {
    nodeHighlightBehavior: true,
    node: {
      color: "lightgreen",
      size: 120,
      highlightStrokeColor: "blue",
    },
    link: {
      highlightColor: "lightblue",
    },
  };

  // const onClickNode = (nodeId: string) => {
  // window.alert(`Clicked node ${nodeId}`);
  // };

  // const onClickLink = (source: string, target: string) => {
  // window.alert(`Clicked link between ${source} and ${target}`);
  // };

  return null;
  // <Graph
  //   id="graph-id" // id is mandatory
  //   data={data}
  //   config={myConfig}
  //   onClickNode={onClickNode}
  //   onClickLink={onClickLink}
  // />
};
