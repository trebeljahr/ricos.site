import Delaunator from "delaunator";
import { Vector2, Vector2Int } from "./TypeStructure";

export class Vertex {
  constructor(public position: Vector2Int | Vector2, public data?: any) {}
}

export class Edge {
  constructor(public u: Vertex, public v: Vertex) {}

  get distance(): number {
    return Math.sqrt(
      Math.pow(this.u.position.x - this.v.position.x, 2) +
        Math.pow(this.u.position.y - this.v.position.y, 2)
    );
  }

  equals(other: Edge): boolean {
    return (
      (this.u === other.u && this.v === other.v) ||
      (this.u === other.v && this.v === other.u)
    );
  }
}

export class DelaunayHelper {
  static triangulate(vertices: Vertex[]): Edge[] {
    const points: number[] = [];
    for (const vertex of vertices) {
      points.push(vertex.position.x);
      points.push(vertex.position.y);
    }

    const delaunay = new Delaunator(points);
    const triangles = delaunay.triangles;

    const edges: Edge[] = [];
    const edgeSet = new Set<string>();

    for (let i = 0; i < triangles.length; i += 3) {
      const a = vertices[triangles[i]];
      const b = vertices[triangles[i + 1]];
      const c = vertices[triangles[i + 2]];

      this.addUniqueEdge(edges, edgeSet, a, b);
      this.addUniqueEdge(edges, edgeSet, b, c);
      this.addUniqueEdge(edges, edgeSet, c, a);
    }

    return edges;
  }

  private static addUniqueEdge(
    edges: Edge[],
    edgeSet: Set<string>,
    u: Vertex,
    v: Vertex
  ): void {
    const key1 = `${u.position.x},${u.position.y}-${v.position.x},${v.position.y}`;
    const key2 = `${v.position.x},${v.position.y}-${u.position.x},${u.position.y}`;

    if (edgeSet.has(key1) || edgeSet.has(key2)) {
      return;
    }

    edges.push(new Edge(u, v));
    edgeSet.add(key1);
  }
}

export class PrimMST {
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

      const u = chosenEdge.u;
      const v = chosenEdge.v;

      if (openSet.has(u)) {
        openSet.delete(u);
        closedSet.add(u);
      }

      if (openSet.has(v)) {
        openSet.delete(v);
        closedSet.add(v);
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
    const nonMstEdges = allEdges.filter(
      (edge) => !mstEdges.some((mstEdge) => mstEdge.equals(edge))
    );

    const result = [...mstEdges];

    for (const edge of nonMstEdges) {
      if (random() < randomRatio) {
        result.push(edge);
      }
    }

    return result;
  }
}
