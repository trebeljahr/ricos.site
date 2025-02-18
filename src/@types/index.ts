import { MDXRemoteSerializeResult } from "next-mdx-remote";
import { Material, Mesh } from "three";
import { GLTF } from "three-stdlib";

export type ImageProps = {
  width: number;
  height: number;
  src: string;
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
