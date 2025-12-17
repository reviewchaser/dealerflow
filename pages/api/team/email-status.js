/**
 * Email Status API
 *
 * GET - Returns the current email configuration status
 */

import { withDealerContext } from "@/libs/authContext";
import { getEmailStatus } from "@/libs/mailgun";

async function handler(req, res, ctx) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const status = getEmailStatus();

  return res.status(200).json(status);
}

export default withDealerContext(handler);
