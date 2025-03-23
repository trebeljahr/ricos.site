import { Edge, Vertex } from "./GraphStructures";

class PrimMST {
  static minimumSpanningTree(edges: Edge[], start: Vertex): Edge[] {
    const openSet = new Set<Vertex>();
    const closedSet = new Set<Vertex>();

    for (const edge of edges) {
      openSet.add(edge.u);
      openSet.add(edge.v);
    }

    closedSet.add(start);
    openSet.delete(start);

    const result: Edge[] = [];

    while (openSet.size > 0) {
      let chosen = false;
      let chosenEdge: Edge | null = null;
      let minWeight = Infinity;

      for (const edge of edges) {
        const uInClosed = closedSet.has(edge.u);
        const vInClosed = closedSet.has(edge.v);

        if ((uInClosed && !vInClosed) || (!uInClosed && vInClosed)) {
          if (edge.distance < minWeight) {
            chosenEdge = edge;
            chosen = true;
            minWeight = edge.distance;
          }
        }
      }

      if (!chosen || !chosenEdge) break;

      result.push(chosenEdge);

      if (openSet.has(chosenEdge.u)) {
        openSet.delete(chosenEdge.u);
        closedSet.add(chosenEdge.u);
      }

      if (openSet.has(chosenEdge.v)) {
        openSet.delete(chosenEdge.v);
        closedSet.add(chosenEdge.v);
      }
    }

    return result;
  }

  static addRandomConnections(
    allEdges: Edge[],
    mstEdges: Edge[],
    randomRatio: number,
    random: () => number
  ): Edge[] {
    const mstEdgeHashes = new Set<string>();
    for (const edge of mstEdges) {
      mstEdgeHashes.add(edge.getHashCode().toString());
    }

    const result = [...mstEdges];

    for (const edge of allEdges) {
      const hash = edge.getHashCode().toString();
      if (!mstEdgeHashes.has(hash) && random() < randomRatio) {
        result.push(edge);

        mstEdgeHashes.add(hash);
      }
    }

    return result;
  }
}

export { PrimMST };
