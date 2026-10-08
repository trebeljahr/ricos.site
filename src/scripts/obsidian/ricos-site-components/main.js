// Obsidian plugin: commands that insert site components into the current note
// at the cursor, as the MDX the site renders. Installed into the Notes vault
// by `pnpm obsidian:install`; edit here, not in the vault copy.
// Each component must also be registered in src/components/MDXContentWithDemos.tsx.

const { Plugin } = require("obsidian");

const COMPONENTS = [
  { id: "insert-newsletter-form", name: "Insert newsletter form", mdx: "<NewsletterForm />" },
  {
    id: "insert-chapter-alerts-form",
    name: "Insert chapter alerts form",
    mdx: '<NewsletterForm list="computer" />',
  },
  { id: "insert-donation-box", name: "Insert donation box", mdx: "<DonationStrip />" },
];

/**
 * MDX only treats a component as a block when it has a line to itself with
 * blank lines around it, so pad it as needed wherever the cursor is.
 */
function insertBlock(editor, mdx) {
  const cursor = editor.getCursor();
  const line = editor.getLine(cursor.line);
  const textBefore = line.slice(0, cursor.ch).trim() !== "";
  const textAfter = line.slice(cursor.ch).trim() !== "";
  const lineAbove = cursor.line > 0 ? editor.getLine(cursor.line - 1).trim() : "";
  const before = textBefore ? "\n\n" : lineAbove !== "" ? "\n" : "";
  const after = textAfter ? "\n\n" : "\n";
  editor.replaceSelection(`${before}${mdx}${after}`);
}

module.exports = class RicosSiteComponents extends Plugin {
  onload() {
    for (const component of COMPONENTS) {
      this.addCommand({
        id: component.id,
        name: component.name,
        editorCallback: (editor) => insertBlock(editor, component.mdx),
      });
    }
  }
};
