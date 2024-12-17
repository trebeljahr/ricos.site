import { visit } from "unist-util-visit";
import { ImgHTMLAttributes } from "react";
import { Root } from "mdast";
import { Node } from "unified/lib";
import { Nodes } from "hast";

interface ImageNode extends Node {
  type: "element";
  tagName: "img";
  properties: ImgHTMLAttributes<HTMLImageElement>;
}

interface ParentNode extends Node {
  children: Node[];
}

interface GalleryNode extends Node {
  type: "element";
  tagName: "NiceGallery";
  properties: {
    images: ImgHTMLAttributes<HTMLImageElement>[];
  };
  children: Node[];
}

export function groupImages(tree: Node) {
  const newChildren: any[] = [];
  let currentImageGroup: ImageNode[] = [];

  console.log(tree);

  visit(tree, "element", (node: ImageNode) => {
    console.log("Traversing nodes", node);

    if (node.tagName === "img") {
      currentImageGroup.push(node);
    } else {
      if (currentImageGroup.length > 0) {
        newChildren.push({
          type: "element",
          tagName: "NiceGallery",
          properties: {
            images: currentImageGroup.map((img) => img.properties),
          },
          children: [],
        });
        currentImageGroup = [];
      }
      newChildren.push(node);
    }
  });

  if (currentImageGroup.length > 0) {
    newChildren.push({
      type: "element",
      tagName: "NiceGallery",
      properties: { images: currentImageGroup.map((img) => img.properties) },
      children: [],
    });
  }

  (tree as ParentNode).children = newChildren;

  //   console.log("From groupImages Plugin");
  //   console.log(newChildren);
}

import { remark } from "remark";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";

export async function transformMdxContent(content: string): Promise<string> {
  const tree = remark().use(remarkParse).parse(content);
  groupImages(tree);
  const transformedContent = remark().use(remarkStringify).stringify(tree);
  return transformedContent;
}

export default function remarkGemoji() {
  return function (tree: Root) {};
}
