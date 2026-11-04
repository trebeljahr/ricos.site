// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BoneChain } from "./BoneChain";
import { CoordinateSpaces } from "./CoordinateSpaces";
import { LightingLab } from "./LightingLab";
import { MatrixPlayground } from "./MatrixPlayground";
import { MeshAnatomy } from "./MeshAnatomy";
import { SkeletonPlayer } from "./SkeletonPlayer";
import { SkinningStrip } from "./SkinningStrip";
import { Transform3d } from "./Transform3d";
import { TriangleRaster } from "./TriangleRaster";
import { UvUnwrap } from "./UvUnwrap";
import { WeightPaint } from "./WeightPaint";

// jsdom has no canvas. This one takes every call, so the demos' drawing code still runs.
function fakeContext() {
  const target: Record<string | symbol, unknown> = {
    createImageData: (width: number, height: number) => ({
      width,
      height,
      data: new Uint8ClampedArray(width * height * 4),
    }),
  };
  return new Proxy(target, {
    get: (object, key) => (key in object ? object[key] : () => ({ addColorStop: () => undefined })),
    set: (object, key, value) => {
      object[key] = value;
      return true;
    },
  });
}

beforeEach(() => {
  localStorage.clear();
  HTMLCanvasElement.prototype.getContext = (() =>
    fakeContext()) as unknown as HTMLCanvasElement["getContext"];
  Element.prototype.setPointerCapture = () => {};
  window.matchMedia = (() => ({ matches: true })) as unknown as typeof window.matchMedia;
});
afterEach(cleanup);

const press = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
const slide = (name: string, value: number, index = 0) =>
  fireEvent.change(screen.getAllByRole("slider", { name })[index], { target: { value } });
const step = (name: string) => expect(screen.getAllByText(name).length).toBeGreaterThan(0);
const count = (label: string | RegExp) => screen.getByText(label).nextElementSibling?.textContent;

describe("MatrixPlayground", () => {
  it("opens on three steps and multiplies them", () => {
    render(<MatrixPlayground />);
    step("1 SCALE");
    step("3 MOVE");
    expect(count("AREA ×")).toBe("2.25");
    expect(count("FACING")).toBe("SAME");
  });

  it("changes the answer when two steps swap", () => {
    render(<MatrixPlayground />);
    const worked = () => screen.getByText("AREA ×").closest("section")?.textContent;
    const before = worked();
    press("Do MOVE 3 earlier");
    expect(worked()).not.toBe(before);
    step("2 MOVE");
  });

  it("adds up a point's walk along the matrix's columns", () => {
    render(<MatrixPlayground />);
    fireEvent.click(screen.getByRole("button", { name: "Point 0.00, 2.50" }));
    slide("WALKED", 1);
    expect(screen.getByRole("button", { name: "0 · DIRECTION" })).toBeTruthy();
    expect(count("AREA ×")).toBe("2.25");
  });

  it("ignores the move for a direction", () => {
    render(<MatrixPlayground />);
    const sum = () => screen.getByText("AREA ×").closest("section")?.textContent ?? "";
    press("1 · POINT");
    const asPoint = sum();
    press("0 · DIRECTION");
    expect(sum()).not.toBe(asPoint);
  });

  it("reports a flip, and a flat matrix", () => {
    render(<MatrixPlayground />);
    press("DRAG AXES");
    press("MIRROR");
    expect(count("FACING")).toBe("FLIPPED");
    press("FLATTEN");
    expect(count("FACING")).toBe("FLAT");
    expect(count("AREA ×")).toBe("0.00");
    press("IDENTITY");
    expect(count("AREA ×")).toBe("1.00");
  });

  it("moves an axis handle from the keyboard, and the matrix's column follows", () => {
    render(<MatrixPlayground />);
    press("DRAG AXES");
    press("IDENTITY");
    fireEvent.keyDown(screen.getByRole("slider", { name: "Where the x axis lands" }), {
      key: "ArrowRight",
    });
    expect(count("AREA ×")).toBe("1.25");
  });

  it("adds and removes steps, up to six", () => {
    render(<MatrixPlayground />);
    press("+ SHEAR");
    step("4 SHEAR");
    press("+ SHEAR");
    press("+ SHEAR");
    step("6 SHEAR");
    expect((screen.getByRole("button", { name: "+ MOVE" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    press("Remove SHEAR 6");
    expect(screen.queryAllByText("6 SHEAR")).toEqual([]);
  });

  it("scrubs back to where nothing has happened", () => {
    render(<MatrixPlayground />);
    slide("STEP", 0);
    expect(count("AREA ×")).toBe("1.00");
  });
});

describe("Transform3d", () => {
  it("prints a 4×4 product and follows a corner through it", () => {
    render(<Transform3d />);
    step("1 TURN Y");
    expect(screen.getByText(/^VERTEX \d+$/)).toBeTruthy();
    press("Next vertex");
    expect(screen.getByText(/^VERTEX \d+$/)).toBeTruthy();
    press("+ TURN X");
    step("3 TURN X");
  });
});

describe("MeshAnatomy", () => {
  it("counts a cube's corners, triangles and bytes", () => {
    render(<MeshAnatomy />);
    expect(screen.getByText("VERTICES · 8")).toBeTruthy();
    expect(screen.getByText("TRIANGLES · 12")).toBeTruthy();
    expect(count(/^VERTICES 8 × 12 B/)).toBe("96 B");
    expect(count("SHARED, TOTAL")).toBe("168 B");
    expect(count(/^NOT SHARED/)).toBe("432 B");
  });

  it("needs 24 corners once each face has its own normals", () => {
    render(<MeshAnatomy />);
    press("CUBE · 24V");
    expect(screen.getByText("VERTICES · 24")).toBeTruthy();
  });

  it("shows a corner's bytes and moves it", () => {
    render(<MeshAnatomy />);
    const corners = within(screen.getByRole("list", { name: "Vertex list" }));
    fireEvent.click(corners.getByRole("button", { name: /^0\s*-1\.00/ }));
    expect(screen.getByText("X = -1.00 = 00 00 80 BF")).toBeTruthy();
    expect(count("IN TRIANGLES")).not.toBe("0");
    slide("X", 0.5);
    expect(screen.getByText("X = 0.50 = 00 00 00 3F")).toBeTruthy();
    press("RESET");
    expect(screen.getByText("X = -1.00 = 00 00 80 BF")).toBeTruthy();
  });

  it("grows a sphere with its detail", () => {
    render(<MeshAnatomy />);
    press("SPHERE");
    const at = screen.getByText(/^VERTICES · /).textContent;
    slide("DETAIL", 12);
    expect(screen.getByText(/^VERTICES · /).textContent).not.toBe(at);
  });
});

describe("CoordinateSpaces", () => {
  it("opens with one corner traced to one pixel", () => {
    render(<CoordinateSpaces />);
    expect(screen.getByText(/^VERTEX \d+$/)).toBeTruthy();
    for (const name of ["LOCAL", "CAMERA", "CLIP", "NDC", "SCREEN", "PIXEL"]) {
      expect(screen.getByRole("button", { name: new RegExp(`^${name}`) })).toBeTruthy();
    }
  });

  it("shows each stop's matrix", () => {
    render(<CoordinateSpaces />);
    expect(screen.getByText("AS STORED IN THE MESH")).toBeTruthy();
    press(/^WORLD/);
    expect(screen.getByText("MODEL")).toBeTruthy();
    press(/^CAMERA/);
    expect(screen.getByText("VIEW")).toBeTruthy();
    press(/^CLIP/);
    expect(screen.getByText("PROJECTION")).toBeTruthy();
    press(/^NDC/);
    expect(screen.getByText(/^x = .* ÷ /)).toBeTruthy();
    press(/^SCREEN/);
    expect(screen.getByText("VIEWPORT")).toBeTruthy();
  });

  it("lands on another pixel once the object moves", () => {
    render(<CoordinateSpaces />);
    const pixelRow = () => screen.getByRole("button", { name: /^PIXEL/ }).textContent;
    const before = pixelRow();
    press(/^WORLD/);
    slide("MOVE X", 3);
    expect(pixelRow()).not.toBe(before);
  });

  it("rasterizes and reads back a pixel", async () => {
    render(<CoordinateSpaces />);
    press(/^PIXEL/);
    expect(Number(count("FRAGMENTS"))).toBeGreaterThan(0);
    await waitFor(() => expect(Number(count("TRIANGLES"))).toBe(1810));
    const canvas = screen.getByRole("img", { name: /^The screen/ });
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 64, height: 48 }) as DOMRect;
    fireEvent.pointerDown(canvas, { clientX: 32, clientY: 24 });
    expect(screen.getByText(/^PIXEL 32, 24/)).toBeTruthy();
  });

  it("gives more pixels on a bigger screen", () => {
    render(<CoordinateSpaces />);
    press(/^PIXEL/);
    const before = Number(count("FRAGMENTS"));
    press("160×120");
    expect(Number(count("FRAGMENTS"))).toBeGreaterThan(before);
  });

  it("marks a corner the camera passed", () => {
    render(<CoordinateSpaces />);
    press(/^CAMERA/);
    slide("BACK", 1.5);
    press(/^WORLD/);
    slide("MOVE Z", 4);
    slide("MOVE X", 4);
    press(/^CLIP/);
    expect(count(/^INSIDE/)).toBe("NO");
  });
});

describe("MeshAnatomy building", () => {
  it("reads the vertex list before the triangle list", () => {
    render(<MeshAnatomy />);
    slide("READ", 0.1);
    const vertices = within(screen.getByRole("list", { name: "Vertex list" }));
    expect(vertices.getAllByRole("button").some((row) => row.hasAttribute("data-current"))).toBe(
      true,
    );
    slide("READ", 0.8);
    const triangles = within(screen.getByRole("list", { name: "Triangle list" }));
    expect(triangles.getAllByRole("button").some((row) => row.hasAttribute("data-current"))).toBe(
      true,
    );
  });

  it("flips a triangle's winding and resets it", () => {
    render(<MeshAnatomy />);
    const triangles = within(screen.getByRole("list", { name: "Triangle list" }));
    const row = () => triangles.getByRole("button", { name: /^0\s*0\s*/ });
    fireEvent.click(row());
    const before = row().textContent;
    press("FLIP WINDING");
    expect(row().textContent).not.toBe(before);
    press("RESET");
    expect(row().textContent).toBe(before);
  });
});

describe("TriangleRaster", () => {
  it("opens finished, and scrubbing shows one pixel's test", () => {
    render(<TriangleRaster />);
    const written = Number(count("WRITTEN"));
    expect(written).toBeGreaterThan(20);
    slide("SCANNED", 0.5);
    expect(screen.getByText(/→ (OUTSIDE|WRITTEN)/)).toBeTruthy();
    expect(Number(count("WRITTEN"))).toBeLessThan(written);
  });

  it("loses pixels to a nearer triangle, and gets them back when it moves behind", () => {
    render(<TriangleRaster />);
    press("SECOND TRIANGLE");
    expect(Number(count("BEHIND"))).toBeGreaterThan(0);
    slide("DEPTH 2", 0.05);
    expect(Number(count("BEHIND"))).toBe(0);
  });

  it("moves a corner from the keyboard", () => {
    render(<TriangleRaster />);
    const before = count("TESTED");
    fireEvent.keyDown(screen.getByRole("slider", { name: "Corner B of triangle 1" }), {
      key: "ArrowRight",
    });
    expect(count("TESTED")).not.toBe(before);
  });
});

describe("UvUnwrap", () => {
  it("opens a cube into one island along seven cuts", () => {
    render(<UvUnwrap />);
    expect(count("ISLANDS")).toBe("1");
    expect(count("CUT EDGES")).toBe("7");
    expect(count("FOLDED OVER")).toBe("0");
    expect(count("STRETCHED BY")).toBe("×1.0");
  });

  it("makes one island per triangle when every edge is cut", () => {
    render(<UvUnwrap />);
    press("EVERY EDGE");
    expect(count("ISLANDS")).toBe("12");
    expect(count("STRETCHED BY")).toBe("×1.0");
  });

  it("stretches a sphere, because a sphere cannot lie flat", () => {
    render(<UvUnwrap />);
    press("SPHERE");
    expect(count("ISLANDS")).toBe("1");
    expect(Number(count("STRETCHED BY")?.slice(1))).toBeGreaterThan(1.2);
  });

  it("reads a real artist's layout", async () => {
    render(<UvUnwrap />);
    press("CHARACTER");
    await waitFor(() => expect(count("TRIANGLES")).toBe("8,970"), { timeout: 5000 });
    expect(Number(count("ISLANDS"))).toBeGreaterThan(5);
  });
});

describe("BoneChain", () => {
  const tip = () => screen.getByRole("button", { name: /^BONE 4/ }).textContent;

  it("moves every child when a parent turns", () => {
    render(<BoneChain />);
    const before = tip();
    fireEvent.click(screen.getByRole("button", { name: /^BONE 1/ }));
    slide("BONE 1", 10);
    expect(tip()).not.toBe(before);
  });

  it("leaves children where they are without the hierarchy", () => {
    render(<BoneChain />);
    press("CHILDREN FOLLOW");
    const before = tip();
    fireEvent.click(screen.getByRole("button", { name: /^BONE 1/ }));
    slide("BONE 1", 10);
    expect(tip()).toBe(before);
  });

  it("turns a bone from the keyboard", () => {
    render(<BoneChain />);
    const before = tip();
    fireEvent.keyDown(screen.getByRole("slider", { name: "Bone 3" }), { key: "ArrowUp" });
    expect(tip()).not.toBe(before);
  });
});

describe("SkinningStrip", () => {
  it("loses width at the joint as the bend grows", () => {
    render(<SkinningStrip />);
    const width = () => Number(count("WIDTH AT JOINT")?.replace("%", ""));
    slide("BEND", 0);
    expect(width()).toBe(100);
    slide("BEND", 170);
    expect(width()).toBeLessThan(30);
  });

  it("puts a vertex between its bones' copies, by its weight", () => {
    render(<SkinningStrip />);
    slide("WEIGHT", 0.5);
    expect(screen.getAllByText("0.50").length).toBeGreaterThan(1);
  });
});

describe("WeightPaint", () => {
  it("offers the T. rex's bones", async () => {
    render(<WeightPaint />);
    expect(await screen.findByRole("button", { name: "Head" })).toBeTruthy();
    press("Tail3");
    expect(screen.getByRole("button", { name: "Tail3", pressed: true })).toBeTruthy();
    press("AUTOMATIC");
    press("ARTIST'S");
  });

  it("paints with a stroke across the canvas", async () => {
    render(<WeightPaint />);
    await screen.findByRole("button", { name: "Head" });
    press("ADD");
    const canvas = screen.getByRole("img", { name: /T\. rex/ });
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 480, height: 360 }) as DOMRect;
    fireEvent.pointerDown(canvas, { clientX: 240, clientY: 180 });
    fireEvent.pointerMove(canvas, { clientX: 250, clientY: 180 });
    fireEvent.pointerUp(canvas, { clientX: 250, clientY: 180 });
    expect(screen.getByRole("button", { name: "ADD", pressed: true })).toBeTruthy();
  });
});

describe("SkeletonPlayer", () => {
  it("counts its keys, fewer when thinned", async () => {
    render(<SkeletonPlayer />);
    await screen.findByText("22 KEYS");
    press("4");
    expect(screen.getByText("7 KEYS")).toBeTruthy();
    press("HOLD");
    expect(screen.getByRole("button", { name: "HOLD", pressed: true })).toBeTruthy();
    expect(count("MATRICES A FRAME")).toBe("29");
  });

  it("changes clips", async () => {
    render(<SkeletonPlayer />);
    await screen.findByText("22 KEYS");
    press("RUN");
    expect(screen.getByText("15 KEYS")).toBeTruthy();
  });
});

describe("LightingLab", () => {
  it("reads the numbers of one pixel", () => {
    render(<LightingLab />);
    expect(screen.getByText(/^N·L = /)).toBeTruthy();
    expect(screen.getByText(/^AMBIENT \+ /)).toBeTruthy();
  });

  it("goes dark when the diffuse and shine sliders are off", () => {
    render(<LightingLab />);
    slide("AMBIENT", 0);
    slide("DIFFUSE", 0);
    slide("SPECULAR", 0);
    expect(screen.getByText(/^= 0 0 0/)).toBeTruthy();
  });

  it("turns each texture map off and on", () => {
    render(<LightingLab />);
    const colour = screen.getByRole("button", { name: "COLOR", pressed: true });
    fireEvent.click(colour);
    expect(screen.getByText("COLOR 206 206 206")).toBeTruthy();
  });

  it("cannot use a normal map with lighting per corner", () => {
    render(<LightingLab />);
    press("VERTEX");
    expect((screen.getByRole("button", { name: "NORMAL" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    press("FACE");
    expect((screen.getByRole("button", { name: "NORMAL" }) as HTMLButtonElement).disabled).toBe(
      false,
    );
  });

  it("switches shapes and views without losing its readout", () => {
    render(<LightingLab />);
    for (const name of ["TORUS", "WALL", "CUBE", "SPHERE"]) press(name);
    press("UNWRAP TO UV");
    for (const name of ["AMBIENT", "DIFFUSE", "NORMALS", "UV", "ALL"]) {
      fireEvent.click(screen.getAllByRole("button", { name })[0]);
    }
    expect(screen.getByText(/^N·L = /)).toBeTruthy();
  });

  it("reports nothing for an empty corner of the screen", () => {
    render(<LightingLab />);
    const canvas = screen.getByRole("img", { name: /lit/ });
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 320, height: 240 }) as DOMRect;
    fireEvent.pointerDown(canvas, { clientX: 2, clientY: 2 });
    fireEvent.pointerUp(canvas, { clientX: 2, clientY: 2 });
    expect(screen.getByText("NOTHING HERE")).toBeTruthy();
  });
});
