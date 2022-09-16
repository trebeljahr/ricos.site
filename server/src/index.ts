import { config } from "dotenv";
import express from "express";
import { Signup } from "./Signup.model.js";

import mongoose from "mongoose";
import { sendEmail } from "./mailgun.js";

const DEFAULT_MONGO_URL = "mongodb://localhost:27017/trebeljahr-newsletter";
const MONGO_URL = process.env.MONGO_URL || DEFAULT_MONGO_URL;
await mongoose.connect(MONGO_URL);

config();
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

app.post("/signup", async (req, res) => {
  try {
    const existingMail = await Signup.findOne({ email: req.body.email });
    if (existingMail) {
      if (existingMail.isConfirmed) {
        throw Error("Email is already signed up. Enjoy the newsletter!");
      }

      throw Error("Email is awaiting confirmation.");
    }

    const newSignup = new Signup({ email: req.body.email });
    await newSignup.save();

    const link = `${process.env.HOST}:${process.env.PORT}/confirm-email/${newSignup.confirmationId}`;
    const data = {
      from: "Rico Trebeljahr <rico@newsletter.trebeljahr.com>",
      to: newSignup.email,
      subject: "Confirm Signup to Trebeljahr's Newsletter",
      text: `Please follow this link 
      <a href="${link}">${link}</a> 
      to confirm your newsletter subscription.`,
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

app.get("/confirm-email/:id", (req, res) => {
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
