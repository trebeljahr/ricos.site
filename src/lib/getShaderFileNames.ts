import { readdir } from "fs/promises";

export async function getShaderFileNames() {
  const directory = process.cwd() + "/src/shaders/standaloneFragmentShaders";
  const files = (await readdir(directory)) || [];
  return files.map((singleFile) => singleFile.replace(".frag", ""));
}
