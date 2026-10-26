import { readFileSync } from "node:fs";
import matter from "gray-matter";
import { bundleMDX } from "mdx-bundler";
import { getMDXComponent } from "mdx-bundler/client";
import { renderToStaticMarkup } from "react-dom/server";
import { chapterToMdx } from "src/lib/computerSeriesLinks";
import { hasMdxDemos, MDX_DEMO_COMPONENTS } from "src/lib/mdxDemoComponents";
import { describe, expect, it } from "vitest";
import { BooleanOperators } from "./BooleanOperators";
import { COMPUTER_MDX_DEMOS } from "./MdxComputerDemos";

describe("chapter demo integration", () => {
  it.each([
    "Part 1 - The Basics/1.0 Whirlwind Tour.md",
    "Part 1 - The Basics/1.2 Transistors into Gates.md",
    "Part 1 - The Basics/1.2a The universalness of some logic gates.md",
    "Part 1 - The Basics/1.2b How does a transistor work.md",
    "Part 1 - The Basics/1.3 Gates to arithmetic.md",
    "Part 1 - The Basics/1.4 The Clock.md",
    "Part 2 - The CPU/2.3 Multiplexers and Decoders.md",
    "Part 2 - The CPU/2.4 The ALU.md",
  ])("prepares and detects the actual embedded chapter %s", (file) => {
    const source = readFileSync(
      new URL(`../../content/Notes/computer/${file}`, import.meta.url),
      "utf8",
    );
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
    expect(html.match(/loads when you scroll here/g)).toHaveLength(
      Object.keys(COMPUTER_MDX_DEMOS).filter((name) => name !== "TruthTableScale").length,
    );
    expect(html).toContain("Basic Boolean operators");
    expect(html).not.toContain("data-logic-builder");
    expect(html).not.toContain("private drafting notes");
  });
});
