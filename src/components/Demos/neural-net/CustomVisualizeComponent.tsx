import { nanoid } from "nanoid";
import { Value } from "./Value";

export function VisualizeValue({ val }: { val: Value }) {
  return (
    <>
      <h2>
        data: {val.data} grad: {val.grad} operation: {val.operation}
      </h2>
      <div>
        {[...val.children].map((nextVal, index) => {
          return <VisualizeValue key={nanoid()} val={nextVal} />;
        })}
      </div>
    </>
  );
}
