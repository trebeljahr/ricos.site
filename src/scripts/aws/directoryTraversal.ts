import { readdir } from "fs/promises";
import path from "path";

type Options = { ignoreDirectories?: string[]; filePattern?: RegExp };

export async function collectFilesInPath(
  pathToSearch: string,
  { ignoreDirectories = [], filePattern }: Options = {}
): Promise<string[]> {
  const files = await readdir(pathToSearch, { withFileTypes: true });
  const filtered = files.filter((file) => {
    return (
      file.name.startsWith(".") === false &&
      file.name !== "node_modules" &&
      !ignoreDirectories.includes(file.name)
    );
  });

  let results: string[] = [];

  for (const file of filtered) {
    const filePath = path.resolve(pathToSearch, file.name);
    if (file.isDirectory()) {
      results = results.concat(
        await collectFilesInPath(filePath, {
          filePattern,
          ignoreDirectories,
        })
      );
    } else if (!filePattern || filePattern.test(filePath)) {
      results.push(filePath);
    }
  }

  return results;
}
