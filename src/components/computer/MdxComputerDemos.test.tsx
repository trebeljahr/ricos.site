import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import { bundleMDX } from "mdx-bundler";
import { getMDXComponent } from "mdx-bundler/client";
import { renderToStaticMarkup } from "react-dom/server";
import { CHAPTER_FILE, chapterToMdx } from "src/lib/computerSeriesLinks";
import { hasMdxDemos, MDX_DEMO_COMPONENTS } from "src/lib/mdxDemoComponents";
import { describe, expect, it } from "vitest";
import { BooleanOperators } from "./BooleanOperators";
import { COMPUTER_MDX_DEMOS } from "./MdxComputerDemos";

const CHAPTER_DIR = new URL("../../content/Notes/computer/", import.meta.url);
const readChapter = (file: string) => readFileSync(new URL(encodeURI(file), CHAPTER_DIR), "utf8");
/** Every chapter file with a demo in it, wherever the outline has moved it. */
const embeddedChapters = readdirSync(CHAPTER_DIR, { recursive: true, encoding: "utf8" })
  .filter((file) => CHAPTER_FILE.test(file))
  .filter((file) => hasMdxDemos(chapterToMdx(matter(readChapter(file)).content)));

const COMPONENTS = dirname(fileURLToPath(import.meta.url));
const SRC = join(COMPONENTS, "../..");

/** Every local file a module reaches through value imports; `import()` starts another chunk. */
function staticImports(file: string, seen = new Set<string>()) {
  if (seen.has(file)) return seen;
  seen.add(file);
  const statement = /^(?:import|export)\s+(?!type\b)[^;]*?\bfrom\s+"([^"]+)"/gm;
  for (const [, source] of readFileSync(file, "utf8").matchAll(statement)) {
    const base = source.startsWith(".")
      ? join(dirname(file), source)
      : source.startsWith("src/")
        ? join(SRC, source.slice(4))
        : source.startsWith("@components/")
          ? join(SRC, "components", source.slice(12))
          : null;
    const target =
      base && [".ts", ".tsx", "/index.ts", "/index.tsx"].map((ext) => base + ext).find(existsSync);
    if (target) staticImports(target, seen);
  }
  return seen;
}

describe("chapter demo integration", () => {
  // A second `import()` that reaches the builder ships a second copy of it.
  it("loads the circuit builder only through the one shared import", () => {
    const builder = join(COMPONENTS, "LogicBuilder.tsx");
    const registry = readFileSync(join(COMPONENTS, "MdxComputerDemos.tsx"), "utf8");
    const separate = [...registry.matchAll(/import\("\.\/([^"]+)"\)/g)].map((match) => match[1]);
    expect(separate.length).toBeGreaterThan(0);
    for (const demo of separate)
      expect(
        staticImports(join(COMPONENTS, `${demo}.tsx`)).has(builder),
        `${demo} reaches LogicBuilder: load it through loadCircuitDemos`,
      ).toBe(false);
    expect(staticImports(join(COMPONENTS, "circuitDemos.ts")).has(builder)).toBe(true);
  });

  // Chapters render neither, and every chapter would load them with its first paint.
  it("keeps the collision demos and motion out of a chapter's first load", () => {
    const reached = [...staticImports(join(COMPONENTS, "ChapterMdxContent.tsx"))];
    expect(reached.length).toBeGreaterThan(1);
    for (const file of reached) {
      expect(file).not.toContain("collisionDetection");
      expect(readFileSync(file, "utf8"), file).not.toMatch(/from "motion\//);
    }
  });

  it.each(embeddedChapters)("prepares and detects the actual embedded chapter %s", (file) => {
    const source = readChapter(file);
    const prepared = chapterToMdx(matter(source).content);
    expect(prepared).not.toMatch(/<!--|nav:/);
    expect(hasMdxDemos(prepared)).toBe(true);
    const tags = [...prepared.matchAll(/<([A-Z][A-Za-z0-9]*)\b/g)].map((match) => match[1]);
    expect(tags.length).toBeGreaterThan(0);
    for (const tag of tags) {
      expect(MDX_DEMO_COMPONENTS).toContain(tag);
      expect({ ...COMPUTER_MDX_DEMOS, BooleanOperators }).toHaveProperty(tag);
    }
  });
  it("detects actual component tags with JSX props after removing chapter comments", () => {
    const source = chapterToMdx(`
<!-- <ClockScope /> is only a note to self. -->
<HalfAdder sumOnly />

<LazyLogicTutorial title="Build a full adder" levels={["full-adder"]} />

<UniversalGates showEmbedTags={false} headingLevel={3} />

<SemiconductorDemo />
`);
    expect(source).not.toContain("ClockScope");
    expect(hasMdxDemos(source)).toBe(true);
    expect(hasMdxDemos(chapterToMdx("Text. <!-- <ClockScope /> -->"))).toBe(false);
    expect(hasMdxDemos("<GateTruthTableExtra />")).toBe(false);
    for (const name of [...Object.keys(COMPUTER_MDX_DEMOS), "BooleanOperators"])
      expect(MDX_DEMO_COMPONENTS).toContain(name);
  });

  it("compiles and renders chapter tags through the real MDX registry without mounting circuit builders during SSR", async () => {
    const source = chapterToMdx(
      [
        "<!-- navigation and private drafting notes stay out of the output -->",
        ...Object.keys(COMPUTER_MDX_DEMOS).map((name) => {
          if (name === "HalfAdder") return "<HalfAdder sumOnly />";
          if (name === "UniversalGates")
            return "<UniversalGates showEmbedTags={false} headingLevel={3} />";
          if (name === "LazyLogicTutorial") return '<LazyLogicTutorial levels={["full-adder"]} />';
          return `<${name} />`;
        }),
        "<BooleanOperators />",
      ].join("\n\n"),
    );
    expect(hasMdxDemos(source)).toBe(true);
    const { code } = await bundleMDX({ source });
    const Component = getMDXComponent(code);
    const html = renderToStaticMarkup(
      <Component components={{ ...COMPUTER_MDX_DEMOS, BooleanOperators }} />,
    );
    expect(html.match(/: loading…/g)).toHaveLength(
      Object.keys(COMPUTER_MDX_DEMOS).filter((name) => name !== "TruthTableScale").length,
    );
    expect(html).toContain("Basic Boolean operators");
    expect(html).not.toContain("data-logic-builder");
    expect(html).not.toContain("private drafting notes");
  });
});
