import { PriorityQueue } from "../DungeonGenerator/TypeStructure";
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

  // Helper to serialize position for Set storage
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
  // Cardinal directions (same level)
  new Vector3Int(1, 0, 0), // right
  new Vector3Int(-1, 0, 0), // left
  new Vector3Int(0, 0, 1), // forward
  new Vector3Int(0, 0, -1), // back

  // Stairs going up
  new Vector3Int(3, 1, 0), // stairs right up
  new Vector3Int(-3, 1, 0), // stairs left up
  new Vector3Int(0, 1, 3), // stairs forward up
  new Vector3Int(0, 1, -3), // stairs back up

  // Stairs going down
  new Vector3Int(3, -1, 0), // stairs right down
  new Vector3Int(-3, -1, 0), // stairs left down
  new Vector3Int(0, -1, 3), // stairs forward down
  new Vector3Int(0, -1, -3), // stairs back down
];

// 3D A* Pathfinding for dungeon hallways and stairs
class DungeonPathfinder3D {
  // Node class for pathfinding

  // Direction vectors for neighboring cells including stair options

  private grid: Grid3D<GraphNode3D>;
  private queue: PriorityQueue<GraphNode3D>;
  private closed: Set<GraphNode3D>;
  private stack: GraphNode3D[];

  constructor(size: Vector3Int) {
    // Initialize grid of nodes
    this.grid = new Grid3D<GraphNode3D>(size, Vector3Int.zero());

    // Create nodes for each position
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

  // Reset nodes for a new pathfinding operation
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

  // Find a path from start to end position
  findPath(
    start: Vector3Int,
    end: Vector3Int,
    costFunction: (a: GraphNode3D, b: GraphNode3D) => PathCost
  ): Vector3Int[] | null {
    // Reset state
    this.resetNodes();
    this.queue.clear();
    this.closed.clear();

    // Set up starting node
    const startNode = this.grid.getValue(start);
    startNode.cost = 0;
    this.queue.enqueue(startNode, 0);

    // A* algorithm
    while (!this.queue.isEmpty()) {
      const node = this.queue.dequeue()!;
      this.closed.add(node);

      // Check if we've reached the end
      if (node.position.equals(end)) {
        return this.reconstructPath(node);
      }

      // Check neighbors
      for (const offset of neighbors) {
        const neighborPos = node.position.add(offset);

        // Skip if out of bounds
        if (!this.grid.inBounds(neighborPos)) continue;

        const neighbor = this.grid.getValue(neighborPos);

        // Skip if already evaluated
        if (this.closed.has(neighbor)) continue;

        // Skip if in node's previous set (avoid backtracking especially for stairs)
        if (
          node.previousSet.has(GraphNode3D.positionToString(neighbor.position))
        ) {
          continue;
        }

        // Get path cost from cost function
        const pathCost = costFunction(node, neighbor);

        // Skip if not traversable
        if (!pathCost.traversable) continue;

        // Special handling for stairs to prevent overlapping stair sections
        if (pathCost.isStairs) {
          const delta = offset;
          const xDir = Mathf.clamp(delta.x, -1, 1);
          const zDir = Mathf.clamp(delta.z, -1, 1);
          const verticalOffset = new Vector3Int(0, delta.y, 0);
          const horizontalOffset = new Vector3Int(xDir, 0, zDir);

          // Check if any of the stair positions are in the previous set
          // This prevents stairs from crossing over each other
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

        // Calculate new cost
        const newCost = node.cost + pathCost.cost;

        // If better path found, update neighbor
        if (newCost < neighbor.cost) {
          neighbor.previous = node;
          neighbor.cost = newCost;

          // Add or update in queue
          if (this.queue.contains(neighbor)) {
            this.queue.updatePriority(neighbor, newCost);
          } else {
            this.queue.enqueue(neighbor, newCost);
          }

          // Update previousSet for the neighbor
          neighbor.previousSet.clear();
          // Copy the previous set from the current node
          node.previousSet.forEach((pos) => {
            neighbor.previousSet.add(pos);
          });
          // Add the current node to the previous set
          neighbor.previousSet.add(GraphNode3D.positionToString(node.position));

          // For stairs, add the stair positions to the previous set
          if (pathCost.isStairs) {
            const delta = offset;
            const xDir = Mathf.clamp(delta.x, -1, 1);
            const zDir = Mathf.clamp(delta.z, -1, 1);
            const verticalOffset = new Vector3Int(0, delta.y, 0);
            const horizontalOffset = new Vector3Int(xDir, 0, zDir);

            // Add all stair positions to the previous set
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

    // No path found
    return null;
  }

  // Reconstruct path from end node
  private reconstructPath(endNode: GraphNode3D): Vector3Int[] {
    const path: Vector3Int[] = [];
    this.stack = [];

    // Build path by following previous nodes
    let current: GraphNode3D | null = endNode;
    while (current !== null) {
      this.stack.push(current);
      current = current.previous;
    }

    // Reverse the path (start to end)
    while (this.stack.length > 0) {
      const node = this.stack.pop()!;
      path.push(node.position);
    }

    return path;
  }
}

export { DungeonPathfinder3D };
