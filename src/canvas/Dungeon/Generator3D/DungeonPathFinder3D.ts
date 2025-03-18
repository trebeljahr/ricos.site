import { PriorityQueue } from "../Generator2D/TypeStructure";
import { Grid3D } from "./Grid3D";
import { Mathf, Vector3Int } from "./Types";

export class GraphNode3D {
  position: Vector3Int;
  previous: GraphNode3D | null = null;
  previousSet: Set<string> = new Set<string>();
  cost: number = Infinity;

  constructor(position: Vector3Int) {
    this.position = position;
  }

  static positionToString(pos: Vector3Int): string {
    return `${pos.x},${pos.y},${pos.z}`;
  }
}

interface PathCost {
  traversable: boolean;
  cost: number;
  isStairs: boolean;
}

const neighbors: Vector3Int[] = [
  new Vector3Int(1, 0, 0),
  new Vector3Int(-1, 0, 0),
  new Vector3Int(0, 0, 1),
  new Vector3Int(0, 0, -1),

  new Vector3Int(3, 1, 0),
  new Vector3Int(-3, 1, 0),
  new Vector3Int(0, 1, 3),
  new Vector3Int(0, 1, -3),

  new Vector3Int(3, -1, 0),
  new Vector3Int(-3, -1, 0),
  new Vector3Int(0, -1, 3),
  new Vector3Int(0, -1, -3),
];

class DungeonPathfinder3D {
  private grid: Grid3D<GraphNode3D>;
  private queue: PriorityQueue<GraphNode3D>;
  private closed: Set<GraphNode3D>;
  private stack: GraphNode3D[];

  constructor(size: Vector3Int) {
    this.grid = new Grid3D<GraphNode3D>(size, Vector3Int.zero());

    for (let x = 0; x < size.x; x++) {
      for (let y = 0; y < size.y; y++) {
        for (let z = 0; z < size.z; z++) {
          const position = new Vector3Int(x, y, z);
          this.grid.setValue(position, new GraphNode3D(position));
        }
      }
    }

    this.queue = new PriorityQueue<GraphNode3D>();
    this.closed = new Set<GraphNode3D>();
    this.stack = [];
  }

  private resetNodes(): void {
    const size = this.grid.size;

    for (let x = 0; x < size.x; x++) {
      for (let y = 0; y < size.y; y++) {
        for (let z = 0; z < size.z; z++) {
          const position = new Vector3Int(x, y, z);
          const node = this.grid.getValue(position);
          node.previous = null;
          node.cost = Infinity;
          node.previousSet.clear();
        }
      }
    }
  }

  findPath(
    start: Vector3Int,
    end: Vector3Int,
    costFunction: (a: GraphNode3D, b: GraphNode3D) => PathCost
  ): Vector3Int[] | null {
    this.resetNodes();
    this.queue.clear();
    this.closed.clear();

    const startNode = this.grid.getValue(start);
    startNode.cost = 0;
    this.queue.enqueue(startNode, 0);

    while (!this.queue.isEmpty()) {
      const node = this.queue.dequeue()!;
      this.closed.add(node);

      if (node.position.equals(end)) {
        return this.reconstructPath(node);
      }

      for (const offset of neighbors) {
        const neighborPos = node.position.add(offset);

        if (!this.grid.inBounds(neighborPos)) continue;

        const neighbor = this.grid.getValue(neighborPos);

        if (this.closed.has(neighbor)) continue;

        if (
          node.previousSet.has(GraphNode3D.positionToString(neighbor.position))
        ) {
          continue;
        }

        const pathCost = costFunction(node, neighbor);

        if (!pathCost.traversable) continue;

        if (pathCost.isStairs) {
          const delta = offset;
          const xDir = Mathf.clamp(delta.x, -1, 1);
          const zDir = Mathf.clamp(delta.z, -1, 1);
          const verticalOffset = new Vector3Int(0, delta.y, 0);
          const horizontalOffset = new Vector3Int(xDir, 0, zDir);

          const pos1 = node.position.add(horizontalOffset);
          const pos2 = node.position.add(horizontalOffset.multiply(2));
          const pos3 = node.position.add(verticalOffset).add(horizontalOffset);
          const pos4 = node.position
            .add(verticalOffset)
            .add(horizontalOffset.multiply(2));

          if (
            node.previousSet.has(GraphNode3D.positionToString(pos1)) ||
            node.previousSet.has(GraphNode3D.positionToString(pos2)) ||
            node.previousSet.has(GraphNode3D.positionToString(pos3)) ||
            node.previousSet.has(GraphNode3D.positionToString(pos4))
          ) {
            continue;
          }
        }

        const newCost = node.cost + pathCost.cost;

        if (newCost < neighbor.cost) {
          neighbor.previous = node;
          neighbor.cost = newCost;

          if (this.queue.contains(neighbor)) {
            this.queue.updatePriority(neighbor, newCost);
          } else {
            this.queue.enqueue(neighbor, newCost);
          }

          neighbor.previousSet.clear();

          node.previousSet.forEach((pos) => {
            neighbor.previousSet.add(pos);
          });

          neighbor.previousSet.add(GraphNode3D.positionToString(node.position));

          if (pathCost.isStairs) {
            const delta = offset;
            const xDir = Mathf.clamp(delta.x, -1, 1);
            const zDir = Mathf.clamp(delta.z, -1, 1);
            const verticalOffset = new Vector3Int(0, delta.y, 0);
            const horizontalOffset = new Vector3Int(xDir, 0, zDir);

            neighbor.previousSet.add(
              GraphNode3D.positionToString(node.position.add(horizontalOffset))
            );
            neighbor.previousSet.add(
              GraphNode3D.positionToString(
                node.position.add(horizontalOffset.multiply(2))
              )
            );
            neighbor.previousSet.add(
              GraphNode3D.positionToString(
                node.position.add(verticalOffset).add(horizontalOffset)
              )
            );
            neighbor.previousSet.add(
              GraphNode3D.positionToString(
                node.position
                  .add(verticalOffset)
                  .add(horizontalOffset.multiply(2))
              )
            );
          }
        }
      }
    }

    return null;
  }

  private reconstructPath(endNode: GraphNode3D): Vector3Int[] {
    const path: Vector3Int[] = [];
    this.stack = [];

    let current: GraphNode3D | null = endNode;
    while (current !== null) {
      this.stack.push(current);
      current = current.previous;
    }

    while (this.stack.length > 0) {
      const node = this.stack.pop()!;
      path.push(node.position);
    }

    return path;
  }
}

export { DungeonPathfinder3D };
