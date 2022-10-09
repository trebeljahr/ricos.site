import { config } from "dotenv";
config();
import { TwitterApi } from "twitter-api-v2";

const twitter = new TwitterApi({
  appKey: process.env.TWITTER_APP_KEY,
  appSecret: process.env.TWITTER_APP_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET,
}).readWrite;

const media_ids = await twitter.v1.uploadMedia("./twitter-recursion.png");

await twitter.v1.tweet("This tweet is this tweet?", {
  media_ids,
});
