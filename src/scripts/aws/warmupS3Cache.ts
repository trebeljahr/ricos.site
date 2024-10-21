import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
import { fromEnv } from "@aws-sdk/credential-provider-env";
import axios from "axios";
import { Presets, SingleBar } from "cli-progress";
import "dotenv/config";
import { getAllStorageObjectKeys } from "src/lib/aws";
import { nextImageUrl } from "src/lib/mapToImageProps";

const imageKeys = await getAllStorageObjectKeys(process.env.AWS_BUCKET_NAME!);
let totalInvocations = 0;

const imageSizes = [128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048, 3840];

let counter = 1;
const format = `Generating previews | {bar} | {percentage}% | {value}/{total} | {eta}s`;
const progress = new SingleBar({ format }, Presets.shades_classic);

progress.start(imageKeys.length, counter);

for (const imageKey of imageKeys) {
  const promises: Promise<any>[] = [];

  for (const size of imageSizes) {
    totalInvocations++;
    const url = nextImageUrl("/" + imageKey, size);
    promises.push(axios.get(url));
  }
  await Promise.allSettled(promises);
  progress.update(++counter);
}

progress.stop();

async function invokeCorrectLambda(path: string) {
  await invokeLambda(
    "ImgTransformationStack-imageoptimization4C49F079-Ml7Uw9RAhwgP",
    path
  );
}

async function invokeLambda(funcName: string, path: string) {
  const credentials = fromEnv();

  const client = new LambdaClient({ region: "us-east-1", credentials });

  const payload = {
    headers: {
      "x-origin-secret-header": process.env.SECRET,
    },
    requestContext: {
      authentication: null,
      http: {
        method: "POST",
        path,
      },
    },
  };
  const command = new InvokeCommand({
    FunctionName: funcName,
    ClientContext: JSON.stringify({}),
    Payload: JSON.stringify(payload),
    LogType: "Tail",
    InvocationType: "Event",
  });

  await client.send(command);
}
