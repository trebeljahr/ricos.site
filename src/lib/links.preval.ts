import { readdir } from "fs/promises";
import preval from "next-plugin-preval";
import path from "path";
import { getShaderFileNames } from "./getShaderFileNames";
import { turnKebabIntoTitleCase } from "./utils/turnKebapIntoTitleCase";

export const addPrefix = (prefix: string) => (url: string) => {
  const newUrl = prefix + url;
  return { name: url, url: newUrl };
};

const r3fDirectory = path.resolve(process.cwd(), "src", "pages", "r3f");

export async function getFileNamesForR3FDemos(subfolder: string) {
  const directory = path.resolve(r3fDirectory, subfolder);
  const files = (await readdir(directory)) || [];

  const key = turnKebabIntoTitleCase(subfolder);

  const links = files
    .map((singleFile) => singleFile.replace(".tsx", ""))
    .map(addPrefix(`/r3f/${subfolder}/`));

  return { [key]: links };
}

export async function getDirectoriesForR3FDemos() {
  const files = (await readdir(r3fDirectory)) || [];

  const directories = files.filter((file) => !file.includes(".tsx"));

  return directories;
}

type FoldersWithLinks = Record<string, { name: string; url: string }[]>;

export async function getAllLinksForR3FDemos(): Promise<FoldersWithLinks> {
  const shaderFiles = await getShaderFileNames();
  const directories = await getDirectoriesForR3FDemos();
  const filteredDirectories = directories.filter(
    (directory) => directory !== "shaders"
  );

  const allLinks = {} as FoldersWithLinks;

  for (const directory of filteredDirectories) {
    const links = await getFileNamesForR3FDemos(directory);
    Object.assign(allLinks, links);
  }

  const shaderLinks = shaderFiles.map(addPrefix("/r3f/shaders/"));

  return { ...allLinks, "Shader Demos": shaderLinks };
}

export type NavLinks = Record<string, { name: string; url: string }[]>;

async function getData() {
  const links = await getAllLinksForR3FDemos();
  return { links };
}

export default preval(getData());
