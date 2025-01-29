import Layout from "@components/Layout";
import SimpleReactCanvasComponent from "@components/SimpleReactCanvasComponent";
import {
  Instance,
  Instances,
  OrbitControls,
  Stage,
  useCamera,
} from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  HTMLAttributes,
  lazy,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Group } from "three";

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

const palette0 = [
  "#bc8756",
  "#24282b",
  "#836044",
  "#7ba2a6",
  "#578392",
  "#4c6c76",
  "#335065",
  "#574231",
  "#a94c43",
  "#d6c6a3",
];

const palette1 = [
  "#c7522a",
  "#e5c185",
  "#f0daa5",
  "#fbf2c4",
  "#b8cdab",
  "#74a892",
  "#008585",
  "#004343",
];
const palette2 = [
  "#2156df",
  "#c9cca8",
  "#b73c21",
  "#965fc6",
  "#d69e58",
  "#a52f85",
  "#31c3f4",
  "#6c1683",
  "#e76828",
  "#4c1e6a",
];
const palette3 = [
  "#bc8756",
  "#24282b",
  "#836044",
  "#7ba2a6",
  "#578392",
  "#4c6c76",
  "#335065",
  "#574231",
  "#a94c43",
  "#d6c6a3",
];
const palette4 = [
  "#00202e",
  "#003f5c",
  "#2c4875",
  "#8a508f",
  "#bc5090",
  "#ff6361",
  "#ff8531",
  "#ffa600",
  "#ffd380",
];
const palette5 = [
  "#062456",
  "#1d3867",
  "#334d77",
  "#4a6188",
  "#627799",
  "#7a8ca9",
  "#93a2ba",
  "#adb9cb",
  "#c8d0dc",
  "#e3e7ee",
];
const palette6 = [
  "#33322e",
  "#3d4748",
  "#475e64",
  "#4e757e",
  "#578e9b",
  "#5da7ba",
  "#62bed9",
  "#b2dfeb",
  "#d7edf3",
  "#ecf7f8",
];
const palette7 = [
  "#c7522a",
  "#cb6036",
  "#cf6e41",
  "#d68a58",
  "#dea66f",
  "#e5c185",
  "#f0daa5",
  "#fbf2c4",
  "#dae0b8",
  "#b8cdab",
];
const palette8 = [
  "#642915",
  "#963e20",
  "#c7522a",
  "#e5c185",
  "#fbf2c4",
  "#74a892",
  "#008585",
  "#006464",
  "#004343",
];
const palette9 = [
  "#03071e",
  "#211c1b",
  "#3d3019",
  "#594417",
  "#745814",
  "#906b12",
  "#ac7f0f",
  "#c8930d",
  "#e3a60a",
  "#ffba08",
];
const palette10 = [
  "#ff7332",
  "#e96842",
  "#d25d52",
  "#bc5262",
  "#a54771",
  "#943e79",
  "#833580",
  "#722c88",
  "#60238f",
];
const palette11 = [
  "#f1ddbf",
  "#cabead",
  "#a29e9a",
  "#525e75",
  "#657980",
  "#78938a",
  "#85a78e",
  "#92ba92",
  "#aeccae",
  "#c9ddc9",
];
const palette12 = [
  "#ff4971",
  "#e44871",
  "#ca4772",
  "#af4572",
  "#954473",
  "#7a4373",
  "#604274",
  "#454174",
  "#2b3f75",
  "#103e75",
];

const createPaletteCycler = (
  palette: string[],
  { repeats = 1 }: { repeats?: number } = {}
) => {
  let index = 0;
  let steps = 0;

  return () => {
    if (steps < repeats) {
      steps++;
    } else {
      index = index + 1 >= palette.length ? 0 : index + 1;
      steps = 0;
    }

    return palette[index];
  };
};

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
  //   let rotations = 30;
  const getNextColor = createPaletteCycler(palette5);
  const [rotations, setRotations] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setRotations((prev) => (prev + 1 >= 60 ? 1 : prev + 1));
    }, 100);

    return () => {
      clearInterval(interval);
    };
  });

  let angle = 360 / rotations;
  let angleInRadians = (angle * Math.PI) / 180;

  const drawFn: DrawFn = (ctx, cnv) => {
    function drawStickFigure(): void {
      ctx.save();
      ctx.scale(3, 3);
      ctx.translate(20, 20);
      ctx.lineWidth = 2;
      ctx.strokeStyle = getNextColor();

      const headRadius = 20;
      ctx.beginPath();
      ctx.arc(0, -60, headRadius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, -40);
      ctx.lineTo(0, +40);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, -20);
      ctx.lineTo(-40, 0);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, -20);
      ctx.lineTo(0 + 40, 0);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, 0 + 40);
      ctx.lineTo(-30, +80);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, +40);
      ctx.lineTo(+30, +80);
      ctx.stroke();
      ctx.restore();
    }

    ctx.reset();
    ctx.fillStyle = "#0c1d23";
    ctx.fillRect(0, 0, cnv.width, cnv.height);
    ctx.translate(cnv.width / 2, cnv.height / 2);

    for (let i = 0; i < rotations; i++) {
      ctx.rotate(angleInRadians);
      drawStickFigure();
    }
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
  const size = 60;

  const [index, setIndex] = useState(0);

  const boxes = useMemo(() => {
    const out = [];
    const radius = size / 2;
    const center = (size - 1) / 2;
    const epsilon = 6;

    for (let x = 0; x < size * 2; x++) {
      for (let y = 0; y < size * 2; y++) {
        for (let z = 0; z < size * 2; z++) {
          const distanceSquared =
            Math.pow(x - center, 2) +
            Math.pow(y - center, 2) +
            Math.pow(z - center, 2);

          if (Math.abs(distanceSquared - Math.pow(radius, 2)) <= epsilon) {
            out.push({ x, y, z });
          }
        }
      }
    }

    return out;
  }, [size]);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1 >= boxes.length ? 0 : prev + 1));
    }, 1);

    return () => {
      clearInterval(interval);
    };
  }, [boxes]);

  const groupRef = useRef<Group | null>(null);

  const { camera } = useThree();

  const [increment, setIncrement] = useState(0.5);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.01;
    }
    camera.position.z += increment;
    if (
      (camera.position.z >= 60 && increment > 0) ||
      (camera.position.z <= -10 && increment < 0)
    ) {
      setIncrement(-increment);
    }
  });

  return (
    <>
      {/* <OrbitControls /> */}
      <color attach="background" args={["#6b6a6a"]} />
      <ambientLight />
      <group ref={groupRef}>
        <Stage
          key={size + "stage"}
          adjustCamera
          intensity={0.5}
          shadows="contact"
          environment="city"
        >
          <Instances key={size + "instances"} limit={boxes.length + 1}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial />
            {boxes.map(({ x, y, z }, i) => (
              <Instance
                key={`${size}:${x},${y},${z}`}
                color={i >= index ? "#a61248" : "#1282A2"}
                scale={1}
                position={[x, y + 20, z]}
                rotation={[0, 0, 0]}
              />
            ))}
          </Instances>
        </Stage>
      </group>
    </>
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
        <div className="w-[768px] h-[500px]">
          <Canvas camera={{ fov: 90 }}>
            <TripleNestedLoopSketch />
          </Canvas>
        </div>

        <h3>Jan 02. 2021</h3>
        <p>Rule 30</p>
        <Rule30Sketch />

        <h3>Jan 03. 2021</h3>
        <p>Make something human</p>
        <MakeSomethingHumanSketch />

        {/* <h3>Jan 04. 2021</h3>
        <p>Small Areas of Symmetry</p>
        <SmallAreasOfSymmetrySketch /> */}
      </main>
    </Layout>
  );
}
