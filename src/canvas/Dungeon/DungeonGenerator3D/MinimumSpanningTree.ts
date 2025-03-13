import { Edge, Vertex } from "./GraphStructures";

/**
 * Implementation of Prim's algorithm for finding a minimum spanning tree
 */
class PrimMST {
  /**
   * Calculate a minimum spanning tree for the given edges
   * @param edges List of edges
   * @param start Starting vertex
   * @returns List of edges in the minimum spanning tree
   */
  static minimumSpanningTree(edges: Edge[], start: Vertex): Edge[] {
    // Sets to track which vertices are in the tree and which are not
    const openSet = new Set<Vertex>();
    const closedSet = new Set<Vertex>();

    // Add all vertices to the open set
    for (const edge of edges) {
      openSet.add(edge.u);
      openSet.add(edge.v);
    }

    // Start with the given vertex
    closedSet.add(start);
    openSet.delete(start);

    // Result edges in the minimum spanning tree
    const result: Edge[] = [];

    // Continue until we've included all vertices or can't add any more
    while (openSet.size > 0) {
      let chosen = false;
      let chosenEdge: Edge | null = null;
      let minWeight = Infinity;

      // Find the minimum weight edge connecting a vertex in the closed set
      // to a vertex in the open set
      for (const edge of edges) {
        // Check if exactly one vertex is in the closed set
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

      // If no edge found, break (graph might be disconnected)
      if (!chosen || !chosenEdge) break;

      // Add the edge to the result
      result.push(chosenEdge);

      // Move vertices from open to closed set
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

  /**
   * Add some random connections to the minimum spanning tree
   * @param allEdges All edges in the graph
   * @param mstEdges Edges in the minimum spanning tree
   * @param randomRatio Probability of adding an edge
   * @param random Random number generator
   * @returns Enhanced list of edges
   */
  static addRandomConnections(
    allEdges: Edge[],
    mstEdges: Edge[],
    randomRatio: number,
    random: () => number
  ): Edge[] {
    // Create a set of edge hashes for quick lookup
    const mstEdgeHashes = new Set<string>();
    for (const edge of mstEdges) {
      mstEdgeHashes.add(edge.getHashCode().toString());
    }

    // Create a copy of the MST edges
    const result = [...mstEdges];

    // Add some random edges that are not already in the MST
    for (const edge of allEdges) {
      const hash = edge.getHashCode().toString();
      if (!mstEdgeHashes.has(hash) && random() < randomRatio) {
        result.push(edge);
        // Add to our set to avoid duplicates
        mstEdgeHashes.add(hash);
      }
    }

    return result;
  }
}

export { PrimMST };
