import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const password = req.headers["x-emergency-password"];

  if (!password) {
    return res.status(400).json({ error: "Password is required" });
  }

  if (password !== process.env.EMERGENCY_PASSWORD) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const emergencyInfo = {
    importantNumbers: {
      marc: process.env.MARCS_PHONE_NUMBER,
      mum: process.env.KATRINS_PHONE_NUMBER,
      dad: process.env.HOLGERS_PHONE_NUMBER,
    },
  };

  return res.status(200).json(emergencyInfo);
}
