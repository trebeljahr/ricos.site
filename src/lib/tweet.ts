import { TwitterApi } from "twitter-api-v2";
import { readFile, writeFile } from "fs/promises";
import path from "path";

type Quote = {
  content: string;
  author: string;
  picked: boolean;
  tags: string[];
};

const options = {
  appKey: process.env.TWITTER_APP_KEY,
  appSecret: process.env.TWITTER_APP_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET,
} as TwitterApiTokens;

console.log({ options });

interface TwitterApiTokens {
  appKey: string;
  appSecret: string;
  accessToken?: string;
  accessSecret?: string;
}

const twitter = new TwitterApi(options).readWrite;

const quotesFilePath = path.join(
  process.cwd(),
  "/src/content/pages/quotes.json"
);

export async function tweetRandomQuote() {
  const quotes: Quote[] = JSON.parse(await readFile(quotesFilePath, "utf-8"));

  const unpickedQuotes = quotes.filter((quote) => !quote.picked);
  if (unpickedQuotes.length === 0) {
    console.log("No more quotes to tweet!");
    return;
  }

  const randomIndex = Math.floor(Math.random() * unpickedQuotes.length);
  const quote = unpickedQuotes[randomIndex];

  try {
    const tweetContent = `"${quote.content}" \n- ${quote.author}`;
    await twitter.v1.tweet(tweetContent);

    console.log("Tweet sent:", tweetContent);

    const originalQuote = quotes.find(
      (q: Quote) => q.content === quote.content
    );

    if (!originalQuote) throw new Error("Quote not found");

    originalQuote.picked = true;

    await writeFile(quotesFilePath, JSON.stringify(quotes, null, 2));
  } catch (error) {
    console.error("Error sending tweet:", error);
  }
}
