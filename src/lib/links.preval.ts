import { readdir } from "fs/promises";
import preval from "next-plugin-preval";
import { getShaderFileNames } from "./getShaderFileNames";

export const addPrefix = (prefix: string) => (url: string) => {
  const newUrl = prefix + url;
  return { name: url, url: newUrl };
};

export async function getFileNamesForR3FDemos() {
  const directory = process.cwd() + "/src/pages/r3f";
  const files = (await readdir(directory)) || [];
  return files.map((singleFile) => singleFile.replace(".tsx", ""));
}

export async function getAllLinksForR3FDemos() {
  const shaderFiles = await getShaderFileNames();
  const r3fDemos = await getFileNamesForR3FDemos();

  const shaderLinks = shaderFiles.map(addPrefix("/r3f/shaders/"));
  const r3fDemoLinks = r3fDemos.map(addPrefix("/r3f/"));

  const allLinks = {
    "Shaders Demos": shaderLinks,
    "R3F Demos": r3fDemoLinks,
  };

  return allLinks;
}

export type NavLinks = Record<string, { name: string; url: string }[]>;

async function getData() {
  const links = await getAllLinksForR3FDemos();
  return { links };
}

export default preval(getData());
