export class Matrix {
  public rows: [number, number, number][];
  constructor(rows: [number, number, number][]) {
    this.rows = rows;
  }
  get a() {
    return this.rows[0][0];
  }
  get b() {
    return this.rows[0][1];
  }
  get c() {
    return this.rows[0][2];
  }

  get d() {
    return this.rows[1][0];
  }
  get e() {
    return this.rows[1][1];
  }
  get f() {
    return this.rows[1][2];
  }
  columns() {
    return this.rows[0].map((_, i) => this.rows.map((r) => r[i]));
  }
}
