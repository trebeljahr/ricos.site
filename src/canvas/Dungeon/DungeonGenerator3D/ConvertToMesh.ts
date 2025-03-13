import { Grid3D } from "./Grid3D";
import { CellType3D, Vector3, Vector3Int } from "./Types";

export enum MeshType {
  Floor,
  Wall,
  Ceiling,
  DoorFrame,
  Door,
  Stairs,
  StairsRailing,
}

export class MeshInstance {
  constructor(
    public position: Vector3,
    public rotation: Vector3,
    public meshType: MeshType,
    public scale: Vector3 = new Vector3(1, 1, 1)
  ) {}
}

export class DungeonMeshGenerator {
  private static readonly directions = [
    new Vector3Int(1, 0, 0),
    new Vector3Int(-1, 0, 0),
    new Vector3Int(0, 0, 1),
    new Vector3Int(0, 0, -1),
    new Vector3Int(0, 1, 0),
    new Vector3Int(0, -1, 0),
  ];

  private static readonly rotations = [
    new Vector3(0, 90, 0),
    new Vector3(0, 270, 0),
    new Vector3(0, 0, 0),
    new Vector3(0, 180, 0),
    new Vector3(0, 0, 0),
    new Vector3(180, 0, 0),
  ];

  static generateMeshes(grid: Grid3D<CellType3D>): MeshInstance[] {
    const meshes: MeshInstance[] = [];

    grid.forEach((pos, cellType) => {
      if (cellType === CellType3D.None) return;

      switch (cellType) {
        case CellType3D.Room:
          this.generateRoomMeshes(grid, pos, meshes);
          break;
        case CellType3D.Hallway:
          this.generateHallwayMeshes(grid, pos, meshes);
          break;
        case CellType3D.Stairs:
          this.generateStairsMeshes(grid, pos, meshes);
          break;
      }
    });

    return meshes;
  }

  private static generateRoomMeshes(
    grid: Grid3D<CellType3D>,
    pos: Vector3Int,
    meshes: MeshInstance[]
  ): void {
    for (let i = 0; i < this.directions.length; i++) {
      const neighborPos = pos.add(this.directions[i]);

      if (
        !grid.inBounds(neighborPos) ||
        grid.getValue(neighborPos) === CellType3D.None
      ) {
        const worldPos = new Vector3(pos.x + 0.5, pos.y + 0.5, pos.z + 0.5);

        let meshType: MeshType;
        if (i < 4) {
          meshType = MeshType.Wall;

          const offset = this.directions[i].multiply(0.5);
          worldPos.x += offset.x;
          worldPos.y += offset.y;
          worldPos.z += offset.z;
        } else if (i === 4) {
          meshType = MeshType.Ceiling;
          worldPos.y += 0.5;
        } else {
          meshType = MeshType.Floor;
          worldPos.y -= 0.5;
        }

        meshes.push(new MeshInstance(worldPos, this.rotations[i], meshType));
      } else if (grid.getValue(neighborPos) === CellType3D.Hallway && i < 4) {
        const worldPos = new Vector3(pos.x + 0.5, pos.y + 0.5, pos.z + 0.5);

        const offset = this.directions[i].multiply(0.5);
        worldPos.x += offset.x;
        worldPos.y += offset.y;
        worldPos.z += offset.z;

        meshes.push(
          new MeshInstance(worldPos, this.rotations[i], MeshType.DoorFrame)
        );

        meshes.push(
          new MeshInstance(worldPos, this.rotations[i], MeshType.Door)
        );
      }
    }
  }

  private static generateHallwayMeshes(
    grid: Grid3D<CellType3D>,
    pos: Vector3Int,
    meshes: MeshInstance[]
  ): void {
    for (let i = 0; i < this.directions.length; i++) {
      const neighborPos = pos.add(this.directions[i]);

      if (
        !grid.inBounds(neighborPos) ||
        grid.getValue(neighborPos) === CellType3D.None
      ) {
        const worldPos = new Vector3(pos.x + 0.5, pos.y + 0.5, pos.z + 0.5);

        let meshType: MeshType;
        if (i < 4) {
          meshType = MeshType.Wall;

          const offset = this.directions[i].multiply(0.5);
          worldPos.x += offset.x;
          worldPos.y += offset.y;
          worldPos.z += offset.z;
        } else if (i === 4) {
          meshType = MeshType.Ceiling;
          worldPos.y += 0.5;
        } else {
          meshType = MeshType.Floor;
          worldPos.y -= 0.5;
        }

        meshes.push(new MeshInstance(worldPos, this.rotations[i], meshType));
      }
    }
  }

  private static generateStairsMeshes(
    grid: Grid3D<CellType3D>,
    pos: Vector3Int,
    meshes: MeshInstance[]
  ): void {
    const worldPos = new Vector3(pos.x + 0.5, pos.y + 0.5, pos.z + 0.5);

    let stairDirection = this.determineStairDirection(grid, pos);

    meshes.push(new MeshInstance(worldPos, stairDirection, MeshType.Stairs));

    this.addStairRailings(grid, pos, stairDirection, meshes);

    for (let i = 0; i < 4; i++) {
      const neighborPos = pos.add(this.directions[i]);

      if (
        !grid.inBounds(neighborPos) ||
        grid.getValue(neighborPos) === CellType3D.None
      ) {
        const wallPos = new Vector3(worldPos.x, worldPos.y, worldPos.z);

        const offset = this.directions[i].multiply(0.5);
        wallPos.x += offset.x;
        wallPos.y += offset.y;
        wallPos.z += offset.z;

        meshes.push(
          new MeshInstance(wallPos, this.rotations[i], MeshType.Wall)
        );
      }
    }
  }

  private static determineStairDirection(
    grid: Grid3D<CellType3D>,
    pos: Vector3Int
  ): Vector3 {
    for (let i = 0; i < 4; i++) {
      const dir = this.directions[i];
      const neighborPos = pos.add(dir);

      if (
        grid.inBounds(neighborPos) &&
        grid.getValue(neighborPos) === CellType3D.Stairs
      ) {
        const aboveNeighbor = neighborPos.add(this.directions[4]);
        const belowNeighbor = neighborPos.add(this.directions[5]);

        if (
          grid.inBounds(aboveNeighbor) &&
          grid.getValue(aboveNeighbor) === CellType3D.Stairs
        ) {
          return this.rotations[i];
        }

        if (
          grid.inBounds(belowNeighbor) &&
          grid.getValue(belowNeighbor) === CellType3D.Stairs
        ) {
          return this.rotations[i];
        }
      }
    }

    return this.rotations[2];
  }

  private static addStairRailings(
    grid: Grid3D<CellType3D>,
    pos: Vector3Int,
    stairDirection: Vector3,
    meshes: MeshInstance[]
  ): void {
    const worldPos = new Vector3(pos.x + 0.5, pos.y + 0.5, pos.z + 0.5);

    let forwardDir: Vector3Int;
    let rightDir: Vector3Int;

    if (stairDirection.y === 0 || stairDirection.y === 180) {
      forwardDir = new Vector3Int(0, 0, 1);
      rightDir = new Vector3Int(1, 0, 0);
    } else {
      forwardDir = new Vector3Int(1, 0, 0);
      rightDir = new Vector3Int(0, 0, 1);
    }

    const rightNeighbor = pos.add(rightDir);
    if (
      !grid.inBounds(rightNeighbor) ||
      grid.getValue(rightNeighbor) === CellType3D.None
    ) {
      const railingPos = new Vector3(
        worldPos.x + rightDir.x * 0.5,
        worldPos.y,
        worldPos.z + rightDir.z * 0.5
      );

      meshes.push(
        new MeshInstance(railingPos, stairDirection, MeshType.StairsRailing)
      );
    }

    const leftNeighbor = pos.add(rightDir.multiply(-1));
    if (
      !grid.inBounds(leftNeighbor) ||
      grid.getValue(leftNeighbor) === CellType3D.None
    ) {
      const railingPos = new Vector3(
        worldPos.x + rightDir.x * -0.5,
        worldPos.y,
        worldPos.z + rightDir.z * -0.5
      );

      meshes.push(
        new MeshInstance(
          railingPos,
          stairDirection,
          MeshType.StairsRailing,
          new Vector3(1, 1, -1)
        )
      );
    }
  }
}
