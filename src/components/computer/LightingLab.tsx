import { type PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { usePanelSound } from "src/hooks/usePanelSound";
import {
  add,
  cross,
  dot,
  lookAt,
  type Mat,
  multiply,
  normalize,
  orbitEye,
  perspective,
  radians,
  rotateX,
  rotateY,
  scaled,
  subtract,
  transform,
  transformDirection,
  transformPoint,
  type Vec3,
} from "src/lib/computer/graphics/matrix";
import { type Mesh, sphere, splitCube, torus, wall } from "src/lib/computer/graphics/meshes";
import { Framebuffer, type PipelineVertex, rasterize } from "src/lib/computer/graphics/rasterizer";
import {
  type LightingResult,
  type LightingSettings,
  MATERIAL_NAMES,
  type Material,
  type MaterialName,
  material,
  shade,
  type TextureMap,
} from "src/lib/computer/graphics/shading";
import styles from "./Graphics.module.css";
import {
  Bay,
  Choice,
  fixed,
  GraphicsPanel,
  paintFramebuffer,
  Slider,
  Toggle,
  useAnimation,
} from "./GraphicsParts";

const WIDTH = 320;
const HEIGHT = 240;
const EYE: Vec3 = [0, 0, 5.2];

const VIEW_PROJECTION: Mat = multiply(
  perspective(42, WIDTH / HEIGHT, 0.5, 30),
  lookAt(EYE, [0, 0, 0]),
);

const SHAPES = {
  sphere: { label: "SPHERE", detail: true },
  cube: { label: "CUBE", detail: false },
  torus: { label: "TORUS", detail: true },
  wall: { label: "WALL", detail: false },
} as const;
type ShapeName = keyof typeof SHAPES;

function buildShape(shape: ShapeName, detail: number): Mesh {
  if (shape === "sphere") return sphere(detail * 2, detail, 1.45);
  if (shape === "torus") return torus(detail * 2, detail, 1.05, 0.5);
  if (shape === "cube") return splitCube();
  return wall(1, 1.5);
}

type Normals = "face" | "corner" | "pixel";
type Channel = "final" | "ambient" | "diffuse" | "specular" | "albedo" | "normal" | "uv";

const CHANNELS: readonly { value: Channel; label: string }[] = [
  { value: "final", label: "ALL" },
  { value: "ambient", label: "AMBIENT" },
  { value: "diffuse", label: "DIFFUSE" },
  { value: "specular", label: "SPECULAR" },
  { value: "albedo", label: "COLOR" },
  { value: "normal", label: "NORMALS" },
  { value: "uv", label: "UV" },
];

type MapName = "color" | "normal" | "specular" | "occlusion";
const MAP_LABELS: Record<MapName, string> = {
  color: "COLOR",
  normal: "NORMAL",
  specular: "SPECULAR",
  occlusion: "OCCLUSION",
};
const MAP_NAMES = Object.keys(MAP_LABELS) as MapName[];

// Position 0, normal 3, tangent 6, uv 9, then corner lighting 11.
const P = 0;
const N = 3;
const T = 6;
const UV = 9;
const CORNER_LIGHT = 11;

function MapThumbnail({ map, normal }: { map: TextureMap; normal?: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const element = canvas.current;
    let context: CanvasRenderingContext2D | null = null;
    try {
      context = element?.getContext("2d") ?? null;
    } catch {
      return;
    }
    if (!element || !context) return;
    const { size, data, channels } = map;
    element.width = size;
    element.height = size;
    const image = context.createImageData(size, size);
    for (let i = 0; i < size * size; i++) {
      const p = i * 4;
      if (channels === 3) {
        const [r, g, b] = [data[i * 3], data[i * 3 + 1], data[i * 3 + 2]];
        // A normal map is three numbers from -1 to 1 stored as a colour.
        image.data[p] = normal ? (r + 1) * 127.5 : r;
        image.data[p + 1] = normal ? (g + 1) * 127.5 : g;
        image.data[p + 2] = normal ? (b + 1) * 127.5 : b;
      } else {
        const value = data[i] * 255;
        image.data[p] = value;
        image.data[p + 1] = value;
        image.data[p + 2] = value;
      }
      image.data[p + 3] = 255;
    }
    context.putImageData(image, 0, 0);
  }, [map, normal]);
  return <canvas ref={canvas} />;
}

const projectToScreen = (p: Vec3): [number, number, number] => {
  const c = transform(VIEW_PROJECTION, [p[0], p[1], p[2], 1]);
  return [((c[0] / c[3] + 1) / 2) * WIDTH, ((1 - c[1] / c[3]) / 2) * HEIGHT, c[3]];
};

function VectorArrow({
  from,
  direction,
  color,
  label,
}: {
  from: Vec3;
  direction: Vec3;
  color: string;
  label: string;
}) {
  const [x0, y0] = projectToScreen(from);
  const [x1, y1] = projectToScreen(add(from, scaled(direction, 0.75)));
  return (
    <g>
      <line x1={x0} y1={y0} x2={x1} y2={y1} stroke={color} strokeWidth={1.8} />
      <circle cx={x1} cy={y1} r={2.2} fill={color} />
      <text
        x={x1 + 3}
        y={y1 - 3}
        fill={color}
        fontSize={10}
        fontWeight={700}
        fontFamily="ui-monospace, monospace"
      >
        {label}
      </text>
    </g>
  );
}

const vector = (v: Vec3) => v.map((value) => fixed(value)).join(" ");
const rgbList = (v: Vec3) => v.map((value) => Math.round(value)).join(" ");

/** Normals, a light and four textures, shaded per pixel by the code the readout shows. */
export function LightingLab() {
  const sound = usePanelSound();
  const [shape, setShape] = useState<ShapeName>("sphere");
  const [detail, setDetail] = useState(10);
  const [materialName, setMaterialName] = useState<MaterialName>("bricks");
  const [normals, setNormals] = useState<Normals>("pixel");
  const [channel, setChannel] = useState<Channel>("final");
  const [maps, setMaps] = useState<Record<MapName, boolean>>({
    color: true,
    normal: true,
    specular: true,
    occlusion: true,
  });
  const [smooth, setSmooth] = useState(true);
  const [ambient, setAmbient] = useState(0.15);
  const [diffuse, setDiffuse] = useState(0.8);
  const [specular, setSpecular] = useState(0.6);
  const [shininess, setShininess] = useState(32);
  const [lightYaw, setLightYaw] = useState(45);
  const [lightPitch, setLightPitch] = useState(35);
  const [objectYaw, setObjectYaw] = useState(25);
  const [objectPitch, setObjectPitch] = useState(10);
  const [showNormals, setShowNormals] = useState(false);
  const [orbiting, setOrbiting] = useState(false);
  const [probe, setProbe] = useState<{ x: number; y: number }>({ x: 150, y: 100 });
  const canvas = useRef<HTMLCanvasElement>(null);
  const press = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const lightPress = useRef<{ x: number; y: number } | null>(null);

  useAnimation(orbiting, (seconds) =>
    setLightYaw((value) => ((value + seconds * 50 + 180) % 360) - 180),
  );

  const mesh = useMemo(() => buildShape(shape, detail), [shape, detail]);
  const mat: Material = useMemo(() => material(materialName), [materialName]);
  const light = useMemo(() => orbitEye(lightYaw, lightPitch, 4), [lightYaw, lightPitch]);
  const rotation = useMemo(
    () => multiply(rotateY(radians(objectYaw)), rotateX(radians(objectPitch))),
    [objectYaw, objectPitch],
  );

  const lighting: LightingSettings = useMemo(
    () => ({
      ambient,
      diffuse,
      specular,
      shininess,
      useColorMap: maps.color,
      useNormalMap: maps.normal,
      useSpecularMap: maps.specular,
      useOcclusionMap: maps.occlusion,
      smoothSampling: smooth,
    }),
    [ambient, diffuse, specular, shininess, maps, smooth],
  );

  const scene = useMemo(() => {
    const positions = mesh.positions.map((p) => transformPoint(rotation, p));
    const vertexNormals = mesh.normals.map((n) => transformDirection(rotation, n));
    const tangents = mesh.tangents.map((t) => transformDirection(rotation, t));
    const faceNormals = mesh.triangles.map(([a, b, c]) =>
      normalize(cross(subtract(positions[b], positions[a]), subtract(positions[c], positions[a]))),
    );
    const noMaps = {
      ...lighting,
      useColorMap: false,
      useNormalMap: false,
      useSpecularMap: false,
      useOcclusionMap: false,
    };
    const vertices = positions.map((position, i): PipelineVertex => {
      const uv = mesh.uvs[i];
      // Lit once per corner, as old hardware did. The map is left out: it has too few samples here.
      const corner = shade(
        {
          position,
          normal: vertexNormals[i],
          tangent: tangents[i],
          u: uv[0],
          v: uv[1],
          light,
          eye: EYE,
        },
        mat,
        noMaps,
      );
      const clip = transform(VIEW_PROJECTION, [position[0], position[1], position[2], 1]);
      return {
        clip: [clip[0], clip[1], clip[2], clip[3]],
        attributes: [
          position[0],
          position[1],
          position[2],
          vertexNormals[i][0],
          vertexNormals[i][1],
          vertexNormals[i][2],
          tangents[i][0],
          tangents[i][1],
          tangents[i][2],
          uv[0],
          uv[1],
          ambient + diffuse * corner.nDotL,
          specular * corner.shine,
        ],
      };
    });
    const triangles = mesh.triangles.map(
      ([a, b, c]) =>
        [vertices[a], vertices[b], vertices[c]] as [PipelineVertex, PipelineVertex, PipelineVertex],
    );
    return { positions, vertexNormals, faceNormals, triangles };
  }, [mesh, rotation, lighting, light, mat, ambient, diffuse, specular]);

  const frame = useMemo(() => {
    const framebuffer = new Framebuffer(WIDTH, HEIGHT);
    let probed: { result: LightingResult; position: Vec3; triangle: number } | null = null;
    rasterize(framebuffer, scene.triangles, (input, out) => {
      const a = input.attributes;
      const position: Vec3 = [a[P], a[P + 1], a[P + 2]];
      const u = a[UV];
      const v = a[UV + 1];
      const interpolated: Vec3 =
        normals === "face"
          ? scene.faceNormals[input.triangle]
          : normalize([a[N], a[N + 1], a[N + 2]]);
      const raw = shade(
        {
          position,
          normal: interpolated,
          tangent: normalize([a[T], a[T + 1], a[T + 2]]),
          u,
          v,
          light,
          eye: EYE,
        },
        mat,
        normals === "corner" ? { ...lighting, useNormalMap: false } : lighting,
      );
      let result = raw;
      if (normals === "corner") {
        // The light was worked out at the corners and only slid across this pixel.
        const level = a[CORNER_LIGHT];
        const shine = a[CORNER_LIGHT + 1] * raw.specularStrength;
        const lit = level - ambient;
        const brightness = lit + ambient * raw.occlusion;
        const mapped: Vec3 = [
          raw.albedo[0] * brightness,
          raw.albedo[1] * brightness,
          raw.albedo[2] * brightness,
        ];
        const added = shine * 255;
        result = {
          ...raw,
          nDotL: diffuse > 0 ? lit / diffuse : 0,
          shine: specular > 0 ? a[CORNER_LIGHT + 1] / specular : 0,
          ambient: scaled(raw.albedo, ambient * raw.occlusion),
          diffuse: scaled(raw.albedo, lit),
          specular: [added, added, added],
          final: [
            Math.min(255, mapped[0] + added),
            Math.min(255, mapped[1] + added),
            Math.min(255, mapped[2] + added),
          ],
        };
      }
      if (input.x === probe.x && input.y === probe.y) {
        probed = { result, position, triangle: input.triangle };
      }
      let color: Vec3;
      switch (channel) {
        case "ambient":
          color = result.ambient;
          break;
        case "diffuse":
          color = result.diffuse;
          break;
        case "specular":
          color = result.specular;
          break;
        case "albedo":
          color = result.albedo;
          break;
        case "normal":
          color = [
            (result.normal[0] + 1) * 127.5,
            (result.normal[1] + 1) * 127.5,
            (result.normal[2] + 1) * 127.5,
          ];
          break;
        case "uv":
          color = [(u - Math.floor(u)) * 255, (v - Math.floor(v)) * 255, 60];
          break;
        default:
          color = result.final;
      }
      out[0] = color[0];
      out[1] = color[1];
      out[2] = color[2];
    });
    return {
      framebuffer,
      probed: probed as { result: LightingResult; position: Vec3; triangle: number } | null,
    };
  }, [scene, normals, light, mat, lighting, channel, probe, ambient, specular]);

  useEffect(() => {
    paintFramebuffer(canvas.current, frame.framebuffer);
  });

  const lightOnScreen = projectToScreen(light);
  const hitsObject = useMemo(() => {
    // A rough test: is the light on the far side and inside the object's outline?
    if (light[2] >= 0) return false;
    const x = Math.floor(lightOnScreen[0]);
    const y = Math.floor(lightOnScreen[1]);
    return (
      x >= 0 && x < WIDTH && y >= 0 && y < HEIGHT && frame.framebuffer.owner[y * WIDTH + x] >= 0
    );
  }, [frame, light, lightOnScreen]);

  const normalArrows = useMemo(() => {
    if (!showNormals) return [];
    const list: { from: Vec3; to: Vec3; key: number }[] = [];
    const addArrow = (from: Vec3, normal: Vec3, key: number) => {
      if (dot(normal, subtract(EYE, from)) <= 0) return;
      list.push({ from, to: add(from, scaled(normal, 0.32)), key });
    };
    if (normals === "face") {
      mesh.triangles.forEach(([a, b, c], i) => {
        const p = scene.positions;
        addArrow(
          [
            (p[a][0] + p[b][0] + p[c][0]) / 3,
            (p[a][1] + p[b][1] + p[c][1]) / 3,
            (p[a][2] + p[b][2] + p[c][2]) / 3,
          ],
          scene.faceNormals[i],
          i,
        );
      });
    } else {
      scene.positions.forEach((position, i) => {
        addArrow(position, scene.vertexNormals[i], i);
      });
    }
    return list;
  }, [showNormals, normals, mesh, scene]);

  const toFramebuffer = (event: PointerEvent<HTMLCanvasElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.floor(((event.clientX - box.left) / box.width) * WIDTH),
      y: Math.floor(((event.clientY - box.top) / box.height) * HEIGHT),
    };
  };

  const probed = frame.probed;

  return (
    <GraphicsPanel title="LIGHT AND TEXTURE" sound={sound}>
      <Bay>
        <div className={styles.screen}>
          <canvas
            ref={canvas}
            width={WIDTH}
            height={HEIGHT}
            className={`${styles.canvas} ${styles.pixels}`}
            style={{ aspectRatio: `${WIDTH} / ${HEIGHT}` }}
            role="img"
            aria-label={`A lit ${SHAPES[shape].label.toLowerCase()}.`}
            onPointerDown={(event) => {
              press.current = { x: event.clientX, y: event.clientY, moved: false };
              event.currentTarget.setPointerCapture?.(event.pointerId);
            }}
            onPointerMove={(event) => {
              const held = press.current;
              if (!held) return;
              const dx = event.clientX - held.x;
              const dy = event.clientY - held.y;
              if (!held.moved && Math.hypot(dx, dy) < 4) return;
              held.moved = true;
              held.x = event.clientX;
              held.y = event.clientY;
              setObjectYaw((value) => value + dx * 0.5);
              setObjectPitch((value) => Math.max(-85, Math.min(85, value + dy * 0.5)));
            }}
            onPointerUp={(event) => {
              const held = press.current;
              press.current = null;
              if (held && !held.moved) setProbe(toFramebuffer(event));
            }}
            onPointerCancel={() => {
              press.current = null;
            }}
          />
          <svg className={styles.overlay} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-hidden="true">
            {normalArrows.map(({ from, to, key }) => {
              const [x0, y0] = projectToScreen(from);
              const [x1, y1] = projectToScreen(to);
              return (
                <line
                  key={key}
                  x1={x0}
                  y1={y0}
                  x2={x1}
                  y2={y1}
                  stroke="#ffd166"
                  strokeWidth={0.8}
                />
              );
            })}
            {probed && (
              <>
                <VectorArrow
                  from={probed.position}
                  direction={probed.result.normal}
                  color="#ffd166"
                  label="N"
                />
                <VectorArrow
                  from={probed.position}
                  direction={probed.result.toLight}
                  color="#ffffff"
                  label="L"
                />
                <VectorArrow
                  from={probed.position}
                  direction={probed.result.toEye}
                  color="#6cb8ff"
                  label="V"
                />
                <VectorArrow
                  from={probed.position}
                  direction={probed.result.halfway}
                  color="#38e1ff"
                  label="H"
                />
              </>
            )}
            <rect
              x={probe.x - 2}
              y={probe.y - 2}
              width={5}
              height={5}
              fill="none"
              stroke="#fff"
              strokeWidth={0.8}
            />
            {!hitsObject && (
              <g
                className={styles.handle}
                onPointerDown={(event) => {
                  lightPress.current = { x: event.clientX, y: event.clientY };
                  event.currentTarget.setPointerCapture?.(event.pointerId);
                  event.stopPropagation();
                }}
                onPointerMove={(event) => {
                  const held = lightPress.current;
                  if (!held) return;
                  const dx = event.clientX - held.x;
                  const dy = event.clientY - held.y;
                  lightPress.current = { x: event.clientX, y: event.clientY };
                  setLightYaw((value) => ((value + dx * 0.6 + 540) % 360) - 180);
                  setLightPitch((value) => Math.max(-85, Math.min(85, value - dy * 0.6)));
                }}
                onPointerUp={() => {
                  lightPress.current = null;
                }}
              >
                <circle cx={lightOnScreen[0]} cy={lightOnScreen[1]} r={13} fill="transparent" />
                <circle
                  cx={lightOnScreen[0]}
                  cy={lightOnScreen[1]}
                  r={light[2] < 0 ? 3 : 5}
                  fill="#fff6c4"
                  stroke="#f4b13e"
                  strokeWidth={1.5}
                />
              </g>
            )}
          </svg>
        </div>
        <Choice
          label="SHOW"
          value={channel}
          options={CHANNELS}
          onChange={(next) => {
            setChannel(next);
            sound.playButton();
          }}
        />
        <Choice
          label="SHAPE"
          value={shape}
          options={(Object.keys(SHAPES) as ShapeName[]).map((value) => ({
            value,
            label: SHAPES[value].label,
          }))}
          onChange={(next) => {
            setShape(next);
            sound.playButton();
          }}
        />
        {SHAPES[shape].detail && (
          <Slider
            label="DETAIL"
            value={detail}
            min={2}
            max={24}
            step={1}
            format={(v) => String(v)}
            onChange={setDetail}
          />
        )}
      </Bay>

      <Bay head="NORMALS">
        <Choice
          label="ONE PER"
          value={normals}
          options={[
            { value: "face", label: "FACE" },
            { value: "corner", label: "VERTEX" },
            { value: "pixel", label: "PIXEL" },
          ]}
          onChange={(next) => {
            setNormals(next);
            sound.playButton();
          }}
        />
        <div className={styles.choiceRow}>
          <Toggle label="DRAW NORMALS" on={showNormals} onChange={setShowNormals} />
        </div>
      </Bay>

      <Bay head="LIGHT">
        <div className={styles.sliders}>
          <Slider
            label="AROUND"
            value={lightYaw}
            min={-180}
            max={180}
            step={1}
            format={(v) => `${Math.round(v)}°`}
            onChange={setLightYaw}
          />
          <Slider
            label="UP"
            value={lightPitch}
            min={-85}
            max={85}
            step={1}
            format={(v) => `${Math.round(v)}°`}
            onChange={setLightPitch}
          />
          <Slider
            label="AMBIENT"
            value={ambient}
            min={0}
            max={1}
            step={0.01}
            onChange={setAmbient}
          />
          <Slider
            label="DIFFUSE"
            value={diffuse}
            min={0}
            max={1}
            step={0.01}
            onChange={setDiffuse}
          />
          <Slider
            label="SPECULAR"
            value={specular}
            min={0}
            max={1}
            step={0.01}
            onChange={setSpecular}
          />
          <Slider
            label="SHININESS"
            value={shininess}
            min={1}
            max={256}
            step={1}
            format={(v) => String(v)}
            onChange={setShininess}
          />
        </div>
        <div className={styles.choiceRow}>
          <Toggle label="ORBIT LIGHT" on={orbiting} onChange={setOrbiting} />
        </div>
      </Bay>

      <Bay head="TEXTURES">
        <Choice
          label="SURFACE"
          value={materialName}
          options={MATERIAL_NAMES.map((value) => ({ value, label: value.toUpperCase() }))}
          onChange={(next) => {
            setMaterialName(next);
            sound.playButton();
          }}
        />
        <div className={styles.maps}>
          {MAP_NAMES.map((name) => (
            <button
              key={name}
              type="button"
              className={styles.map}
              aria-pressed={maps[name]}
              disabled={normals === "corner" && name === "normal"}
              onClick={() => {
                setMaps({ ...maps, [name]: !maps[name] });
                sound.playButton();
              }}
            >
              <MapThumbnail map={mat[name]} normal={name === "normal"} />
              {MAP_LABELS[name]}
            </button>
          ))}
        </div>
        <Choice
          label="SAMPLING"
          value={smooth ? "smooth" : "nearest"}
          options={[
            { value: "nearest", label: "NEAREST" },
            { value: "smooth", label: "BILINEAR" },
          ]}
          onChange={(next) => setSmooth(next === "smooth")}
        />
      </Bay>

      <Bay head="ONE PIXEL" aside={`${probe.x}, ${probe.y}`}>
        {probed ? (
          <ol className={styles.work}>
            <li>N {vector(probed.result.normal)}</li>
            <li>L {vector(probed.result.toLight)}</li>
            <li>V {vector(probed.result.toEye)}</li>
            <li>H {vector(probed.result.halfway)}</li>
            <li>N·L = {fixed(probed.result.nDotL)}</li>
            <li>
              {normals === "corner"
                ? "N·H^s"
                : `N·H = ${fixed(probed.result.nDotH)} · ^${shininess}`}{" "}
              = {fixed(probed.result.shine, 3)}
            </li>
            <li>COLOR {rgbList(probed.result.albedo)}</li>
            <li>AMBIENT + {rgbList(probed.result.ambient)}</li>
            <li>DIFFUSE + {rgbList(probed.result.diffuse)}</li>
            <li>SPECULAR + {rgbList(probed.result.specular)}</li>
            <li>
              = {rgbList(probed.result.final)}{" "}
              <i
                className={styles.swatch}
                style={{ background: `rgb(${probed.result.final.map(Math.round).join(",")})` }}
              />
            </li>
          </ol>
        ) : (
          <p className={styles.work}>NOTHING HERE</p>
        )}
      </Bay>
    </GraphicsPanel>
  );
}
