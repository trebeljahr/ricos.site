import Layout from "@components/Layout";
import SimpleReactCanvasComponent from "@components/SimpleReactCanvasComponent";
import { Instance, Instances, OrbitControls, Stage } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { HTMLAttributes, lazy, useEffect, useMemo, useState } from "react";

function random(max: number, min = 0) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function randomColor() {
  return `hsl(${random(360)},${random(100)}%,${random(100)}%)`;
}

function Rule30Sketch() {
  const drawFn: DrawFn = (ctx, cnv) => {
    type Cell = 0 | 1;

    const rules = {
      "111": 0,
      "110": 0,
      "101": 0,
      "100": 1,
      "011": 1,
      "010": 1,
      "001": 1,
      "000": 0,
    };

    function nextGeneration(currentState: Cell[]): Cell[] {
      const nextState: Cell[] = [];
      const length = currentState.length;

      for (let i = 0; i < length; i++) {
        const left = currentState[i - 1] ?? 0;
        const center = currentState[i];
        const right = currentState[i + 1] ?? 0;

        const newState = rules[`${left}${center}${right}`];
        if (newState === undefined) {
          throw new Error("Invalid ruleset");
        }
        nextState[i] = newState as Cell;
      }

      return nextState;
    }

    function generateRule30(
      initialState: Cell[],
      generations: number
    ): Cell[][] {
      const history: Cell[][] = [initialState];

      for (let i = 1; i < generations; i++) {
        const nextState = nextGeneration(history[history.length - 1]);
        history.push(nextState);
      }

      return history;
    }

    const cellSize = 2;

    function drawGrid() {
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, cnv.width, cnv.height);
      ctx.lineWidth = 0.1;

      for (let x = 0; x <= cnv.width; x += cellSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, cnv.height);
        ctx.stroke();
      }

      for (let y = 0; y <= cnv.height; y += cellSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(cnv.width, y);
        ctx.stroke();
      }
    }

    function drawGenerations(history: Cell[][]): void {
      for (const row of history) {
        for (let i = 0; i < row.length; i++) {
          if (row[i] === 1) {
            ctx.fillStyle = "black";
            ctx.fillRect(
              i * cellSize,
              history.indexOf(row) * cellSize,
              cellSize,
              cellSize
            );
          }
        }
      }
    }

    const generations = 260;
    const size = generations * 2 + 1;
    const middle = Math.floor(size / 2);

    const initialState: Cell[] = Array(size)
      .fill(0)
      .map((_, i) => (i === middle ? 1 : 0));

    const history = generateRule30(initialState, generations);
    drawGrid();
    drawGenerations(history);
  };

  return <SimplerReactCanvasComponent drawFn={drawFn} />;
}

type DrawFn = (ctx: CanvasRenderingContext2D, cnv: HTMLCanvasElement) => void;

function useDrawCtx(cnv: HTMLCanvasElement | null, drawFn: DrawFn) {
  useEffect(() => {
    if (!cnv) return;
    const ctx = cnv.getContext("2d");

    if (!ctx) return;

    drawFn(ctx, cnv);
  }, [cnv, drawFn]);
}

function MakeSomethingHumanSketch() {
  const drawFn: DrawFn = (ctx, cnv) => {
    function drawStickFigure(): void {
      const centerX = cnv.clientWidth / 2;
      const centerY = cnv.clientHeight / 2;

      ctx.lineWidth = 2;
      ctx.strokeStyle = "#000";

      const headRadius = 20;
      ctx.beginPath();
      ctx.arc(centerX, centerY - 60, headRadius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(centerX, centerY - 40);
      ctx.lineTo(centerX, centerY + 40);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(centerX, centerY - 20);
      ctx.lineTo(centerX - 40, centerY);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(centerX, centerY - 20);
      ctx.lineTo(centerX + 40, centerY);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(centerX, centerY + 40);
      ctx.lineTo(centerX - 30, centerY + 80);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(centerX, centerY + 40);
      ctx.lineTo(centerX + 30, centerY + 80);
      ctx.stroke();
    }

    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, cnv.width, cnv.height);

    drawStickFigure();
  };

  return <SimplerReactCanvasComponent drawFn={drawFn} />;
}

function SimplerReactCanvasComponent({
  drawFn,
  ...props
}: { drawFn: DrawFn } & HTMLAttributes<HTMLCanvasElement>) {
  const [cnv, setCnv] = useState<HTMLCanvasElement | null>(null);
  useDrawCtx(cnv, drawFn);

  return <SimpleReactCanvasComponent setCnv={setCnv} {...props} />;
}

function TripleNestedLoopSketch() {
  //   const drawFn: DrawFn = (ctx, cnv) => {
  //     ctx.fillStyle = "black";
  //     ctx.fillRect(0, 0, cnv.width, cnv.height);

  //     ctx.fillStyle = "white";
  //     for (let i = 0; i < 100; i++) {
  //       for (let j = 0; j < 100; j++) {
  //         ctx.fillStyle = randomColor();
  //         ctx.fillRect(i * 10, j * 10, 10, 10);
  //       }
  //     }
  //   };

  //   return <SimplerReactCanvasComponent drawFn={drawFn} />;
  const initialSize = 20;
  const [size, setSize] = useState(initialSize);

  useEffect(() => {
    const interval = setInterval(() => {
      setSize((prev) => (prev + 5 > initialSize * 5 ? initialSize : prev + 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const boxes = useMemo(() => {
    const out: [number, number, number][] = [];
    const radius = size / 2;
    const center = (size - 1) / 2;
    const epsilon = 4; // Thickness of the surface (tolerance)

    const lengthSq = (x: number, y: number, z: number) => {
      return x * x + y * y + z * z;
    };

    const makeSphere = (radius: number, filled: boolean) => {
      radius += 0.5; //I think they do this so the radius is measured from the center of the block
      const radiusSq = radius * radius; //Square of the radius, so we don't need to use square roots for distance calcs
      const radius1Sq = (radius - 1.0) * (radius - 1.0); //Square of the radius of a circle 1 block smaller, for making a hollow sphere

      const ceilRadius = Math.ceil(radius); //Round the radius up
      //Loop through x,y,z up to the rounded radius
      for (let x = 0; x <= ceilRadius; x++) {
        for (let y = 0; y <= ceilRadius; y++) {
          for (let z = 0; z <= ceilRadius; z++) {
            const dSq = lengthSq(x, y, z);
            if (dSq > radiusSq) {
              continue;
            }

            if (
              !filled &&
              (dSq < radius1Sq ||
                (lengthSq(x + 1, y, z) <= radiusSq &&
                  lengthSq(x, y + 1, z) <= radiusSq &&
                  lengthSq(x, y, z + 1) <= radiusSq))
            ) {
              continue;
            }

            out.push([x, y, z]);
            out.push([-x, y, z]);
            out.push([x, -y, z]);
            out.push([x, y, -z]);
            out.push([-x, -y, z]);
            out.push([x, -y, -z]);
            out.push([-x, y, -z]);
            out.push([-x, -y, -z]);
          }
        }
      }
    };

    // for (let x = 0; x < size * 2; x++) {
    //   for (let y = 0; y < size * 2; y++) {
    //     for (let z = 0; z < size * 2; z++) {
    //       const distanceSquared =
    //         Math.pow(x - center, 2) +
    //         Math.pow(y - center, 2) +
    //         Math.pow(z - center, 2);

    //       if (Math.abs(distanceSquared - Math.pow(radius, 2)) <= epsilon) {
    //         out.push({ x, y, z });
    //       }
    //     }
    //   }
    // }
    makeSphere(radius, false);

    return out;
  }, [size]);

  return (
    <div className="w-[768px] h-[500px]">
      <Canvas>
        <OrbitControls />
        <color attach="background" args={["#FEFCFB"]} />

        <ambientLight />
        {/* <pointLight position={[10, 10, 10]} /> */}
        <Stage
          key={size + "stage"}
          adjustCamera
          intensity={0.5}
          shadows="contact"
          environment="city"
        >
          <Instances key={size + "instances"} limit={size * size * size}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial />
            {boxes.map(([x, y, z]) => (
              <Instance
                key={`${x}-${y}-${z}`}
                color="#1282A2"
                scale={2}
                position={[x, y + 10, z]}
                rotation={[0, 0, 0]}
              />
            ))}
          </Instances>
        </Stage>
      </Canvas>
    </div>
  );
}

function SmallAreasOfSymmetrySketch() {
  const drawFn: DrawFn = (ctx, cnv) => {};

  return <SimplerReactCanvasComponent drawFn={drawFn} />;
}

export default function GenuaryPage() {
  return (
    <Layout
      title="Genuary"
      description="A page with all my Genuary sketches."
      url="/genuary"
      keywords={[]}
      image="/assets/blog/404.jpg"
      imageAlt="this is not a page pipe meme joke"
      fullScreen
    >
      <main className="mt-10 mb-20 px-3 max-w-3xl">
        <h1>Genuary</h1>
        <h2>Jan 01. 2021 - Jan 31. 2021</h2>
        <h3>Jan 01. 2021</h3>
        <p>Triple Nested Loop</p>
        <TripleNestedLoopSketch />

        <h3>Jan 02. 2021</h3>
        <p>Rule 30</p>
        <Rule30Sketch />

        <h3>Jan 03. 2021</h3>
        <p>Make something human</p>
        <MakeSomethingHumanSketch />

        <h3>Jan 04. 2021</h3>
        <p>Small Areas of Symmetry</p>
        <SmallAreasOfSymmetrySketch />
      </main>
    </Layout>
  );
}
