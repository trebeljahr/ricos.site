/**
 * Thin wrapper around `claude -p` for the needlestack passes.
 *
 * Print mode with `--output-format json` returns an envelope. A failure can
 * arrive two ways — inside the envelope as `is_error`, or as a non-zero exit
 * whose message is the entire command line with a 4000-character prompt in it —
 * so both are unwrapped here and reduced to something readable.
 *
 * The prompt is passed on stdin rather than argv: a batch of 60 links is tens
 * of kilobytes, which is close enough to the argv limit to be worth avoiding.
 */
import { spawn } from "node:child_process";

import { extractJsonArray } from "./classifyCore";

const TIMEOUT_MS = 10 * 60 * 1000;

/** Runs the CLI with the prompt on stdin and collects everything it prints. */
function runClaude(
  model: string,
  prompt: string,
): Promise<{ stdout: string; stderr: string; code: number | null }> {
  return new Promise((resolve, reject) => {
    const child = spawn("claude", ["-p", "--output-format", "json", "--model", model], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`claude timed out after ${TIMEOUT_MS / 1000}s`));
    }, TIMEOUT_MS);

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, code });
    });

    child.stdin.end(prompt);
  });
}

/** Login, credit or rate-limit trouble: retrying more batches will not help. */
export class ClaudeAuthError extends Error {}

type Envelope = { result?: string; is_error?: boolean };

function fail(text: string): never {
  const message = text.trim().slice(0, 400) || "claude CLI returned an error";
  if (/authenticat|oauth|logged out|login|credit balance|rate limit|quota/i.test(message))
    throw new ClaudeAuthError(message);
  throw new Error(message);
}

export async function askClaude(prompt: string, model: string): Promise<string> {
  const { stdout, stderr, code } = await runClaude(model, prompt);
  // The CLI prints its JSON envelope even on most failures, and the envelope
  // carries the readable message; stderr is the fallback.
  if (!stdout.trim().startsWith("{")) fail(stderr || `claude exited with code ${code}`);

  let envelope: Envelope;
  try {
    envelope = JSON.parse(stdout) as Envelope;
  } catch {
    fail(`could not parse the CLI envelope: ${stdout.slice(0, 200)}`);
  }
  if (envelope.is_error) fail(envelope.result ?? "");
  return envelope.result ?? "";
}

export async function askForJson<T>(prompt: string, model: string): Promise<T[]> {
  return extractJsonArray(await askClaude(prompt, model)) as unknown as T[];
}
