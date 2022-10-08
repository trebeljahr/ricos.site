import { TwitterApi } from "twitter-api-v2";

const twitterClient = new TwitterApi({
  appKey: process.env.TWITTER_APP_KEY,
  appSecret: process.env.TWITTER_APP_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET,
});

await twitterClient.readWrite.v1.tweet("this is a test");
