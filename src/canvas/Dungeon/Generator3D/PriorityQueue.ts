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
