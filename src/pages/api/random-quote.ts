import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const authHeader = req.headers.authorization || "";
  const [scheme, credentials] = authHeader.split(" ");

  if (scheme !== "Basic" || !credentials) {
    return res
      .status(401)
      .json({ message: "Missing or invalid authorization header" });
  }

  const authString = Buffer.from(credentials, "base64").toString("utf-8");
  const [providedUsername, providedPassword] = authString.split(":");

  if (
    !process.env.TWITTER_API_ENDPOINT_USERNAME ||
    !process.env.TWITTER_API_ENDPOINT_PASSWORD
  ) {
    return res.status(500).json({ message: "Missing environment variables" });
  }

  if (
    providedUsername !== process.env.TWITTER_API_ENDPOINT_USERNAME ||
    providedPassword !== process.env.TWITTER_API_ENDPOINT_PASSWORD
  ) {
    return res.status(401).json({ message: "Invalid username or password" });
  }

  res.status(200).json({ message: "Authenticated API call" });
}
