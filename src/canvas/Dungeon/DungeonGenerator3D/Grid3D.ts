import { Vector3Int, BoundsInt3D } from "./Types";

class Grid3D<T> {
  data: T[];

  constructor(public size: Vector3Int, public offset: Vector3Int) {
    this.data = new Array<T>(size.x * size.y * size.z);
  }

  // Calculate the index in the 1D array from a 3D position
  private getIndex(pos: Vector3Int): number {
    return pos.x + this.size.x * pos.y + this.size.x * this.size.y * pos.z;
  }

  // Check if a position is within the grid bounds
  inBounds(pos: Vector3Int): boolean {
    const adjustedPos = pos.add(this.offset);
    return new BoundsInt3D(Vector3Int.zero(), this.size).contains(adjustedPos);
  }

  // Get a value at a position
  getValue(pos: Vector3Int): T {
    const adjustedPos = pos.add(this.offset);
    return this.data[this.getIndex(adjustedPos)];
  }

  // Set a value at a position
  setValue(pos: Vector3Int, value: T): void {
    const adjustedPos = pos.add(this.offset);
    this.data[this.getIndex(adjustedPos)] = value;
  }

  // Access using coordinate components
  getValueXYZ(x: number, y: number, z: number): T {
    return this.getValue(new Vector3Int(x, y, z));
  }

  // Set using coordinate components
  setValueXYZ(x: number, y: number, z: number, value: T): void {
    this.setValue(new Vector3Int(x, y, z), value);
  }

  // Initialize all cells with a default value
  fill(defaultValue: T): void {
    for (let i = 0; i < this.data.length; i++) {
      this.data[i] = defaultValue;
    }
  }

  // Create a copy of this grid
  clone(): Grid3D<T> {
    const newGrid = new Grid3D<T>(this.size, this.offset);
    newGrid.data = [...this.data];
    return newGrid;
  }

  // Execute a function for each position in the grid
  forEach(callback: (pos: Vector3Int, value: T) => void): void {
    for (let z = 0; z < this.size.z; z++) {
      for (let y = 0; y < this.size.y; y++) {
        for (let x = 0; x < this.size.x; x++) {
          const pos = new Vector3Int(x, y, z).subtract(this.offset);
          callback(pos, this.getValue(pos));
        }
      }
    }
  }
}

export { Grid3D };
