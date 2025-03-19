import { createRandomFunction } from "src/lib/utils/misc";
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
  StairWall,
  Debug,
  Torch,
}

export class MeshInstance {
  constructor(
    public position: Vector3,
    public rotation: Vector3,
    public meshType: MeshType,
    public scale: Vector3 = new Vector3(1, 1, 1)
  ) {}
}

const scale = 1;

export class DungeonMeshGenerator {
  private readonly directions = [
    new Vector3Int(1, 0, 0),
    new Vector3Int(-1, 0, 0),
    new Vector3Int(0, 0, 1),
    new Vector3Int(0, 0, -1),
    new Vector3Int(0, 1, 0),
    new Vector3Int(0, -1, 0),
  ];

  private readonly rotations = [
    new Vector3(0, Math.PI / 2, 0),
    new Vector3(0, Math.PI + Math.PI / 2, 0),
    new Vector3(0, 0, 0),
    new Vector3(0, Math.PI, 0),
    new Vector3(0, 0, 0),
    new Vector3(Math.PI, 0, 0),
  ];

  private random: () => number;
  private seed: string;
  private grid: Grid3D<CellType3D>;

  constructor(grid: Grid3D<CellType3D>, seed?: string) {
    this.seed = seed || Math.random().toString();
    this.random = createRandomFunction(this.seed);
    this.grid = grid;
  }

  public generateMeshes(): MeshInstance[] {
    const meshes: MeshInstance[] = [];

    this.grid.forEach((pos, cellType) => {
      if (cellType === CellType3D.None) return;

      switch (cellType) {
        case CellType3D.RoomCenterAxis:
        case CellType3D.Room:
          this.generateRoomMeshes(pos, meshes);
          break;
        case CellType3D.Hallway:
          this.generateHallwayMeshes(pos, meshes);
          break;
        case CellType3D.Stairs:
          this.generateStairsMeshes(pos, meshes);
          break;
      }
    });

    return meshes;
  }

  private generateRoomMeshes(pos: Vector3Int, meshes: MeshInstance[]): void {
    for (let i = 0; i < this.directions.length; i++) {
      const neighborPos = pos.add(this.directions[i].multiply(scale));
      const worldPos = new Vector3(pos.x * scale, pos.y * scale, pos.z * scale);

      if (
        !this.grid.inBounds(neighborPos) ||
        this.grid.getValue(neighborPos) === CellType3D.None ||
        this.grid.getValue(neighborPos) === CellType3D.Stairs
      ) {
        if (i < 4) {
          const offset = this.directions[i].multiply(scale);
          worldPos.x += offset.x * 0.5;
          worldPos.y += offset.y;
          worldPos.z += offset.z * 0.5;

          meshes.push(
            new MeshInstance(worldPos, this.rotations[i], MeshType.Wall)
          );
          this.makeTorch(this.rotations[i], worldPos, offset, meshes);
        }
      } else if (
        this.grid.getValue(neighborPos) === CellType3D.Hallway &&
        i < 4
      ) {
        const offset = this.directions[i].multiply(scale);
        worldPos.x += offset.x * 0.5;
        worldPos.z += offset.z * 0.5;

        if (this.grid.getValue(pos) === CellType3D.RoomCenterAxis) {
          worldPos.y -= 0.5; // += offset.y;

          meshes.push(
            new MeshInstance(worldPos, this.rotations[i], MeshType.DoorFrame)
          );

          meshes.push(
            new MeshInstance(worldPos, this.rotations[i], MeshType.Door)
          );
        } else {
          meshes.push(
            new MeshInstance(worldPos, this.rotations[i], MeshType.Wall)
          );

          this.makeTorch(this.rotations[i], worldPos, offset, meshes);
        }
      }

      if (i === 4) {
        const cellAbove = this.grid.getValue(pos.add(this.directions[4]));
        if (cellAbove === CellType3D.None || cellAbove === CellType3D.Stairs) {
          worldPos.y += scale * 0.5;
          meshes.push(
            new MeshInstance(worldPos, this.rotations[i], MeshType.Ceiling)
          );
        }
      }

      if (i === 5) {
        worldPos.y -= scale * 0.5;
        meshes.push(
          new MeshInstance(worldPos, this.rotations[i], MeshType.Floor)
        );
      }
    }
  }

  private makeTorch(
    rotation: Vector3,
    position: Vector3,
    offset: Vector3Int,
    meshes: MeshInstance[]
  ) {
    const random = this.random();
    if (random > 0.25) return;

    const torchRotation = rotation.clone();
    torchRotation.y += Math.PI;

    const torchPosition = position.clone();
    torchPosition.x -= (offset.x * 0.25) / 2;
    torchPosition.z -= (offset.z * 0.25) / 2;

    meshes.push(new MeshInstance(torchPosition, torchRotation, MeshType.Torch));
  }

  private generateHallwayMeshes(pos: Vector3Int, meshes: MeshInstance[]): void {
    for (let i = 0; i < this.directions.length; i++) {
      const neighborPos = pos.add(this.directions[i].multiply(scale));
      const worldPos = new Vector3(pos.x * scale, pos.y * scale, pos.z * scale);

      if (
        !this.grid.inBounds(neighborPos) ||
        this.grid.getValue(neighborPos) === CellType3D.None
      ) {
        if (i < 4) {
          const offset = this.directions[i].multiply(scale);
          worldPos.x += offset.x * 0.5;
          worldPos.z += offset.z * 0.5;
          meshes.push(
            new MeshInstance(worldPos, this.rotations[i], MeshType.Wall)
          );
          this.makeTorch(this.rotations[i], worldPos, offset, meshes);
        }
      }

      if (i === 4) {
        const cellAbove = this.grid.getValue(pos.add(this.directions[4]));
        if (cellAbove === CellType3D.None || cellAbove === CellType3D.Stairs) {
          worldPos.y += scale * 0.5;
          meshes.push(
            new MeshInstance(worldPos, this.rotations[i], MeshType.Ceiling)
          );
        }
      }

      if (i === 5) {
        worldPos.y -= scale * 0.5;
        meshes.push(
          new MeshInstance(worldPos, this.rotations[i], MeshType.Floor)
        );
      }
    }
  }

  private convertStairRotationToDirection(rotation: Vector3) {
    if (rotation.y === 0) {
      return new Vector3Int(0, 0, -1);
    }
    if (rotation.y === Math.PI) {
      return new Vector3Int(0, 0, 1);
    }
    if (rotation.y === Math.PI / 2) {
      return new Vector3Int(-1, 0, 0);
    }
    if (rotation.y === Math.PI + Math.PI / 2) {
      return new Vector3Int(1, 0, 0);
    }

    return new Vector3Int(0, 0, 0);
  }

  private convertStairDirectionToRotation(direction: Vector3Int) {
    if (new Vector3Int(0, 0, -1).equals(direction)) {
      return new Vector3(0, 0, 0);
    }
    if (new Vector3Int(0, 0, 1).equals(direction)) {
      return new Vector3(0, Math.PI, 0);
    }
    if (new Vector3Int(-1, 0, 0).equals(direction)) {
      return new Vector3(0, Math.PI / 2, 0);
    }
    if (new Vector3Int(1, 0, 0).equals(direction)) {
      return new Vector3(0, Math.PI + Math.PI / 2, 0);
    }

    return new Vector3(0, 0, 0);
  }

  private determineStairsDirection(pos: Vector3Int): Vector3Int | false {
    for (let i = 0; i < 4; i++) {
      const dir = this.directions[i];
      const neighborPos = pos.add(dir.multiply(scale));
      const oppositeNeighbor = pos.add(dir.multiply(-scale));
      const oppositeNeighbor2 = pos.add(dir.multiply(-scale * 2));
      const below = pos.add(this.directions[5]);
      const above = pos.add(this.directions[4]);

      const neighborAndUpPos = neighborPos.add(
        this.directions[4].multiply(scale)
      );

      if (
        this.grid.getValue(neighborAndUpPos) === CellType3D.Hallway &&
        this.grid.getValue(oppositeNeighbor) === CellType3D.Stairs &&
        !(
          this.grid.getValue(above) === CellType3D.Stairs &&
          this.grid.getValue(below) === CellType3D.Stairs
        ) &&
        this.grid.getValue(above) === CellType3D.Stairs &&
        this.grid.getValue(neighborPos) !== CellType3D.Hallway &&
        this.grid.getValue(oppositeNeighbor2) === CellType3D.Hallway
      ) {
        return this.directions[i];
      }
    }

    return false;
  }

  private getRightAngleDirections(direction: Vector3Int) {
    if (direction.x === 0) {
      return [new Vector3Int(1, 0, 0), new Vector3Int(-1, 0, 0)];
    }

    if (direction.z === 0) {
      return [new Vector3Int(0, 0, 1), new Vector3Int(0, 0, -1)];
    }

    return [];
  }
  private generateStairsMeshes(pos: Vector3Int, meshes: MeshInstance[]): void {
    const worldPos = new Vector3(pos.x, pos.y, pos.z);

    const stairDirection = this.determineStairsDirection(pos);

    const neighborAbove = pos.add(this.directions[4]);
    const neighborBelow = pos.add(this.directions[5]);

    for (let i = 0; i < 4; i++) {
      const noWalls = false;
      if (noWalls) continue;

      const neighborPos = pos.add(this.directions[i].multiply(scale));

      const wallPos = new Vector3(worldPos.x, worldPos.y, worldPos.z);

      const offset = this.directions[i].multiply(scale);
      wallPos.x += offset.x * 0.5;
      wallPos.y += offset.y * 0.5;
      wallPos.z += offset.z * 0.5;

      if (
        !this.grid.inBounds(neighborPos) ||
        this.grid.getValue(neighborPos) === CellType3D.None
      ) {
        meshes.push(
          new MeshInstance(wallPos, this.rotations[i], MeshType.Wall)
        );

        if (!stairDirection) {
          this.makeTorch(this.rotations[i], wallPos, offset, meshes);
        }
      }

      if (
        stairDirection &&
        this.grid.getValue(neighborPos) === CellType3D.Hallway
        // this.grid.getValue(neighborPos) === CellType3D.Stairs)
      ) {
        wallPos.x -= offset.x * 0.5;
        wallPos.z -= offset.z * 0.5;

        // const stairRotation =
        //   this.convertStairDirectionToRotation(stairDirection);

        const rotation = this.rotations[i].clone();
        rotation.y += Math.PI / 2;
        meshes.push(new MeshInstance(wallPos, rotation, MeshType.StairWall));
      }
    }

    if (!stairDirection) {
      // this is no stair!

      if (this.grid.getValue(neighborAbove) !== CellType3D.Stairs) {
        meshes.push(
          new MeshInstance(
            new Vector3(pos.x, pos.y + scale * 0.5, pos.z),
            this.rotations[2],
            MeshType.Floor
          )
        );
      }

      if (this.grid.getValue(neighborBelow) !== CellType3D.Stairs) {
        meshes.push(
          new MeshInstance(
            new Vector3(pos.x, pos.y - scale * 0.5, pos.z),
            this.rotations[2],
            MeshType.Floor
          )
        );
      }
    } else {
      const stairRotation =
        this.convertStairDirectionToRotation(stairDirection);
      this.addStairRailings(pos, stairRotation, meshes);

      meshes.push(new MeshInstance(worldPos, stairRotation, MeshType.Stairs));

      const leftAndRightDirectionsFromStair =
        this.getRightAngleDirections(stairDirection);

      for (const dir of leftAndRightDirectionsFromStair) {
        const neighborPos = pos.add(dir.multiply(scale));
        if (
          this.grid.getValue(neighborPos) === CellType3D.Hallway ||
          this.grid.getValue(neighborPos) === CellType3D.Room
        ) {
          const wallPos = new Vector3(worldPos.x, worldPos.y, worldPos.z);

          const offset = dir.multiply(scale);
          wallPos.x += offset.x;
          wallPos.z += offset.z;
        }
      }
    }
  }

  private addStairRailings(
    pos: Vector3Int,
    stairDirection: Vector3,
    meshes: MeshInstance[]
  ): void {
    const worldPos = new Vector3(pos.x * scale, pos.y * scale, pos.z * scale);

    let forwardDir: Vector3Int;
    let rightDir: Vector3Int;

    if (stairDirection.y === 0 || stairDirection.y === Math.PI) {
      forwardDir = new Vector3Int(0, 0, 1);
      rightDir = new Vector3Int(1, 0, 0);
    } else {
      forwardDir = new Vector3Int(1, 0, 0);
      rightDir = new Vector3Int(0, 0, 1);
    }

    const rightNeighbor = pos.add(rightDir);
    if (
      !this.grid.inBounds(rightNeighbor) ||
      this.grid.getValue(rightNeighbor) === CellType3D.None
    ) {
      const railingPos = new Vector3(
        worldPos.x + rightDir.x * scale,
        worldPos.y,
        worldPos.z + rightDir.z * scale
      );

      meshes.push(
        new MeshInstance(railingPos, stairDirection, MeshType.StairsRailing)
      );
    }

    const leftNeighbor = pos.add(rightDir.multiply(-1));
    if (
      !this.grid.inBounds(leftNeighbor) ||
      this.grid.getValue(leftNeighbor) === CellType3D.None
    ) {
      const railingPos = new Vector3(
        worldPos.x + rightDir.x * scale,
        worldPos.y,
        worldPos.z + rightDir.z * scale
      );

      meshes.push(
        new MeshInstance(railingPos, stairDirection, MeshType.StairsRailing)
      );
    }
  }
}
