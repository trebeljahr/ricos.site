import { TwitterApi } from "twitter-api-v2";
import { MongoClient, WithId } from "mongodb";
import { baseUrl } from "./urlUtils";

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

  try {
    let tweetContent = "";
    let quote: WithId<Quote> | null = null;

    const filter = {
      picked: { $ne: true },
    };
    const totalCount = await quotesCollection.countDocuments(filter);
    const randomIndex = Math.floor(Math.random() * totalCount);

    do {
      const results = await quotesCollection
        .find(filter)
        .skip(randomIndex)
        .limit(1)
        .toArray();

      if (results.length === 0) {
        return console.log("No more quotes left!");
      }

      quote = results[0];
      await quotesCollection.updateOne(
        { _id: quote._id },
        { $set: { picked: true } }
      );

      tweetContent = `"${quote.content}" \n– ${quote.author} \n\n #quotes #dailyquote \n\n Quote Archive at ${baseUrl}/quotes`;
      console.log(tweetContent.length);
    } while (tweetContent.length > 280);

    console.log("Sending tweet with:", tweetContent);

    await twitter.v1.tweet(tweetContent);

    console.log("Tweet sent successfully!");
  } catch (error) {
    console.error("Error sending tweet:", error);
  } finally {
    await client.close();
  }
}
