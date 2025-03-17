import * as fs from "fs";
import * as path from "path";

// Folder to process – adjust as needed or pass as a command line argument
const folderPath = path.join(process.cwd(), "/src/models/nature_pack");

// Regex to match the nodes object inside the GLTFResult type
const nodesRegex = /nodes\s*:\s*{([^}]+)}/m;
// Regex to match the materials object inside the GLTFResult type
const materialsRegex = /materials\s*:\s*{([^}]+)}/m;
// Regex to match the useGLTF call and extract the model path (assumes double or single quotes)
const useGLTFRegex = /useGLTF\(\s*["']([^"']+\-transformed.glb)["']\s*\)/m;
// Regex to find the default export function to insert before it
const defaultExportRegex = /export\s+default\s+function\s+Model\s*\(/m;

// Process all files in the folder (e.g. .tsx files)
fs.readdir(folderPath, (err, files) => {
  if (err) {
    console.error("Error reading folder:", err);
    return;
  }
  files.forEach((file) => {
    // You may want to process only .tsx or .ts files
    if (!file.endsWith(".tsx") && !file.endsWith(".ts")) return;

    const filePath = path.join(folderPath, file);
    let content = fs.readFileSync(filePath, "utf-8");

    // Extract nodes keys
    const nodesMatch = content.match(nodesRegex);
    if (!nodesMatch) {
      console.warn(`Nodes not found in ${file}`);
      return;
    }
    const nodesBlock = nodesMatch[1];
    const nodeKeys = nodesBlock
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        // Assumes the key is before the colon, e.g., BirchTree_1_1: Mesh;
        const parts = line.split(":");
        return parts[0].trim();
      });

    // Extract materials keys
    const materialsMatch = content.match(materialsRegex);
    if (!materialsMatch) {
      console.warn(`Materials not found in ${file}`);
      return;
    }
    const materialsBlock = materialsMatch[1];
    const materialKeys = materialsBlock
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        // Assumes the key is before the colon, e.g., White: MeshStandardMaterial;
        const parts = line.split(":");
        return parts[0].trim();
      });

    // Extract model path from useGLTF
    const useGLTFMatch = content.match(useGLTFRegex);
    if (!useGLTFMatch) {
      console.warn(`useGLTF call not found in ${file}`);
      return;
    }
    const modelPath = useGLTFMatch[1];

    // Derive a model name from the file path string in the modelPath.
    // For example, "/3d-assets/glb/nature_pack/BirchTree_1-transformed.glb" -> "BirchTree_1"
    const baseName = path.basename(modelPath, "-transformed.glb");
    // Create the new instanced function name, e.g., InstancedBirchTree1
    const instancedName = "Instanced" + baseName.replace(/_/g, "");

    // Create the meshMaterialCombos array string.
    // We assume a 1-to-1 mapping by order – adjust if needed.
    if (nodeKeys.length !== materialKeys.length) {
      console.warn(
        `The number of node keys and material keys do not match in ${file}. Skipping file.`
      );
      return;
    }
    const combosArray = nodeKeys
      .map((node, index) => `    ["${node}", "${materialKeys[index]}"]`)
      .join(",\n");

    // Create the code snippet to insert.
    const snippet = `
export function ${instancedName}({
  positions,
}: {
  positions: Vector3[];
}) {
  const meshMaterialCombos: MeshMaterialCombos = [
${combosArray}
  ];

  return (
    <GenericInstancedSystem
      positions={positions}
      meshMaterialCombos={meshMaterialCombos}
      modelPath={"${modelPath}"}
    />
  );
}
`;

    // Insert the snippet before the default export function (if found)
    if (defaultExportRegex.test(content)) {
      content = content.replace(defaultExportRegex, snippet + "\n\n$&");
    } else {
      // Otherwise, append at the end of the file
      content = content + "\n" + snippet;
    }

    // Write the updated file back
    fs.writeFileSync(filePath, content, "utf-8");
  });
});
