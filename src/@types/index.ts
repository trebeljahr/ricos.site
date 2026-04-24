import type { Material, Mesh } from "three";
import type { GLTF } from "three-stdlib";

export type ImageProps = {
  width: number;
  height: number;
  src: string;
};

export type XYZ = {
  x: number;
  y: number;
  z: number;
};

export type MDXResult = {
  code: string;
};

export type GLTFResult = {
  nodes: {
    [x: string]: Mesh;
  };
  materials: {
    [x: string]: Material;
  };
  scene: GLTF["scene"];
  scenes: GLTF["scenes"];
  animations: GLTF["animations"];
  // biome-ignore lint/suspicious/noExplicitAny: explicit any acknowledged
  [key: string]: any;
};
export type CommonMetadata = {
  title: string;
  slug: string;
  subtitle?: string;

  date: string;
  excerpt: string;
  markdownExcerpt: MDXResult;
  link: string;
  tags: string;
  cover: {
    src: string;
    alt: string;
    width: number;
    height: number;
  };
  metadata: {
    readingTime: number;
    wordCount: number;
  };
  metaDescription: string;
  seoTitle: string;
  seoKeywords: string[];
  seoOgImage: string;
  seoOgImageAlt: string;

  published: boolean;
  number?: string;
  slugTitle?: string;

  bookAuthor?: string;
  rating?: number;
  summary?: boolean;

  show?: string;
  episode?: number;

  parentFolder?: string;
};
export type HasDate = { date: string };
