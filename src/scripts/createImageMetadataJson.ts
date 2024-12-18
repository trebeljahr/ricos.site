import "dotenv/config";
import { lstatSync } from "fs";
import inquirer from "inquirer";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import {
  assetsMetadataFilePath,
  createMetadataFile,
} from "./metadataJsonFileHelpers";

const argv = await yargs(hideBin(process.argv))
  .option("dirPath", {
    alias: "d",
    description:
      "Path to assets directory for which metadata should be created",
    type: "string",
  })
  .help()
  .alias("help", "h").argv;

async function main() {
  let dirPath = argv.dirPath;

  if (!dirPath) {
    const response = await inquirer.prompt<{ dirPath: string }>([
      {
        type: "input",
        message: "Please provide a path to directory:",
        name: "dirPath",
      },
    ]);
    dirPath = response.dirPath;
  }

  if (!lstatSync(dirPath).isDirectory()) {
    throw new Error("Please input a valid directory path");
  }

  await createMetadataFile(dirPath, assetsMetadataFilePath);
}

main();
