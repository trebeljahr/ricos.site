// import CytoscapeComponent from "react-cytoscapejs";

export const CytoScapeDemo = () => {
  const config = {
    elements: {
      nodes: [
        { data: { id: "cat" } },
        { data: { id: "bird" } },
        { data: { id: "ladybug" } },
        { data: { id: "aphid" } },
        { data: { id: "rose" } },
        { data: { id: "grasshopper" } },
        { data: { id: "plant" } },
        { data: { id: "wheat" } },
      ],
      edges: [
        { data: { source: "cat", target: "bird" } },
        { data: { source: "bird", target: "ladybug" } },
        { data: { source: "bird", target: "grasshopper" } },
        { data: { source: "grasshopper", target: "plant" } },
        { data: { source: "grasshopper", target: "wheat" } },
        { data: { source: "ladybug", target: "aphid" } },
        { data: { source: "aphid", target: "rose" } },
      ],
    },
    layout: {
      name: "breadthfirst",
      directed: true,
      padding: 10,
    },
  };
  return null;
  // <CytoscapeComponent
  //   elements={[...config.elements.nodes, ...config.elements.edges]}
  // />
};
