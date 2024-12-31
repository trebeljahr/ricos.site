import { MDXRemoteSerializeResult } from "next-mdx-remote";

export type ImageProps = {
  width: number;
  height: number;
  src: string;
};

export type MDXResult = MDXRemoteSerializeResult<
  Record<string, unknown>,
  Record<string, unknown>
>;
