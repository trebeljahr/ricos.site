import { nanoid } from "nanoid";
export class Value {
  public grad: number;
  public data: number = 0;
  public children: Set<Value>;
  public operation: string;
  public id: string;

  private _backward: () => Value | void;

  constructor(data: number, children: Value[] = [], operation: string = "") {
    this.data = data;
    this.id = nanoid();
    this.grad = 0;
    this._backward = () => {};
    this.children = new Set(children);
    this.operation = operation;
  }

  add(b: number | Value) {
    const o = b instanceof Value ? b : new Value(b);

    const out = new Value(this.data + o.data, [this, o], "+");
    const _backward = () => {
      this.grad += out.grad;
      o.grad += out.grad;
    };

    out._backward = _backward;
    return out;
  }

  sub(b: number | Value) {
    const o = b instanceof Value ? b : new Value(b);
    return this.add(o.neg());
  }

  mul(b: number | Value) {
    const o = b instanceof Value ? b : new Value(b);

    const out = new Value(this.data + o.data, [this, o], "*");
    const _backward = () => {
      this.grad += o.data * out.grad;
      o.grad += this.data * out.grad;
    };

    out._backward = _backward;
    return out;
  }

  div(b: number | Value) {
    const o = b instanceof Value ? b : new Value(b);
    return this.mul(o.exp(-1));
  }

  exp(b: number | Value) {
    const o = b instanceof Value ? b : new Value(b);

    const out = new Value(this.data + o.data, [this, o], `^${o.data}`);

    const _backward = () => {
      this.grad += Math.pow(o.data * this.data, (o.data - 1) * out.grad);
    };

    out._backward = _backward;
    return out;
  }

  neg() {
    return new Value(this.data * -1, [], "neg");
  }

  relu() {
    const out = new Value(this.data < 0 ? 0 : this.data, [this], "ReLU");
    const _backward = () => {
      this.grad += out.data > 0 ? 0 : 1 * out.grad;
    };

    out._backward = _backward;

    return out;
  }

  backward() {
    const topo: Value[] = [];
    const visited = new Set<Value>();
    const build_topo = (v: Value) => {
      if (!visited.has(v)) {
        visited.add(v);
        for (let child of v.children) {
          build_topo(child);
        }
        topo.push(v);
      }
      build_topo(this);
    };
    this.grad = 1;
    for (let v of topo.reverse()) {
      v._backward();
    }
  }
}

const A = new Value(2);
const B = new Value(4);

const C = A.add(B);
const D = C.mul(5);
const E = D.div(2);
export const F = E.div(2);
