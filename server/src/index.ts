import { config } from "dotenv";
import express from "express";
import {
  activateEmailListMember,
  addNewMemberToEmailList,
  sendEmail,
} from "./mailgun.js";
import crypto from "crypto";
import { promisify } from "util";

config();
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

const scrypt = promisify(crypto.scrypt);

async function getHash(str: string): Promise<string> {
  if (!process.env.SALT) throw Error("Please provide SALT in the .env file!");

  const hash: any = await scrypt(str, process.env.SALT, 32);
  return hash.toString("hex");
}

async function checkHash(str: string, hashFromUrl: string) {
  if (!process.env.SALT) throw Error("Please provide SALT in the .env file!");

  const inputHash: any = await scrypt(str, process.env.SALT || "", 64);
  return inputHash.toString("hex") === hashFromUrl;
}

app.post("/signup", async (req, res) => {
  try {
    const newMember = {
      email: req.body.email,
      name: req.body.name || "",
      vars: { hash: await getHash(req.body.email) },
    };
    await addNewMemberToEmailList(newMember);

    const link = `${process.env.HOST}:${process.env.PORT}/confirm-email?hash=${newMember.vars.hash}&email=${newMember.email}`;
    const data = {
      from: "Rico Trebeljahr <rico@newsletter.trebeljahr.com>",
      to: newMember.email,
      subject: "Confirm Signup to Trebeljahr's Newsletter",
      html: `Please follow this link 
      <a href="${link}">${link}</a> 
      to confirm your newsletter subscription.`,
      text: `Please follow this link ${link} to confirm your newsletter subscription.`,
    };

    await sendEmail(data);

    res.json({
      success: "Signed up email for newsletter. Waiting for confirmation!",
    });
  } catch (err) {
    res.status(400).json({
      error: "An error occured...",
      errorMessage: getErrorMessage(err),
    });
  }
});

app.get("/confirm-email", async (req, res) => {
  if (!checkHash(req.query.email as string, req.query.hash as string)) {
    return res.status(400).json({
      error: "An error occured...",
      errorMessage:
        "Hash provided with query doesn't match hash from email! Did you click the correct link?",
    });
  }

  await activateEmailListMember(req.query.email as string);
  res.send(
    `Email successfully confirmed... Enjoy the newsletter! 
    You can head back to <a href="trebeljahr.com">trebeljahr.com/posts</a> and read some more posts!`
  );
});

app.post("/confirm-email/:id", (req, res) => {
  res.json({ success: "Confirmed email address for newsletter" });
});

app.post("/unsubscribe", (req, res) => {
  res.json({ success: "Unsubscribed user from newsletter" });
});

app.listen(process.env.PORT, () => {
  console.log(`Now listening on ${process.env.HOST}:${process.env.PORT}`);
});
