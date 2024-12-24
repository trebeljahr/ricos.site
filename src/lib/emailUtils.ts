import { NextApiRequest, NextApiResponse } from "next";
import { promisify } from "util";
import { activateEmailListMember } from "./mailgun";
import { scrypt as scryptCallback } from "crypto";

const scrypt = promisify(scryptCallback);

export async function getHash(str: string): Promise<string> {
  if (!process.env.SALT) throw Error("Please provide SALT in the .env file!");

  const hash: any = await scrypt(str, process.env.SALT, 32);
  return hash.toString("hex");
}

export async function checkHash(str: string, hashFromUrl: string) {
  if (!process.env.SALT) throw Error("Please provide SALT in the .env file!");

  const inputHash: any = await scrypt(str, process.env.SALT || "", 64);
  return inputHash.toString("hex") === hashFromUrl;
}

export async function confirmEmail(req: NextApiRequest, res: NextApiResponse) {
  if (!checkHash(req.query.email as string, req.query.hash as string)) {
    return res.status(400).json({
      error: "An error occured...",
      errorMessage:
        "Hash provided with query doesn't match hash from email! Did you click the correct link?",
    });
  }

  await activateEmailListMember(req.query.email as string);
}
