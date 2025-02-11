import Link from "next/link";
import { turnKebabIntoTitleCase } from "./utils";

export const toLinks = (shaderFile: string) => (
  <Link key={shaderFile} href={"/r3f/shaders/" + shaderFile}>
    {turnKebabIntoTitleCase(shaderFile)}
  </Link>
);
