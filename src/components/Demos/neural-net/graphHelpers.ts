import { Value } from "./Value";

export type Node = {
  id: string;
  label?: string;
};

export type Edge = {
  source: string;
  target: string;
  id: string;
  label: string;
};

export type GraphData = {
  nodes: Node[];
  edges: Edge[];
};

export function transformToGraph(value: Value) {
  const data: GraphData = {
    nodes: [],
    edges: [],
  };

  function addToGraphDataRecursively(val: Value) {
    data.nodes.push({ id: val.id, label: `grad:${val.grad},data:${val.data}` });
    for (let child of val.children) {
      addToGraphDataRecursively(child);
      data.edges.push({
        source: child.id,
        target: val.id,
        id: `${child.id}-${val.id}`,
        label: val.operation,
      });
    }
  }

  addToGraphDataRecursively(value);

  return data;
}
