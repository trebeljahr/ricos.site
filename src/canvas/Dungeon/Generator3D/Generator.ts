import { alea } from "seedrandom";
import { Delaunay3D } from "./Delauney3D";
import { DungeonPathfinder3D, GraphNode3D } from "./DungeonPathFinder3D";
import { Edge, Vertex, VertexWithData } from "./GraphStructures";
import { Grid3D } from "./Grid3D";
import { PrimMST } from "./MinimumSpanningTree";
import { CellType3D, Mathf, Room3D, Vector3Int } from "./Types";
import { createRandomFunction, getRandomIntUneven } from "src/lib/utils/misc";

type StairCase = {
  cells: [Vector3Int, Vector3Int, Vector3Int, Vector3Int];
  direction: Vector3Int;
};

export class DungeonGenerator3D {
  public grid: Grid3D<CellType3D>;
  public rooms: Room3D[] = [];
  public stairCases: StairCase[] = [];
  private random: () => number;
  private pathfinder: DungeonPathfinder3D;
  private seed: string;

  constructor(
    private size: Vector3Int,
    private roomCount: number,
    private roomMaxSize: Vector3Int,
    private roomMinSize: Vector3Int,
    seed?: string
  ) {
    this.seed = seed !== undefined ? seed : Math.random().toString();

    this.random = createRandomFunction(this.seed);

    this.grid = new Grid3D<CellType3D>(size, Vector3Int.zero());
    for (let x = 0; x < size.x; x++) {
      for (let y = 0; y < size.y; y++) {
        for (let z = 0; z < size.z; z++) {
          this.grid.setValue(new Vector3Int(x, y, z), CellType3D.None);
        }
      }
    }

    this.pathfinder = new DungeonPathfinder3D(size);
  }

  findBelongingRoom(point: Vector3Int): Room3D | undefined {
    for (const room of this.rooms) {
      if (room.containsPoint(point)) {
        return room;
      }
    }
  }

  generate(): Grid3D<CellType3D> {
    this.placeRooms();

    if (this.rooms.length < 2) {
      console.warn("Not enough rooms to create hallways");
      return this.grid;
    }

    const vertices = this.createVerticesFromRooms();

    const delaunay = Delaunay3D.triangulate(vertices);

    const mstEdges = PrimMST.minimumSpanningTree(delaunay.edges, vertices[0]);

    const finalEdges = PrimMST.addRandomConnections(
      delaunay.edges,
      mstEdges,
      0.125,
      this.random
    );

    this.pathfindHallways(finalEdges);

    return this.grid;
  }

  private placeRooms(): void {
    let placedRooms = 0;
    let attempts = 0;
    const maxAttempts = this.roomCount * 3;

    while (placedRooms < this.roomCount && attempts < maxAttempts) {
      attempts++;

      const location = new Vector3Int(
        Math.floor(this.random() * this.size.x),
        Math.floor(this.random() * this.size.y),
        Math.floor(this.random() * this.size.z)
      );

      const roomSize = new Vector3Int(
        getRandomIntUneven(this.roomMinSize.x, this.roomMaxSize.x, this.random),
        getRandomIntUneven(this.roomMinSize.y, this.roomMaxSize.y, this.random),
        getRandomIntUneven(this.roomMinSize.z, this.roomMaxSize.z, this.random)
      );

      let canPlace = true;
      const newRoom = new Room3D(location, roomSize);

      const buffer = new Room3D(
        new Vector3Int(location.x - 1, location.y, location.z - 1),
        new Vector3Int(roomSize.x + 2, roomSize.y, roomSize.z + 2)
      );

      for (const room of this.rooms) {
        if (Room3D.intersect(room, buffer)) {
          canPlace = false;
          break;
        }
      }

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

        for (const pos of newRoom.bounds.allPositionsWithin()) {
          const center = newRoom.bounds.center;

          const isAlignedWithCenter = pos.x === center.x || pos.z === center.z;
          if (isAlignedWithCenter) {
            this.grid.setValue(pos, CellType3D.RoomCenterAxis);
          } else {
            this.grid.setValue(pos, CellType3D.Room);
          }
        }
      }
    }
  }

  private createVerticesFromRooms(): Vertex[] {
    const vertices: Vertex[] = [];

    for (const room of this.rooms) {
      const center = room.bounds.center;
      vertices.push(new VertexWithData<Room3D>(center, room));
    }

    return vertices;
  }

  private pathfindHallways(edges: Edge[]): void {
    for (const edge of edges) {
      const startRoom = (edge.u as VertexWithData<Room3D>).item;
      const endRoom = (edge.v as VertexWithData<Room3D>).item;

      const startCenter = startRoom.bounds.center;
      const endCenter = endRoom.bounds.center;

      const startPos = Vector3Int.fromVector3(startCenter);
      const endPos = Vector3Int.fromVector3(endCenter);

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
          result.cost = Vector3Int.distance(b.position, endPos);

          if (this.grid.getValue(b.position) === CellType3D.Stairs) {
            return result;
          }

          if (this.grid.getValue(b.position) === CellType3D.Room) {
            result.cost += 5;
          } else if (this.grid.getValue(b.position) === CellType3D.None) {
            result.cost += 1;
          }

          result.traversable = true;
        } else {
          if (
            (this.grid.getValue(a.position) !== CellType3D.None &&
              this.grid.getValue(a.position) !== CellType3D.Hallway) ||
            (this.grid.getValue(b.position) !== CellType3D.None &&
              this.grid.getValue(b.position) !== CellType3D.Hallway)
          ) {
            return result;
          }

          result.cost = 100 + Vector3Int.distance(b.position, endPos);

          const xDir = Mathf.clamp(delta.x, -1, 1);
          const zDir = Mathf.clamp(delta.z, -1, 1);
          const verticalOffset = new Vector3Int(0, delta.y, 0);
          const horizontalOffset = new Vector3Int(xDir, 0, zDir);

          if (
            !this.grid.inBounds(a.position.add(verticalOffset)) ||
            !this.grid.inBounds(a.position.add(horizontalOffset)) ||
            !this.grid.inBounds(
              a.position.add(verticalOffset).add(horizontalOffset)
            )
          ) {
            return result;
          }

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

      const path = this.pathfinder.findPath(startPos, endPos, costFunction);

      if (path) {
        for (let i = 0; i < path.length; i++) {
          const current = path[i];

          if (this.grid.getValue(current) === CellType3D.None) {
            this.grid.setValue(current, CellType3D.Hallway);
          }

          if (i > 0) {
            const prev = path[i - 1];
            const delta = current.subtract(prev);

            if (delta.y !== 0) {
              const xDir = Mathf.clamp(delta.x, -1, 1);
              const zDir = Mathf.clamp(delta.z, -1, 1);
              const verticalOffset = new Vector3Int(0, delta.y, 0);
              const horizontalOffset = new Vector3Int(xDir, 0, zDir);

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
              this.stairCases.push({
                cells: [stairPos1, stairPos2, stairPos3, stairPos4],
                direction: horizontalOffset,
              });
            }
          }
        }
      }
    }
  }

  getStats(): {
    seed: string;
    size: Vector3Int;
    roomCount: number;
    roomMaxSize: Vector3Int;
    roomMinSize: Vector3Int;
    placedRooms: number;
    cellCounts: Record<CellType3D, number>;
  } {
    const cellCounts: Record<CellType3D, number> = {
      [CellType3D.None]: 0,
      [CellType3D.Room]: 0,
      [CellType3D.Hallway]: 0,
      [CellType3D.Stairs]: 0,
      [CellType3D.RoomCenterAxis]: 0,
    };

    this.grid.forEach((pos, cell) => {
      cellCounts[cell]++;
    });

    return {
      seed: this.seed,
      size: this.size,
      roomCount: this.roomCount,
      roomMaxSize: this.roomMaxSize,
      roomMinSize: this.roomMinSize,
      placedRooms: this.rooms.length,
      cellCounts,
    };
  }
}
