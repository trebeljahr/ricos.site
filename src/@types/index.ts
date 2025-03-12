import { MDXRemoteSerializeResult } from "next-mdx-remote";
import { Material, Mesh } from "three";
import { GLTF } from "three-stdlib";

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

export type MDXResult = MDXRemoteSerializeResult<
  Record<string, unknown>,
  Record<string, unknown>
>;

export type GLTFResult = GLTF & {
  nodes: {
    [x: string]: Mesh;
  };
  materials: {
    [x: string]: Material;
  };
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
