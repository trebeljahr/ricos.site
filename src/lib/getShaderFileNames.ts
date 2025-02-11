import { readdir } from "fs/promises";

export async function getShaderFileNames() {
  const shaderFiles = await readdir(
    process.cwd() + "/src/shaders/standaloneFragmentShaders"
  );
  return shaderFiles.map((shaderFile) => shaderFile.replace(".frag", ""));
}
