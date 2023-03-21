import { TwitterApi } from "twitter-api-v2";
import { MongoClient } from "mongodb";

const options = {
  appKey: process.env.TWITTER_APP_KEY,
  appSecret: process.env.TWITTER_APP_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET,
} as TwitterApiTokens;

interface TwitterApiTokens {
  appKey: string;
  appSecret: string;
  accessToken?: string;
  accessSecret?: string;
}

const twitter = new TwitterApi(options).readWrite;

const MONGODB_URI = process.env.MONGODB_CONNECTION_STRING || "";
const client = new MongoClient(MONGODB_URI);

type Quote = {
  content: string;
  author: string;
  picked: boolean;
  tags: string[];
};

export async function tweetRandomQuote() {
  await client.connect();
  const quotesCollection = client.db("quotes").collection<Quote>("quotes");

  const unpickedQuotes = await quotesCollection
    .find({ picked: { $ne: true } })
    .toArray();

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

    await quotesCollection.updateOne(
      { _id: quote._id },
      { $set: { picked: true } }
    );
  } catch (error) {
    console.error("Error sending tweet:", error);
  } finally {
    await client.close();
  }
}
