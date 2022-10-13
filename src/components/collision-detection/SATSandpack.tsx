import { Sandpack } from "@codesandbox/sandpack-react";

export const SATSandpack = () => {
  return (
    <Sandpack
      theme="dark"
      template="react"
      files={{
        "/App.js": `
  import { useEffect, useState } from "react";
  import SimpleReactCanvasComponent from "simple-react-canvas-component";
  import { initPolygons, instrument } from "../../lib/math/drawHelpers";
  import { checkCollision, drawAllProjections, drawBackground } from "./helpers";

  export default function SAT() {
  const [cnv, setCnv] = useState(null);
  useEffect(() => {
    if (!cnv) return;
    cnv.tabIndex = 0;

    const ctx = cnv.getContext("2d");
    if (!ctx) return;

    const [myPoly1, myPoly2] = initPolygons(cnv);
    const drawFn = () => {
      drawBackground(ctx);
      const collision = checkCollision(myPoly1, myPoly2);
      drawAllProjections(cnv, myPoly1, myPoly2);
      myPoly1.draw(ctx, { collision });
      myPoly2.draw(ctx, { collision });
    };

    const { cleanup } = instrument(cnv, [myPoly1, myPoly2], drawFn);
    return cleanup;
  }, [cnv]);

  return (
    <SimpleReactCanvasComponent setCnv={setCnv} width={780} height={500} />
  );
};`,
      }}
      customSetup={{
        dependencies: {
          "simple-react-canvas-component": "^0.1.11",
        },
      }}
    />
  );
};
