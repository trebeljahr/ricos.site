export class Vector2 {
  constructor(public x: number, public y: number) {}

  static zero(): Vector2 {
    return new Vector2(0, 0);
  }

  add(other: Vector2): Vector2 {
    return new Vector2(this.x + other.x, this.y + other.y);
  }

  subtract(other: Vector2): Vector2 {
    return new Vector2(this.x - other.x, this.y - other.y);
  }

  distance(other: Vector2): number {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}

export class Vector2Int {
  constructor(public x: number, public y: number) {}

  static zero(): Vector2Int {
    return new Vector2Int(0, 0);
  }

  add(other: Vector2Int): Vector2Int {
    return new Vector2Int(this.x + other.x, this.y + other.y);
  }

  subtract(other: Vector2Int): Vector2Int {
    return new Vector2Int(this.x - other.x, this.y - other.y);
  }

  equals(other: Vector2Int): boolean {
    return this.x === other.x && this.y === other.y;
  }
}

class RectInt {
  constructor(public position: Vector2Int, public size: Vector2Int) {}

  get xMin(): number {
    return this.position.x;
  }
  get xMax(): number {
    return this.position.x + this.size.x;
  }
  get yMin(): number {
    return this.position.y;
  }
  get yMax(): number {
    return this.position.y + this.size.y;
  }

  get center(): Vector2 {
    return new Vector2(
      this.position.x + this.size.x / 2,
      this.position.y + this.size.y / 2
    );
  }

  contains(point: Vector2Int): boolean {
    return (
      point.x >= this.xMin &&
      point.x < this.xMax &&
      point.y >= this.yMin &&
      point.y < this.yMax
    );
  }

  *allPositionsWithin(): Generator<Vector2Int> {
    for (let x = this.xMin; x < this.xMax; x++) {
      for (let y = this.yMin; y < this.yMax; y++) {
        yield new Vector2Int(x, y);
      }
    }
  }
}

export enum CellType {
  None,
  Room,
  Hallway,
  Stairs,
}

export class Grid2D<T> {
  private data: T[];

  constructor(public size: Vector2Int, public offset: Vector2Int) {
    this.data = new Array<T>(size.x * size.y);
  }

  private getIndex(pos: Vector2Int): number {
    return pos.x + this.size.x * pos.y;
  }

  inBounds(pos: Vector2Int): boolean {
    const adjustedPos = new Vector2Int(
      pos.x + this.offset.x,
      pos.y + this.offset.y
    );
    return (
      adjustedPos.x >= 0 &&
      adjustedPos.x < this.size.x &&
      adjustedPos.y >= 0 &&
      adjustedPos.y < this.size.y
    );
  }

  getValue(pos: Vector2Int): T {
    const adjustedPos = new Vector2Int(
      pos.x + this.offset.x,
      pos.y + this.offset.y
    );
    return this.data[this.getIndex(adjustedPos)];
  }

  setValue(pos: Vector2Int, value: T): void {
    const adjustedPos = new Vector2Int(
      pos.x + this.offset.x,
      pos.y + this.offset.y
    );
    this.data[this.getIndex(adjustedPos)] = value;
  }
}

export class Room {
  bounds: RectInt;

  constructor(location: Vector2Int, size: Vector2Int) {
    this.bounds = new RectInt(location, size);
  }

  static intersect(a: Room, b: Room): boolean {
    return !(
      a.bounds.xMin >= b.bounds.xMax ||
      a.bounds.xMax <= b.bounds.xMin ||
      a.bounds.yMin >= b.bounds.yMax ||
      a.bounds.yMax <= b.bounds.yMin
    );
  }
}

export class PriorityQueue<T> {
  private items: { item: T; priority: number }[] = [];

  private itemMap = new Map<T, number>();

  constructor() {}

  enqueue(item: T, priority: number): void {
    this.items.push({ item, priority });

    this.items.sort((a, b) => a.priority - b.priority);

    this.itemMap.set(item, priority);
  }

  dequeue(): T | undefined {
    if (this.isEmpty()) return undefined;

    const entry = this.items.shift();
    if (entry) {
      this.itemMap.delete(entry.item);
      return entry.item;
    }

    return undefined;
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  get count(): number {
    return this.items.length;
  }

  contains(item: T): boolean {
    return this.itemMap.has(item);
  }

  getPriority(item: T): number | undefined {
    return this.itemMap.get(item);
  }

  tryGetPriority(item: T, outPriority: { value: number }): boolean {
    const priority = this.itemMap.get(item);
    if (priority !== undefined) {
      outPriority.value = priority;
      return true;
    }
    return false;
  }

  updatePriority(item: T, priority: number): void {
    if (!this.contains(item)) return;

    const index = this.items.findIndex((entry) => entry.item === item);
    if (index !== -1) {
      this.items.splice(index, 1);

      this.enqueue(item, priority);
    }
  }

  clear(): void {
    this.items = [];
    this.itemMap.clear();
  }
}
