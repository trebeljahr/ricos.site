import { Delaunay3D } from "./Delauney3D";
import { DungeonPathfinder3D, GraphNode3D } from "./DungeonPathFinder3D";
import { Edge, Vertex, VertexWithData } from "./GraphStructures";
import { Grid3D } from "./Grid3D";
import { PrimMST } from "./MinimumSpanningTree";
import { CellType3D, Mathf, Room3D, Vector3Int } from "./Types";

class DungeonGenerator3D {
  private grid: Grid3D<CellType3D>;
  private rooms: Room3D[] = [];
  private random: () => number;
  private pathfinder: DungeonPathfinder3D;
  private seed: number;

  /**
   * Create a new dungeon generator
   * @param size Size of the dungeon grid
   * @param roomCount Number of rooms to attempt to place
   * @param roomMaxSize Maximum size of rooms
   * @param seed Random seed (optional)
   */
  constructor(
    private size: Vector3Int,
    private roomCount: number,
    private roomMaxSize: Vector3Int,
    seed?: number
  ) {
    // Set the random seed
    this.seed = seed !== undefined ? seed : Math.floor(Math.random() * 1000000);

    // Initialize random number generator with seed
    this.random = this.createRandomFunction(this.seed);

    // Initialize grid with all cells set to None
    this.grid = new Grid3D<CellType3D>(size, Vector3Int.zero());
    for (let x = 0; x < size.x; x++) {
      for (let y = 0; y < size.y; y++) {
        for (let z = 0; z < size.z; z++) {
          this.grid.setValue(new Vector3Int(x, y, z), CellType3D.None);
        }
      }
    }

    // Initialize pathfinder
    this.pathfinder = new DungeonPathfinder3D(size);
  }

  /**
   * Create a deterministic random function with a seed
   * @param seed Random seed
   * @returns Function that returns a random number between 0 and 1
   */
  private createRandomFunction(seed: number): () => number {
    return () => {
      // Simple xorshift algorithm
      seed ^= seed << 13;
      seed ^= seed >> 17;
      seed ^= seed << 5;
      seed = Math.abs(seed);
      return (seed % 1000000) / 1000000;
    };
  }

  /**
   * Generate the dungeon
   * @returns The dungeon grid
   */
  generate(): Grid3D<CellType3D> {
    console.log(`Starting 3D dungeon generation with seed: ${this.seed}`);

    // Step 1: Place rooms
    this.placeRooms();
    console.log(`Placed ${this.rooms.length} rooms`);

    // If we have fewer than 2 rooms, we can't create hallways
    if (this.rooms.length < 2) {
      console.log("Not enough rooms to create hallways");
      return this.grid;
    }

    // Step 2: Create vertices from room centers
    const vertices = this.createVerticesFromRooms();

    // Step 3: Triangulate the vertices
    console.log("Creating Delaunay triangulation...");
    const delaunay = Delaunay3D.triangulate(vertices);
    console.log(`Created ${delaunay.edges.length} edges from triangulation`);

    // Step 4: Create minimum spanning tree
    console.log("Creating minimum spanning tree...");
    const mstEdges = PrimMST.minimumSpanningTree(delaunay.edges, vertices[0]);
    console.log(`MST contains ${mstEdges.length} edges`);

    // Step 5: Add some random additional connections
    const finalEdges = PrimMST.addRandomConnections(
      delaunay.edges,
      mstEdges,
      0.125, // 12.5% chance to add non-MST edges
      this.random
    );
    console.log(
      `Added ${finalEdges.length - mstEdges.length} additional connections`
    );

    // Step 6: Pathfind hallways between connected rooms
    console.log("Pathfinding hallways and stairs...");
    this.pathfindHallways(finalEdges);
    console.log("Completed hallway pathfinding");

    return this.grid;
  }

  /**
   * Place random rooms on the grid
   */
  private placeRooms(): void {
    console.log(`Attempting to place ${this.roomCount} rooms`);
    let placedRooms = 0;
    let attempts = 0;
    const maxAttempts = this.roomCount * 3; // Limit attempts to avoid infinite loops

    while (placedRooms < this.roomCount && attempts < maxAttempts) {
      attempts++;

      // Generate random position and size
      const location = new Vector3Int(
        Math.floor(this.random() * this.size.x),
        Math.floor(this.random() * this.size.y),
        Math.floor(this.random() * this.size.z)
      );

      const roomSize = new Vector3Int(
        Math.floor(this.random() * this.roomMaxSize.x) + 1,
        Math.floor(this.random() * this.roomMaxSize.y) + 1,
        Math.floor(this.random() * this.roomMaxSize.z) + 1
      );

      let canPlace = true;
      const newRoom = new Room3D(location, roomSize);

      // Add buffer zone around room to prevent rooms from being too close
      // No buffer on y-axis to allow rooms to stack vertically
      const buffer = new Room3D(
        new Vector3Int(location.x - 1, location.y, location.z - 1),
        new Vector3Int(roomSize.x + 2, roomSize.y, roomSize.z + 2)
      );

      // Check for intersections with existing rooms
      for (const room of this.rooms) {
        if (Room3D.intersect(room, buffer)) {
          canPlace = false;
          break;
        }
      }

      // Check if room is within grid bounds
      if (
        newRoom.bounds.xMin < 0 ||
        newRoom.bounds.xMax >= this.size.x ||
        newRoom.bounds.yMin < 0 ||
        newRoom.bounds.yMax >= this.size.y ||
        newRoom.bounds.zMin < 0 ||
        newRoom.bounds.zMax >= this.size.z
      ) {
        canPlace = false;
      }

      if (canPlace) {
        placedRooms++;
        this.rooms.push(newRoom);

        // Mark grid cells as room
        for (const pos of newRoom.bounds.allPositionsWithin()) {
          this.grid.setValue(pos, CellType3D.Room);
        }
      }
    }

    console.log(`Placed ${placedRooms} rooms after ${attempts} attempts`);
  }

  /**
   * Create vertices from room centers for triangulation
   */
  private createVerticesFromRooms(): Vertex[] {
    const vertices: Vertex[] = [];

    for (const room of this.rooms) {
      const center = room.bounds.center;
      vertices.push(new VertexWithData<Room3D>(center, room));
    }

    return vertices;
  }

  /**
   * Pathfind hallways between connected rooms
   * @param edges Edges to create hallways for
   */
  private pathfindHallways(edges: Edge[]): void {
    for (const edge of edges) {
      // Get rooms from vertices
      const startRoom = (edge.u as VertexWithData<Room3D>).item;
      const endRoom = (edge.v as VertexWithData<Room3D>).item;

      // Get room centers
      const startCenter = startRoom.bounds.center;
      const endCenter = endRoom.bounds.center;

      // Convert to grid positions
      const startPos = Vector3Int.fromVector3(startCenter);
      const endPos = Vector3Int.fromVector3(endCenter);

      // Define the pathfinding cost function
      const costFunction = (
        a: GraphNode3D,
        b: GraphNode3D
      ): {
        traversable: boolean;
        cost: number;
        isStairs: boolean;
      } => {
        const result = {
          traversable: false,
          cost: 0,
          isStairs: false,
        };

        const delta = b.position.subtract(a.position);

        if (delta.y === 0) {
          // Flat hallway
          // Use distance to goal as heuristic
          result.cost = Vector3Int.distance(b.position, endPos);

          // Skip if this is a stair cell
          if (this.grid.getValue(b.position) === CellType3D.Stairs) {
            return result;
          }

          // Adjust cost based on cell type
          if (this.grid.getValue(b.position) === CellType3D.Room) {
            // Higher cost to go through rooms (prefer hallways)
            result.cost += 5;
          } else if (this.grid.getValue(b.position) === CellType3D.None) {
            // Medium cost for new cells
            result.cost += 1;
          }

          result.traversable = true;
        } else {
          // Staircase
          // Only allow stairs through empty space or existing hallways
          if (
            (this.grid.getValue(a.position) !== CellType3D.None &&
              this.grid.getValue(a.position) !== CellType3D.Hallway) ||
            (this.grid.getValue(b.position) !== CellType3D.None &&
              this.grid.getValue(b.position) !== CellType3D.Hallway)
          ) {
            return result;
          }

          // High base cost for stairs + heuristic
          result.cost = 100 + Vector3Int.distance(b.position, endPos);

          // Check if we have space for stairs
          const xDir = Mathf.clamp(delta.x, -1, 1);
          const zDir = Mathf.clamp(delta.z, -1, 1);
          const verticalOffset = new Vector3Int(0, delta.y, 0);
          const horizontalOffset = new Vector3Int(xDir, 0, zDir);

          // Check if all positions for the stairs are in bounds
          if (
            !this.grid.inBounds(a.position.add(verticalOffset)) ||
            !this.grid.inBounds(a.position.add(horizontalOffset)) ||
            !this.grid.inBounds(
              a.position.add(verticalOffset).add(horizontalOffset)
            )
          ) {
            return result;
          }

          // Check if all positions for the stairs are empty
          if (
            this.grid.getValue(a.position.add(horizontalOffset)) !==
              CellType3D.None ||
            this.grid.getValue(a.position.add(horizontalOffset.multiply(2))) !==
              CellType3D.None ||
            this.grid.getValue(
              a.position.add(verticalOffset).add(horizontalOffset)
            ) !== CellType3D.None ||
            this.grid.getValue(
              a.position.add(verticalOffset).add(horizontalOffset.multiply(2))
            ) !== CellType3D.None
          ) {
            return result;
          }

          result.traversable = true;
          result.isStairs = true;
        }

        return result;
      };

      // Find path
      const path = this.pathfinder.findPath(startPos, endPos, costFunction);

      // If a path was found, create hallways and stairs
      if (path) {
        for (let i = 0; i < path.length; i++) {
          const current = path[i];

          // Mark current cell as hallway if it's empty
          if (this.grid.getValue(current) === CellType3D.None) {
            this.grid.setValue(current, CellType3D.Hallway);
          }

          // If not the first position, check if we need to create stairs
          if (i > 0) {
            const prev = path[i - 1];
            const delta = current.subtract(prev);

            // If there's a change in height, create stairs
            if (delta.y !== 0) {
              const xDir = Mathf.clamp(delta.x, -1, 1);
              const zDir = Mathf.clamp(delta.z, -1, 1);
              const verticalOffset = new Vector3Int(0, delta.y, 0);
              const horizontalOffset = new Vector3Int(xDir, 0, zDir);

              // Create the stair cells
              const stairPos1 = prev.add(horizontalOffset);
              const stairPos2 = prev.add(horizontalOffset.multiply(2));
              const stairPos3 = prev.add(verticalOffset).add(horizontalOffset);
              const stairPos4 = prev
                .add(verticalOffset)
                .add(horizontalOffset.multiply(2));

              this.grid.setValue(stairPos1, CellType3D.Stairs);
              this.grid.setValue(stairPos2, CellType3D.Stairs);
              this.grid.setValue(stairPos3, CellType3D.Stairs);
              this.grid.setValue(stairPos4, CellType3D.Stairs);
            }
          }
        }
      }
    }
  }

  /**
   * Get information about the dungeon
   * @returns Object with dungeon statistics
   */
  getStats(): {
    seed: number;
    size: Vector3Int;
    roomCount: number;
    roomMaxSize: Vector3Int;
    placedRooms: number;
    cellCounts: Record<CellType3D, number>;
  } {
    // Count cells of each type
    const cellCounts: Record<CellType3D, number> = {
      [CellType3D.None]: 0,
      [CellType3D.Room]: 0,
      [CellType3D.Hallway]: 0,
      [CellType3D.Stairs]: 0,
    };

    this.grid.forEach((pos, cell) => {
      cellCounts[cell]++;
    });

    return {
      seed: this.seed,
      size: this.size,
      roomCount: this.roomCount,
      roomMaxSize: this.roomMaxSize,
      placedRooms: this.rooms.length,
      cellCounts,
    };
  }
}

export { DungeonGenerator3D };
