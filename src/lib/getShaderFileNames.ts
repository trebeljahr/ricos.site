import { readdir } from "fs/promises";

export async function getShaderFileNames() {
  const shaderDir = process.cwd() + "/src/shaders/standaloneFragmentShaders";
  const shaderFiles = (await readdir(shaderDir)) || [];
  return shaderFiles.map((shaderFile) => shaderFile.replace(".frag", ""));
}
