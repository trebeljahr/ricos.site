import { DungeonPathfinder, PathfinderNode } from "./AStar";
import { DelaunayHelper, Edge, PrimMST, Vertex } from "./Delauney";
import { CellType, Grid2D, Room, Vector2Int } from "./TypeStructure";

export class DungeonGenerator {
  private grid: Grid2D<CellType>;
  private rooms: Room[] = [];
  private random: () => number;
  private pathfinder: DungeonPathfinder;

  constructor(
    private size: Vector2Int,
    private roomCount: number,
    private roomMaxSize: Vector2Int,
    seed?: number
  ) {
    if (seed !== undefined) {
      this.random = (() => {
        let s = seed;
        return () => {
          s = (s * 9301 + 49297) % 233280;
          return s / 233280;
        };
      })();
    } else {
      this.random = Math.random;
    }

    this.grid = new Grid2D<CellType>(size, Vector2Int.zero());
    for (let x = 0; x < size.x; x++) {
      for (let y = 0; y < size.y; y++) {
        this.grid.setValue(new Vector2Int(x, y), CellType.None);
      }
    }

    this.pathfinder = new DungeonPathfinder(size);
  }

  generate(): Grid2D<CellType> {
    this.placeRooms();

    if (this.rooms.length < 2) {
      console.error("Not enough rooms to create hallways");
      return this.grid;
    }

    const vertices = this.createVerticesFromRooms();

    const edges = DelaunayHelper.triangulate(vertices);

    const mstEdges = PrimMST.minimumSpanningTree(edges, vertices[0]);

    const finalEdges = PrimMST.addRandomConnections(
      edges,
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

      const location = new Vector2Int(
        Math.floor(this.random() * this.size.x),
        Math.floor(this.random() * this.size.y)
      );

      const roomSize = new Vector2Int(
        Math.floor(this.random() * this.roomMaxSize.x) + 1,
        Math.floor(this.random() * this.roomMaxSize.y) + 1
      );

      let canPlace = true;
      const newRoom = new Room(location, roomSize);

      const buffer = new Room(
        new Vector2Int(location.x - 1, location.y - 1),
        new Vector2Int(roomSize.x + 2, roomSize.y + 2)
      );

      for (const room of this.rooms) {
        if (Room.intersect(room, buffer)) {
          canPlace = false;
          break;
        }
      }

      if (
        newRoom.bounds.xMin < 0 ||
        newRoom.bounds.xMax >= this.size.x ||
        newRoom.bounds.yMin < 0 ||
        newRoom.bounds.yMax >= this.size.y
      ) {
        canPlace = false;
      }

      if (canPlace) {
        placedRooms++;
        this.rooms.push(newRoom);

        for (const pos of newRoom.bounds.allPositionsWithin()) {
          this.grid.setValue(pos, CellType.Room);
        }
      }
    }
  }

  private createVerticesFromRooms(): Vertex[] {
    const vertices: Vertex[] = [];

    for (const room of this.rooms) {
      const center = room.bounds.center;
      vertices.push(new Vertex(center, room));
    }

    return vertices;
  }

  private pathfindHallways(edges: Edge[]): void {
    for (const edge of edges) {
      const startRoom = edge.u.data as Room;
      const endRoom = edge.v.data as Room;

      const startCenter = startRoom.bounds.center;
      const endCenter = endRoom.bounds.center;

      const startPos = new Vector2Int(
        Math.floor(startCenter.x),
        Math.floor(startCenter.y)
      );

      const endPos = new Vector2Int(
        Math.floor(endCenter.x),
        Math.floor(endCenter.y)
      );

      const costFunction = (
        a: PathfinderNode,
        b: PathfinderNode
      ): { traversable: boolean; cost: number } => {
        const result = {
          traversable: true,
          cost: 0,
        };

        const dx = b.position.x - endPos.x;
        const dy = b.position.y - endPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        result.cost = distance;

        const cellType = this.grid.getValue(b.position);

        if (cellType === CellType.Room) {
          result.cost += 10;
        } else if (cellType === CellType.None) {
          result.cost += 5;
        } else if (cellType === CellType.Hallway) {
          result.cost += 1;
        }

        return result;
      };

      const path = this.pathfinder.findPath(startPos, endPos, costFunction);

      if (path) {
        for (const pos of path) {
          if (this.grid.getValue(pos) === CellType.None) {
            this.grid.setValue(pos, CellType.Hallway);
          }
        }
      }
    }
  }

  printDungeon(): void {
    let output = "";

    for (let y = 0; y < this.size.y; y++) {
      let row = "";

      for (let x = 0; x < this.size.x; x++) {
        const pos = new Vector2Int(x, y);
        const cellType = this.grid.getValue(pos);

        if (cellType === CellType.Room) {
          row += "R";
        } else if (cellType === CellType.Hallway) {
          row += "H";
        } else {
          row += ".";
        }
      }

      output += row + "\n";
    }
  }
}
