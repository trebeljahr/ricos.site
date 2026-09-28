import { scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { activateEmailListMember } from "./mailgun";

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: string,
  keylen: number,
) => Promise<Buffer>;

// Every confirm link ever sent carries a 32-byte scrypt hash as 64 hex chars.
// Keep this at 32 so links still sitting in inboxes keep working.
const HASH_BYTES = 32;
const HASH_PATTERN = new RegExp(`^[0-9a-f]{${HASH_BYTES * 2}}$`, "i");

function getSalt() {
  if (!process.env.SALT) throw Error("Please provide SALT in the .env file!");
  return process.env.SALT;
}

export async function getHash(str: string): Promise<string> {
  const hash = await scrypt(str, getSalt(), HASH_BYTES);
  return hash.toString("hex");
}

export async function checkHash(str: string, hashFromUrl: string): Promise<boolean> {
  const salt = getSalt();
  if (typeof str !== "string" || typeof hashFromUrl !== "string") return false;
  // Buffer.from(hex) stops at the first non-hex char instead of failing, so
  // check the shape first or a valid hash with junk appended would pass.
  if (!HASH_PATTERN.test(hashFromUrl)) return false;

  const expected = await scrypt(str, salt, HASH_BYTES);
  const given = Buffer.from(hashFromUrl, "hex");
  if (given.length !== expected.length) return false;
  return timingSafeEqual(expected, given);
}

// Old confirm links put the address into the query unencoded, so a "+" in it
// arrives as a space. Addresses can't contain bare spaces, so undo that.
export function emailFromQuery(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0) return null;
  return value.replace(/ /g, "+");
}

export async function confirmEmail(email: unknown, hash: unknown): Promise<boolean> {
  const address = emailFromQuery(email);
  if (!address || typeof hash !== "string") return false;
  if (!(await checkHash(address, hash))) return false;

  await activateEmailListMember(address);
  return true;
}
