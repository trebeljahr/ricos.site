import { Grid2D, PriorityQueue, Vector2Int } from "./TypeStructure";

export class PathfinderNode {
  position: Vector2Int;
  previous: PathfinderNode | null = null;
  cost: number = Infinity;

  constructor(position: Vector2Int) {
    this.position = position;
  }
}

export interface PathCost {
  traversable: boolean;
  cost: number;
}

export class DungeonPathfinder {
  private static readonly neighbors: Vector2Int[] = [
    new Vector2Int(1, 0),
    new Vector2Int(-1, 0),
    new Vector2Int(0, 1),
    new Vector2Int(0, -1),
  ];

  private grid: Grid2D<PathfinderNode>;
  private queue: PriorityQueue<PathfinderNode>;
  private closed: Set<PathfinderNode>;
  private stack: PathfinderNode[];

  constructor(size: Vector2Int) {
    this.grid = new Grid2D<PathfinderNode>(size, Vector2Int.zero());

    for (let x = 0; x < size.x; x++) {
      for (let y = 0; y < size.y; y++) {
        const position = new Vector2Int(x, y);
        this.grid.setValue(position, new PathfinderNode(position));
      }
    }

    this.queue = new PriorityQueue<PathfinderNode>();
    this.closed = new Set<PathfinderNode>();
    this.stack = [];
  }

  private resetNodes(): void {
    const size = this.grid.size;

    for (let x = 0; x < size.x; x++) {
      for (let y = 0; y < size.y; y++) {
        const position = new Vector2Int(x, y);
        const node = this.grid.getValue(position);
        node.previous = null;
        node.cost = Infinity;
      }
    }
  }

  findPath(
    start: Vector2Int,
    end: Vector2Int,
    costFunction: (a: PathfinderNode, b: PathfinderNode) => PathCost
  ): Vector2Int[] | null {
    this.resetNodes();
    this.queue = new PriorityQueue<PathfinderNode>();
    this.closed = new Set<PathfinderNode>();

    const startNode = this.grid.getValue(start);
    startNode.cost = 0;
    this.queue.enqueue(startNode, 0);

    while (!this.queue.isEmpty()) {
      const node = this.queue.dequeue()!;
      this.closed.add(node);

      if (node.position.equals(end)) {
        return this.reconstructPath(node);
      }

      for (const offset of DungeonPathfinder.neighbors) {
        const neighborPos = node.position.add(offset);

        if (!this.grid.inBounds(neighborPos)) continue;

        const neighbor = this.grid.getValue(neighborPos);

        if (this.closed.has(neighbor)) continue;

        const pathCost = costFunction(node, neighbor);

        if (!pathCost.traversable) continue;

        const newCost = node.cost + pathCost.cost;

        if (newCost < neighbor.cost) {
          neighbor.previous = node;
          neighbor.cost = newCost;

          if (this.queue.contains(neighbor)) {
            this.queue.updatePriority(neighbor, newCost);
          } else {
            this.queue.enqueue(neighbor, newCost);
          }
        }
      }
    }

    return null;
  }

  private reconstructPath(endNode: PathfinderNode): Vector2Int[] {
    const path: Vector2Int[] = [];
    this.stack = [];

    let current: PathfinderNode | null = endNode;
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
